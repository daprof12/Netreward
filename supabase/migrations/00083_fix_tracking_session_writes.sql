-- =============================================================
-- 00083: Fix process_tracking_report to always record sessions
-- =============================================================
-- 
-- Previously the RPC would skip recording device_data_sessions rows
-- when v_total_nrt_earned <= 0 (i.e., data < 0.0001 GB threshold).
-- This meant short telemetry heartbeats never appeared in the DB,
-- blocking the liveness pulsing indicator and admin tracking views.
--
-- Fix: Always insert into device_data_sessions to record the activity.
-- Only skip the WALLET CREDIT step if the earned NRT is zero.
-- This allows the pulsing indicator to work with real but small sessions.

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
  v_sp_user_id UUID;
  v_isp_user_id UUID;
  v_campaign_reward_rate NUMERIC;
  v_budget_remaining NUMERIC;
  v_campaign_title TEXT;
  v_total_bytes BIGINT;
  v_total_gb NUMERIC;
  v_nhs_multiplier NUMERIC := 1.0;
  v_total_nrt_earned NUMERIC;

  v_user_share NUMERIC;
  v_sp_share NUMERIC;
  v_isp_share NUMERIC;

  v_session_record_id UUID;
  v_user_wallet_id UUID;
  v_sp_wallet_id UUID;
  v_isp_wallet_id UUID;
  v_device_isp_name TEXT;
  v_campaign_sp_id UUID;
  v_campaign_isp_id UUID;
BEGIN
  -- 1. Deduplication check
  IF EXISTS (SELECT 1 FROM public.device_data_sessions WHERE session_id = p_session_id) THEN
    RETURN jsonb_build_object('status', 'duplicate', 'message', 'Session already processed');
  END IF;

  -- 2. Fetch Campaign details
  SELECT c.sp_id, c.isp_id, c.reward_rate_per_gb, c.title,
         (c.total_budget - c.budget_spent)
  INTO v_campaign_sp_id, v_campaign_isp_id, v_campaign_reward_rate, v_campaign_title, v_budget_remaining
  FROM public.campaigns c
  WHERE c.id = p_campaign_id AND c.status = 'active';

  IF v_campaign_reward_rate IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign not found or inactive');
  END IF;

  -- Resolve SP user_id from sp_profiles
  IF v_campaign_sp_id IS NOT NULL THEN
    SELECT user_id INTO v_sp_user_id FROM public.sp_profiles WHERE id = v_campaign_sp_id;
  END IF;

  -- Resolve ISP user_id from isp_profiles
  IF v_campaign_isp_id IS NOT NULL THEN
    SELECT user_id INTO v_isp_user_id FROM public.isp_profiles WHERE id = v_campaign_isp_id;
  END IF;

  -- 3. Fetch Device details
  SELECT user_id, isp_name INTO v_user_id, v_device_isp_name
  FROM public.devices
  WHERE id = p_device_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Device not found');
  END IF;

  -- ISP auto-match via device ISP name
  IF v_isp_user_id IS NULL AND v_device_isp_name IS NOT NULL THEN
    SELECT ip.user_id INTO v_isp_user_id
    FROM public.networks n
    JOIN public.isp_profiles ip ON n.isp_id = ip.id
    WHERE LOWER(n.name) = LOWER(v_device_isp_name) AND n.verified = true
    LIMIT 1;
  END IF;

  -- 4. Calculate Earnings
  v_total_bytes := p_bytes_up + p_bytes_down;
  -- Use a LOWER minimum of 0.000001 GB (1 KB) so small sessions still count
  v_total_gb := GREATEST(v_total_bytes::NUMERIC / 1000000000.0, 0);

  v_total_nrt_earned := v_total_gb * v_campaign_reward_rate * v_nhs_multiplier;

  -- Budget cap
  IF v_budget_remaining <= 0 THEN
    -- Still record the session, just award 0
    v_total_nrt_earned := 0;
  ELSIF v_total_nrt_earned > v_budget_remaining THEN
    v_total_nrt_earned := v_budget_remaining;
    UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;
  END IF;

  -- 5. ALWAYS insert session record (even zero-reward sessions are real activity)
  INSERT INTO public.device_data_sessions (
    device_id, campaign_id, session_id, bytes_up, bytes_down,
    duration_seconds, session_start, session_end, verified, nrt_awarded
  ) VALUES (
    p_device_id, p_campaign_id, p_session_id, p_bytes_up, p_bytes_down,
    p_duration_seconds, p_session_start, p_session_end, true, v_total_nrt_earned
  ) RETURNING id INTO v_session_record_id;

  -- 6. Update device aggregate stats
  UPDATE public.devices
  SET
    total_data_bytes = COALESCE(total_data_bytes, 0) + v_total_bytes,
    total_duration_seconds = COALESCE(total_duration_seconds, 0) + p_duration_seconds,
    nrt_earned = COALESCE(nrt_earned, 0) + v_total_nrt_earned,
    last_campaign_id = p_campaign_id,
    status = 'active',
    updated_at = now()
  WHERE id = p_device_id;

  -- Skip wallet credits for zero-reward sessions (but session is recorded)
  IF v_total_nrt_earned <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'recorded',
      'session_record_id', v_session_record_id,
      'session_id', p_session_id,
      'data_gb', v_total_gb,
      'earned_nrt', 0,
      'message', 'Session recorded. Data volume below minimum reward threshold.'
    );
  END IF;

  -- 7. Calculate Splits (85% User, 10% SP, 5% ISP)
  v_user_share := ROUND(v_total_nrt_earned * 0.85, 9);
  v_sp_share   := ROUND(v_total_nrt_earned * 0.10, 9);
  v_isp_share  := ROUND(v_total_nrt_earned * 0.05, 9);

  -- 8. Update Campaign Spent
  UPDATE public.campaigns
  SET budget_spent = budget_spent + v_total_nrt_earned
  WHERE id = p_campaign_id;

  -- 9. Credit User wallet (unclaimed_nrt)
  SELECT id INTO v_user_wallet_id FROM public.wallets WHERE user_id = v_user_id;
  IF v_user_wallet_id IS NOT NULL THEN
    UPDATE public.wallets
    SET unclaimed_nrt = unclaimed_nrt + v_user_share
    WHERE id = v_user_wallet_id;
  END IF;

  -- 10. Credit user_campaigns (claim_all_rewards compatibility)
  UPDATE public.user_campaigns
  SET unclaimed_nrt = unclaimed_nrt + v_user_share,
      data_consumed_gb = data_consumed_gb + v_total_gb
  WHERE user_id = v_user_id AND campaign_id = p_campaign_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_campaigns (user_id, campaign_id, unclaimed_nrt, data_consumed_gb)
    VALUES (v_user_id, p_campaign_id, v_user_share, v_total_gb)
    ON CONFLICT (user_id, campaign_id) DO UPDATE
    SET unclaimed_nrt = public.user_campaigns.unclaimed_nrt + EXCLUDED.unclaimed_nrt,
        data_consumed_gb = public.user_campaigns.data_consumed_gb + EXCLUDED.data_consumed_gb;
  END IF;

  -- 11. Credit SP Wallet (10% cashback)
  IF v_sp_user_id IS NOT NULL THEN
    SELECT id INTO v_sp_wallet_id FROM public.wallets WHERE user_id = v_sp_user_id;
    IF v_sp_wallet_id IS NOT NULL THEN
      UPDATE public.wallets
      SET nrt_balance = nrt_balance + v_sp_share
      WHERE id = v_sp_wallet_id;

      INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
      VALUES (v_sp_wallet_id, v_sp_share, 'reward',
              'SP 10% cashback from campaign: ' || v_campaign_title);
    END IF;
  END IF;

  -- 12. Credit ISP Wallet (5% cashback)
  IF v_isp_user_id IS NOT NULL THEN
    SELECT id INTO v_isp_wallet_id FROM public.wallets WHERE user_id = v_isp_user_id;
    IF v_isp_wallet_id IS NOT NULL THEN
      UPDATE public.wallets
      SET nrt_balance = nrt_balance + v_isp_share
      WHERE id = v_isp_wallet_id;

      INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
      VALUES (v_isp_wallet_id, v_isp_share, 'reward',
              'ISP 5% cashback from campaign: ' || v_campaign_title);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'session_record_id', v_session_record_id,
    'session_id', p_session_id,
    'data_gb', v_total_gb,
    'earned_nrt', v_total_nrt_earned,
    'splits', jsonb_build_object(
      'user', v_user_share,
      'sp', v_sp_share,
      'isp', v_isp_share
    ),
    'campaign_budget_remaining', (v_budget_remaining - v_total_nrt_earned)
  );
END;
$$;
