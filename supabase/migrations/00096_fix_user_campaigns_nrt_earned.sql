-- Fix process_tracking_report to accumulate nrt_earned properly
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
  v_campaign_category TEXT;
  
  v_gaming_account_id UUID;
  v_gaming_platform TEXT;
  v_gaming_username TEXT;
  v_gaming_verified BOOLEAN;
BEGIN
  -- 1. Deduplication check
  IF EXISTS (SELECT 1 FROM public.device_data_sessions WHERE session_id = p_session_id) THEN
    RETURN jsonb_build_object('status', 'duplicate', 'message', 'Session already processed');
  END IF;

  -- 2. Fetch Campaign details + category
  SELECT c.sp_id, c.isp_id, c.reward_rate_per_gb, c.title,
         (c.total_budget - c.budget_spent),
         COALESCE(
           (SELECT LOWER(s.category) FROM public.services s WHERE s.id = c.service_id),
           (SELECT LOWER(n.category) FROM public.networks n WHERE n.id = c.network_id),
           'other'
         )
  INTO v_campaign_sp_id, v_campaign_isp_id, v_campaign_reward_rate, v_campaign_title, v_budget_remaining, v_campaign_category
  FROM public.campaigns c
  WHERE c.id = p_campaign_id AND c.status = 'active';

  IF v_campaign_reward_rate IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign not found or inactive');
  END IF;

  -- Resolve SP and ISP user_ids
  IF v_campaign_sp_id IS NOT NULL THEN
    SELECT user_id INTO v_sp_user_id FROM public.sp_profiles WHERE id = v_campaign_sp_id;
  END IF;
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

  -- ISP auto-match
  IF v_isp_user_id IS NULL AND v_device_isp_name IS NOT NULL THEN
    SELECT ip.user_id INTO v_isp_user_id
    FROM public.networks n
    JOIN public.isp_profiles ip ON n.isp_id = ip.id
    WHERE LOWER(n.name) = LOWER(v_device_isp_name) AND n.verified = true
    LIMIT 1;
  END IF;

  -- 3b. Gaming account validation
  IF v_campaign_category = 'gaming' THEN
    SELECT ga.id, ga.platform, ga.platform_username, ga.verified
    INTO v_gaming_account_id, v_gaming_platform, v_gaming_username, v_gaming_verified
    FROM public.gaming_accounts ga
    WHERE ga.user_id = v_user_id
    LIMIT 1;

    IF v_gaming_username IS NULL THEN
      INSERT INTO public.device_data_sessions (
        device_id, campaign_id, session_id, bytes_up, bytes_down,
        duration_seconds, session_start, session_end, verified, nrt_awarded
      ) VALUES (
        p_device_id, p_campaign_id, p_session_id, p_bytes_up, p_bytes_down,
        p_duration_seconds, p_session_start, p_session_end, false, 0
      ) RETURNING id INTO v_session_record_id;

      UPDATE public.devices
      SET total_data_bytes = COALESCE(total_data_bytes, 0) + (p_bytes_up + p_bytes_down),
          total_duration_seconds = COALESCE(total_duration_seconds, 0) + p_duration_seconds,
          last_campaign_id = p_campaign_id,
          status = 'active',
          updated_at = now()
      WHERE id = p_device_id;

      RETURN jsonb_build_object(
        'status', 'pending_gaming_account',
        'session_record_id', v_session_record_id,
        'session_id', p_session_id,
        'message', 'Gaming campaign requires a linked gaming account.',
        'gaming_platform', NULL,
        'gaming_username', NULL
      );
    END IF;
  END IF;

  -- 4. Calculate Earnings
  v_total_bytes := p_bytes_up + p_bytes_down;
  v_total_gb := GREATEST(v_total_bytes::NUMERIC / 1000000000.0, 0);
  v_total_nrt_earned := v_total_gb * v_campaign_reward_rate * v_nhs_multiplier;

  -- Budget cap
  IF v_budget_remaining <= 0 THEN
    v_total_nrt_earned := 0;
  ELSIF v_total_nrt_earned > v_budget_remaining THEN
    v_total_nrt_earned := v_budget_remaining;
    UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;
  END IF;

  -- 5. Insert Session
  INSERT INTO public.device_data_sessions (
    device_id, campaign_id, session_id, bytes_up, bytes_down,
    duration_seconds, session_start, session_end, verified, nrt_awarded
  ) VALUES (
    p_device_id, p_campaign_id, p_session_id, p_bytes_up, p_bytes_down,
    p_duration_seconds, p_session_start, p_session_end, true, v_total_nrt_earned
  ) RETURNING id INTO v_session_record_id;

  -- 6. Update device aggregate stats
  UPDATE public.devices
  SET total_data_bytes = COALESCE(total_data_bytes, 0) + v_total_bytes,
      total_duration_seconds = COALESCE(total_duration_seconds, 0) + p_duration_seconds,
      nrt_earned = COALESCE(nrt_earned, 0) + v_total_nrt_earned,
      last_campaign_id = p_campaign_id,
      status = 'active',
      updated_at = now()
  WHERE id = p_device_id;

  -- 6b. Update gaming_accounts aggregate stats if applicable
  IF v_gaming_account_id IS NOT NULL THEN
    UPDATE public.gaming_accounts
    SET total_data_bytes = COALESCE(total_data_bytes, 0) + v_total_bytes,
        total_duration_seconds = COALESCE(total_duration_seconds, 0) + p_duration_seconds,
        nrt_earned = COALESCE(nrt_earned, 0) + v_total_nrt_earned,
        last_campaign_id = p_campaign_id,
        updated_at = now()
    WHERE id = v_gaming_account_id;
  END IF;

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

  -- 7. Calculate Splits
  v_user_share := ROUND(v_total_nrt_earned * 0.85, 9);
  v_sp_share   := ROUND(v_total_nrt_earned * 0.10, 9);
  v_isp_share  := ROUND(v_total_nrt_earned * 0.05, 9);

  -- 8. Update Campaign Spent
  UPDATE public.campaigns SET budget_spent = budget_spent + v_total_nrt_earned WHERE id = p_campaign_id;

  -- 9. Credit User wallet
  SELECT id INTO v_user_wallet_id FROM public.wallets WHERE user_id = v_user_id;
  IF v_user_wallet_id IS NOT NULL THEN
    UPDATE public.wallets SET unclaimed_nrt = unclaimed_nrt + v_user_share WHERE id = v_user_wallet_id;
  END IF;

  -- 10. Credit user_campaigns (accumulates SP and ISP cashbacks silently AND nrt_earned)
  UPDATE public.user_campaigns
  SET unclaimed_nrt = unclaimed_nrt + v_user_share,
      unclaimed_sp_nrt = COALESCE(unclaimed_sp_nrt, 0) + v_sp_share,
      unclaimed_isp_nrt = COALESCE(unclaimed_isp_nrt, 0) + v_isp_share,
      data_consumed_gb = data_consumed_gb + v_total_gb,
      nrt_earned = COALESCE(nrt_earned, 0) + v_user_share
  WHERE user_id = v_user_id AND campaign_id = p_campaign_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_campaigns (user_id, campaign_id, unclaimed_nrt, unclaimed_sp_nrt, unclaimed_isp_nrt, data_consumed_gb, nrt_earned)
    VALUES (v_user_id, p_campaign_id, v_user_share, v_sp_share, v_isp_share, v_total_gb, v_user_share)
    ON CONFLICT (user_id, campaign_id) DO UPDATE
    SET unclaimed_nrt = public.user_campaigns.unclaimed_nrt + EXCLUDED.unclaimed_nrt,
        unclaimed_sp_nrt = COALESCE(public.user_campaigns.unclaimed_sp_nrt, 0) + EXCLUDED.unclaimed_sp_nrt,
        unclaimed_isp_nrt = COALESCE(public.user_campaigns.unclaimed_isp_nrt, 0) + EXCLUDED.unclaimed_isp_nrt,
        data_consumed_gb = public.user_campaigns.data_consumed_gb + EXCLUDED.data_consumed_gb,
        nrt_earned = COALESCE(public.user_campaigns.nrt_earned, 0) + EXCLUDED.nrt_earned;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'session_record_id', v_session_record_id,
    'session_id', p_session_id,
    'data_gb', v_total_gb,
    'earned_nrt', v_total_nrt_earned,
    'splits', jsonb_build_object('user', v_user_share, 'sp', v_sp_share, 'isp', v_isp_share),
    'campaign_budget_remaining', (v_budget_remaining - v_total_nrt_earned),
    'gaming_platform', v_gaming_platform,
    'gaming_username', v_gaming_username
  );
END;
$$;
