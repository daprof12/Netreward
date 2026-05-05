-- Migration: Campaign Escrow and Refund
-- Created: 2026-05-01

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'escrow_lock';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'refund';

-- 1. Create Campaign with Escrow RPC
CREATE OR REPLACE FUNCTION create_campaign_with_escrow(
  p_creator_id UUID,
  p_sp_id UUID,
  p_isp_id UUID,
  p_service_id UUID,
  p_network_id UUID,
  p_title TEXT,
  p_reward_rate_per_gb NUMERIC,
  p_total_budget NUMERIC,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_is_recurring BOOLEAN,
  p_country TEXT,
  p_target_locations JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_campaign_id UUID;
BEGIN
  -- Validate at least one creator profile is provided
  IF p_sp_id IS NULL AND p_isp_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Must provide SP or ISP profile ID');
  END IF;

  -- 1. Check wallet balance
  SELECT id, nrt_balance INTO v_wallet_id, v_balance 
  FROM public.wallets 
  WHERE user_id = p_creator_id;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Wallet not found');
  END IF;

  IF v_balance < p_total_budget THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Insufficient NRT balance for campaign budget escrow');
  END IF;

  -- 2. Deduct from wallet (Escrow)
  UPDATE public.wallets 
  SET nrt_balance = nrt_balance - p_total_budget
  WHERE id = v_wallet_id;

  -- 3. Insert Campaign
  INSERT INTO public.campaigns (
    sp_id,
    isp_id,
    service_id,
    network_id,
    title,
    reward_rate_per_gb,
    total_budget,
    budget_spent,
    status,
    start_date,
    end_date,
    is_recurring,
    country,
    target_locations
  ) VALUES (
    p_sp_id,
    p_isp_id,
    p_service_id,
    p_network_id,
    p_title,
    p_reward_rate_per_gb,
    p_total_budget,
    0,
    'active',
    p_start_date,
    p_end_date,
    p_is_recurring,
    p_country,
    p_target_locations
  ) RETURNING id INTO v_campaign_id;

  -- 4. Record Transaction
  INSERT INTO public.transactions (
    wallet_id, amount, tx_type, description
  ) VALUES (
    v_wallet_id, p_total_budget, 'escrow_lock'::transaction_type, 'Escrow locked for campaign: ' || p_title
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Campaign created and budget escrowed',
    'campaign_id', v_campaign_id
  );
END;
$$;


-- 2. Cancel Campaign with Refund RPC
CREATE OR REPLACE FUNCTION cancel_campaign_with_refund(
  p_campaign_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign_record RECORD;
  v_is_owner BOOLEAN := false;
  v_refund_amount NUMERIC;
  v_wallet_id UUID;
BEGIN
  -- 1. Fetch Campaign and lock row
  SELECT * INTO v_campaign_record
  FROM public.campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign not found');
  END IF;

  IF v_campaign_record.status IN ('completed', 'canceled') THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign is already ' || v_campaign_record.status);
  END IF;

  -- 2. Verify Ownership
  IF v_campaign_record.sp_id IS NOT NULL THEN
    SELECT true INTO v_is_owner FROM public.sp_profiles WHERE id = v_campaign_record.sp_id AND user_id = p_user_id;
  ELSIF v_campaign_record.isp_id IS NOT NULL THEN
    SELECT true INTO v_is_owner FROM public.isp_profiles WHERE id = v_campaign_record.isp_id AND user_id = p_user_id;
  END IF;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Unauthorized. You do not own this campaign.');
  END IF;

  -- 3. Calculate Refund
  v_refund_amount := v_campaign_record.total_budget - v_campaign_record.budget_spent;
  IF v_refund_amount < 0 THEN v_refund_amount := 0; END IF;

  -- 4. Get User Wallet
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;

  -- 5. Execute Refund if > 0
  IF v_refund_amount > 0 THEN
    UPDATE public.wallets 
    SET nrt_balance = nrt_balance + v_refund_amount
    WHERE id = v_wallet_id;

    INSERT INTO public.transactions (
      wallet_id, amount, tx_type, description
    ) VALUES (
      v_wallet_id, v_refund_amount, 'refund'::transaction_type, 'Refund for canceled campaign: ' || v_campaign_record.title
    );
  END IF;

  -- 6. Update Campaign Status
  UPDATE public.campaigns SET status = 'canceled' WHERE id = p_campaign_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Campaign canceled and ' || v_refund_amount::TEXT || ' NRT refunded.',
    'refunded_amount', v_refund_amount
  );
END;
$$;
