-- Migration: Reward Engine RPC
-- Created: 2026-05-01

-- This RPC processes a tracking payload, calculates the reward, and splits the NRT.
CREATE OR REPLACE FUNCTION process_tracking_report(
  p_device_id UUID,
  p_campaign_id UUID,
  p_session_id TEXT,
  p_bytes_up BIGINT,
  p_bytes_down BIGINT,
  p_duration_seconds INTEGER,
  p_session_start TIMESTAMPTZ,
  p_session_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_sp_id UUID;
  v_isp_id UUID;
  v_campaign_reward_rate NUMERIC;
  v_budget_remaining NUMERIC;
  v_total_bytes BIGINT;
  v_total_gb NUMERIC;
  v_nhs_multiplier NUMERIC := 1.0; -- To be fetched from admin config in future iteration
  v_total_nrt_earned NUMERIC;
  
  v_user_share NUMERIC;
  v_sp_share NUMERIC;
  v_isp_share NUMERIC;
  
  v_session_record_id UUID;
BEGIN
  -- 1. Deduplication check
  IF EXISTS (SELECT 1 FROM public.device_data_sessions WHERE session_id = p_session_id) THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Session already processed');
  END IF;

  -- 2. Fetch Campaign details
  SELECT sp_id, reward_rate_per_gb, (total_budget - budget_spent) INTO v_sp_id, v_campaign_reward_rate, v_budget_remaining
  FROM public.campaigns
  WHERE id = p_campaign_id AND status = 'active';

  IF v_sp_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign not found or inactive');
  END IF;

  -- 3. Fetch Device details
  SELECT user_id, 
         (SELECT isp_id FROM public.isp_networks n WHERE n.name = d.isp_name LIMIT 1) -- Basic location matching stub
  INTO v_user_id, v_isp_id
  FROM public.devices d
  WHERE d.id = p_device_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Device not found');
  END IF;

  -- 4. Calculate Earnings
  v_total_bytes := p_bytes_up + p_bytes_down;
  v_total_gb := v_total_bytes::NUMERIC / 1000000000.0;
  
  -- Prevent dividing by zero or tiny fractions without reward
  IF v_total_gb < 0.0001 THEN
      v_total_gb := 0;
  END IF;

  v_total_nrt_earned := v_total_gb * v_campaign_reward_rate * v_nhs_multiplier;

  -- Prevent exceeding budget
  IF v_total_nrt_earned >= v_budget_remaining THEN
    v_total_nrt_earned := v_budget_remaining;
    -- Auto-complete the campaign
    UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;
  END IF;

  -- 5. Calculate Splits (85% User, 10% SP, 5% ISP)
  v_user_share := v_total_nrt_earned * 0.85;
  v_sp_share := v_total_nrt_earned * 0.10;
  v_isp_share := v_total_nrt_earned * 0.05;

  -- 6. Insert Session Record
  INSERT INTO public.device_data_sessions (
    device_id, campaign_id, session_id, bytes_up, bytes_down, duration_seconds, session_start, session_end, verified, nrt_awarded
  ) VALUES (
    p_device_id, p_campaign_id, p_session_id, p_bytes_up, p_bytes_down, p_duration_seconds, p_session_start, p_session_end, true, v_total_nrt_earned
  ) RETURNING id INTO v_session_record_id;

  -- 7. Update Campaign Spent
  UPDATE public.campaigns SET budget_spent = budget_spent + v_total_nrt_earned WHERE id = p_campaign_id;

  -- 8. Update User Unclaimed NRT
  -- Note: Depending on schema, unclaimed_nrt might be in wallets or users table.
  -- As per previous claim_all_rewards RPC, we assume a wallet exists.
  UPDATE public.wallets SET unclaimed_nrt = unclaimed_nrt + v_user_share WHERE user_id = v_user_id;

  -- 9. Update SP Wallet (Cashback)
  UPDATE public.wallets SET nrt_balance = nrt_balance + v_sp_share WHERE user_id = v_sp_id;

  -- 10. Update ISP Wallet (Cashback)
  IF v_isp_id IS NOT NULL THEN
    UPDATE public.wallets SET nrt_balance = nrt_balance + v_isp_share WHERE user_id = v_isp_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'session_id', p_session_id,
    'earned_nrt', v_total_nrt_earned,
    'splits', jsonb_build_object('user', v_user_share, 'sp', v_sp_share, 'isp', v_isp_share)
  );
END;
$$;
