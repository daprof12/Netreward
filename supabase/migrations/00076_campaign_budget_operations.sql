-- Migration: Campaign Budget Operations (Adjust & Stop with Refund)
-- Description: Adds RPCs to handle budget adjustments and campaign stopping
--              with proper escrow/refund mechanics.

-- =============================================
-- 1. Adjust Campaign Budget RPC
-- =============================================
-- Handles both increases (additional escrow) and decreases (partial refund).
-- Enforces: new_budget >= budget_spent, and sufficient wallet balance for increases.

CREATE OR REPLACE FUNCTION public.adjust_campaign_budget(
  p_campaign_id UUID,
  p_user_id UUID,
  p_new_budget NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_is_owner BOOLEAN := false;
  v_wallet_id UUID;
  v_wallet_balance NUMERIC;
  v_budget_diff NUMERIC;
BEGIN
  -- 1. Fetch and lock campaign
  SELECT * INTO v_campaign
  FROM public.campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign not found');
  END IF;

  IF v_campaign.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Cannot adjust budget of a completed campaign');
  END IF;

  -- 2. Verify ownership
  IF v_campaign.sp_id IS NOT NULL THEN
    SELECT true INTO v_is_owner FROM public.sp_profiles WHERE id = v_campaign.sp_id AND user_id = p_user_id;
  END IF;
  IF NOT COALESCE(v_is_owner, false) AND v_campaign.isp_id IS NOT NULL THEN
    SELECT true INTO v_is_owner FROM public.isp_profiles WHERE id = v_campaign.isp_id AND user_id = p_user_id;
  END IF;

  IF NOT COALESCE(v_is_owner, false) THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Unauthorized. You do not own this campaign.');
  END IF;

  -- 3. Validate new budget >= budget_spent
  IF p_new_budget < v_campaign.budget_spent THEN
    RETURN jsonb_build_object('status', 'error', 'message',
      'New budget cannot be less than already spent amount (' || v_campaign.budget_spent || ' NRT)');
  END IF;

  IF p_new_budget <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Budget must be greater than zero');
  END IF;

  -- 4. Calculate difference
  v_budget_diff := p_new_budget - v_campaign.total_budget;

  -- No change
  IF v_budget_diff = 0 THEN
    RETURN jsonb_build_object('status', 'success', 'message', 'No budget change', 'adjustment', 0);
  END IF;

  -- 5. Get wallet
  SELECT id, nrt_balance INTO v_wallet_id, v_wallet_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Wallet not found');
  END IF;

  -- 6. Handle increase (additional escrow)
  IF v_budget_diff > 0 THEN
    IF v_wallet_balance < v_budget_diff THEN
      RETURN jsonb_build_object('status', 'error', 'message',
        'Insufficient NRT balance. Need ' || v_budget_diff || ' NRT, have ' || v_wallet_balance || ' NRT');
    END IF;

    -- Deduct from wallet
    UPDATE public.wallets
    SET nrt_balance = nrt_balance - v_budget_diff
    WHERE id = v_wallet_id;

    -- Record escrow transaction
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_wallet_id, v_budget_diff, 'escrow_lock'::transaction_type,
            'Additional escrow for campaign: ' || v_campaign.title);

  -- 7. Handle decrease (partial refund)
  ELSE
    -- v_budget_diff is negative, so negate it for the refund amount
    UPDATE public.wallets
    SET nrt_balance = nrt_balance + ABS(v_budget_diff)
    WHERE id = v_wallet_id;

    -- Record refund transaction
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_wallet_id, ABS(v_budget_diff), 'refund'::transaction_type,
            'Budget reduction refund for campaign: ' || v_campaign.title);
  END IF;

  -- 8. Update campaign budget
  UPDATE public.campaigns
  SET total_budget = p_new_budget,
      escrow_nrt = COALESCE(escrow_nrt, 0) + v_budget_diff
  WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', CASE WHEN v_budget_diff > 0
      THEN v_budget_diff || ' NRT additionally escrowed'
      ELSE ABS(v_budget_diff) || ' NRT refunded to wallet'
    END,
    'adjustment', v_budget_diff,
    'new_budget', p_new_budget
  );
END;
$$;


-- =============================================
-- 2. Stop Campaign with Refund RPC
-- =============================================
-- Sets status to 'completed' and refunds unspent budget.

CREATE OR REPLACE FUNCTION public.stop_campaign_with_refund(
  p_campaign_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_is_owner BOOLEAN := false;
  v_refund_amount NUMERIC;
  v_wallet_id UUID;
BEGIN
  -- 1. Fetch and lock campaign
  SELECT * INTO v_campaign
  FROM public.campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign not found');
  END IF;

  IF v_campaign.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign is already completed');
  END IF;

  -- 2. Verify ownership
  IF v_campaign.sp_id IS NOT NULL THEN
    SELECT true INTO v_is_owner FROM public.sp_profiles WHERE id = v_campaign.sp_id AND user_id = p_user_id;
  END IF;
  IF NOT COALESCE(v_is_owner, false) AND v_campaign.isp_id IS NOT NULL THEN
    SELECT true INTO v_is_owner FROM public.isp_profiles WHERE id = v_campaign.isp_id AND user_id = p_user_id;
  END IF;

  IF NOT COALESCE(v_is_owner, false) THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Unauthorized. You do not own this campaign.');
  END IF;

  -- 3. Calculate refund
  v_refund_amount := v_campaign.total_budget - v_campaign.budget_spent;
  IF v_refund_amount < 0 THEN v_refund_amount := 0; END IF;

  -- 4. Get wallet
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;

  -- 5. Execute refund
  IF v_refund_amount > 0 THEN
    UPDATE public.wallets
    SET nrt_balance = nrt_balance + v_refund_amount
    WHERE id = v_wallet_id;

    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_wallet_id, v_refund_amount, 'refund'::transaction_type,
            'Refund for stopped campaign: ' || v_campaign.title);
  END IF;

  -- 6. Update campaign status
  UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Campaign stopped. ' || v_refund_amount || ' NRT refunded.',
    'refunded_amount', v_refund_amount
  );
END;
$$;


-- =============================================
-- 3. Grant Permissions
-- =============================================
GRANT EXECUTE ON FUNCTION public.adjust_campaign_budget TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_campaign_budget TO service_role;
GRANT EXECUTE ON FUNCTION public.stop_campaign_with_refund TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_campaign_with_refund TO service_role;
