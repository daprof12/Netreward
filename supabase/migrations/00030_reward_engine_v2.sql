-- Migration: Reward Engine V2 — Fix ISP Lookup + Wallet Column + Transaction Ledger
-- Created: 2026-05-01
-- Fixes:
--   1. isp_networks → networks (correct table name)
--   2. wallets.unclaimed_nrt → user_campaigns.unclaimed_nrt (match claim_all_rewards)
--   3. Add unclaimed_nrt column to wallets for direct tracking fallback
--   4. Add transaction ledger entries for SP/ISP reward splits
--   5. Add batch processing function for SDK reports

-- =============================================
-- 1. Add unclaimed_nrt to wallets (for process_tracking_report)
-- =============================================
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS unclaimed_nrt NUMERIC(18, 9) DEFAULT 0.000000000;

-- =============================================
-- 2. Improved process_tracking_report RPC (V2)
-- =============================================
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

  -- 2. Fetch Campaign details (with SP profile → user_id mapping)
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

  -- Resolve ISP user_id from isp_profiles (via campaign's isp_id)
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

  -- If ISP not set by campaign, try matching device ISP name to registered networks
  IF v_isp_user_id IS NULL AND v_device_isp_name IS NOT NULL THEN
    SELECT ip.user_id INTO v_isp_user_id
    FROM public.networks n
    JOIN public.isp_profiles ip ON n.isp_id = ip.id
    WHERE LOWER(n.name) = LOWER(v_device_isp_name) AND n.verified = true
    LIMIT 1;
  END IF;

  -- 4. Calculate Earnings
  v_total_bytes := p_bytes_up + p_bytes_down;
  v_total_gb := v_total_bytes::NUMERIC / 1000000000.0;
  
  IF v_total_gb < 0.0001 THEN
    v_total_gb := 0;
  END IF;

  -- Future: fetch NHS score from admin config / nhs_history
  -- v_nhs_multiplier := 1 + tanh((nhs_score - 50) / 20) * 0.5;

  v_total_nrt_earned := v_total_gb * v_campaign_reward_rate * v_nhs_multiplier;

  -- Budget cap — prevent overspend
  IF v_budget_remaining <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Campaign budget exhausted');
  END IF;

  IF v_total_nrt_earned > v_budget_remaining THEN
    v_total_nrt_earned := v_budget_remaining;
    -- Auto-complete the campaign when budget is consumed
    UPDATE public.campaigns SET status = 'completed' WHERE id = p_campaign_id;
  END IF;

  -- Skip zero-reward sessions
  IF v_total_nrt_earned <= 0 THEN
    RETURN jsonb_build_object('status', 'skipped', 'message', 'Data volume too small for reward');
  END IF;

  -- 5. Calculate Splits (85% User, 10% SP, 5% ISP)
  v_user_share := ROUND(v_total_nrt_earned * 0.85, 9);
  v_sp_share := ROUND(v_total_nrt_earned * 0.10, 9);
  v_isp_share := ROUND(v_total_nrt_earned * 0.05, 9);

  -- 6. Insert Session Record
  INSERT INTO public.device_data_sessions (
    device_id, campaign_id, session_id, bytes_up, bytes_down,
    duration_seconds, session_start, session_end, verified, nrt_awarded
  ) VALUES (
    p_device_id, p_campaign_id, p_session_id, p_bytes_up, p_bytes_down,
    p_duration_seconds, p_session_start, p_session_end, true, v_total_nrt_earned
  ) RETURNING id INTO v_session_record_id;

  -- 7. Update Campaign Spent
  UPDATE public.campaigns 
  SET budget_spent = budget_spent + v_total_nrt_earned 
  WHERE id = p_campaign_id;

  -- 8. Credit User (unclaimed_nrt in wallets)
  SELECT id INTO v_user_wallet_id FROM public.wallets WHERE user_id = v_user_id;
  IF v_user_wallet_id IS NOT NULL THEN
    UPDATE public.wallets 
    SET unclaimed_nrt = unclaimed_nrt + v_user_share 
    WHERE id = v_user_wallet_id;
  END IF;

  -- Also credit unclaimed_nrt in user_campaigns (for claim_all_rewards compatibility)
  UPDATE public.user_campaigns 
  SET unclaimed_nrt = unclaimed_nrt + v_user_share,
      data_consumed_gb = data_consumed_gb + v_total_gb
  WHERE user_id = v_user_id AND campaign_id = p_campaign_id;

  -- If user_campaigns row doesn't exist for this campaign, insert it
  IF NOT FOUND THEN
    INSERT INTO public.user_campaigns (user_id, campaign_id, unclaimed_nrt, data_consumed_gb)
    VALUES (v_user_id, p_campaign_id, v_user_share, v_total_gb)
    ON CONFLICT (user_id, campaign_id) DO UPDATE
    SET unclaimed_nrt = public.user_campaigns.unclaimed_nrt + EXCLUDED.unclaimed_nrt,
        data_consumed_gb = public.user_campaigns.data_consumed_gb + EXCLUDED.data_consumed_gb;
  END IF;

  -- 9. Credit SP Wallet (10% cashback)
  IF v_sp_user_id IS NOT NULL THEN
    SELECT id INTO v_sp_wallet_id FROM public.wallets WHERE user_id = v_sp_user_id;
    IF v_sp_wallet_id IS NOT NULL THEN
      UPDATE public.wallets 
      SET nrt_balance = nrt_balance + v_sp_share 
      WHERE id = v_sp_wallet_id;

      -- Record SP cashback transaction
      INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
      VALUES (v_sp_wallet_id, v_sp_share, 'reward', 
              'SP 10% cashback from campaign: ' || v_campaign_title);
    END IF;
  END IF;

  -- 10. Credit ISP Wallet (5% cashback)
  IF v_isp_user_id IS NOT NULL THEN
    SELECT id INTO v_isp_wallet_id FROM public.wallets WHERE user_id = v_isp_user_id;
    IF v_isp_wallet_id IS NOT NULL THEN
      UPDATE public.wallets 
      SET nrt_balance = nrt_balance + v_isp_share 
      WHERE id = v_isp_wallet_id;

      -- Record ISP cashback transaction
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


-- =============================================
-- 3. Update claim_all_rewards to also drain wallets.unclaimed_nrt
-- =============================================
CREATE OR REPLACE FUNCTION public.claim_all_rewards(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_campaign_unclaimed NUMERIC(18,9);
    v_wallet_unclaimed NUMERIC(18,9);
    v_total_unclaimed NUMERIC(18,9);
    v_tax_rate NUMERIC(5,2);
    v_tax_label TEXT;
    v_country_code TEXT;
    v_tax_amount NUMERIC(18,9);
    v_net_amount NUMERIC(18,9);
    v_wallet_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Sum from user_campaigns
    SELECT COALESCE(SUM(unclaimed_nrt), 0)
    INTO v_campaign_unclaimed
    FROM public.user_campaigns
    WHERE user_id = p_user_id;

    -- Sum from wallets (populated by process_tracking_report v2)
    SELECT id, COALESCE(unclaimed_nrt, 0) 
    INTO v_wallet_id, v_wallet_unclaimed
    FROM public.wallets WHERE user_id = p_user_id;

    v_total_unclaimed := v_campaign_unclaimed + v_wallet_unclaimed;

    IF v_total_unclaimed <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No rewards to claim');
    END IF;

    -- Get user country and tax rate
    SELECT country INTO v_country_code FROM public.users WHERE id = p_user_id;

    SELECT tax_percentage, tax_label
    INTO v_tax_rate, v_tax_label
    FROM public.country_tax_rates
    WHERE country_code = UPPER(v_country_code) AND is_active = true;

    v_tax_rate := COALESCE(v_tax_rate, 0);
    v_tax_label := COALESCE(v_tax_label, 'Tax');

    -- Calculate tax
    v_tax_amount := (v_total_unclaimed * v_tax_rate) / 100;
    v_net_amount := v_total_unclaimed - v_tax_amount;

    -- Credit wallet balance
    UPDATE public.wallets
    SET nrt_balance = nrt_balance + v_net_amount,
        unclaimed_nrt = 0,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- Create transaction record
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_wallet_id, v_net_amount, 'reward',
            format('Reward collection (Gross: %s, Tax: %s %s)', v_total_unclaimed, v_tax_amount, v_tax_label))
    RETURNING id INTO v_transaction_id;

    -- Record tax deduction
    IF v_tax_amount > 0 THEN
      INSERT INTO public.tax_deductions (
          user_id, transaction_id, gross_amount, tax_amount, net_amount,
          tax_rate_applied, country_code, tax_label
      ) VALUES (
          p_user_id, v_transaction_id, v_total_unclaimed, v_tax_amount, v_net_amount,
          v_tax_rate, v_country_code, v_tax_label
      );
    END IF;

    -- Reset unclaimed rewards in user_campaigns
    UPDATE public.user_campaigns SET unclaimed_nrt = 0 WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'gross_amount', v_total_unclaimed,
        'tax_amount', v_tax_amount,
        'net_amount', v_net_amount,
        'tax_label', v_tax_label,
        'tax_rate', v_tax_rate
    );
END;
$$;


-- =============================================
-- 4. Dashboard Stats RPCs — replace hardcoded stats
-- =============================================

-- User Dashboard Stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_balance NUMERIC;
  v_unclaimed_nrt NUMERIC;
  v_total_earned NUMERIC;
  v_total_data_gb NUMERIC;
  v_active_campaigns INTEGER;
  v_device_count INTEGER;
BEGIN
  -- Wallet
  SELECT COALESCE(nrt_balance, 0), COALESCE(unclaimed_nrt, 0)
  INTO v_wallet_balance, v_unclaimed_nrt
  FROM public.wallets WHERE user_id = p_user_id;

  -- Total NRT earned from all sessions
  SELECT COALESCE(SUM(s.nrt_awarded), 0), COALESCE(SUM(s.bytes_up + s.bytes_down)::NUMERIC / 1e9, 0)
  INTO v_total_earned, v_total_data_gb
  FROM public.device_data_sessions s
  JOIN public.devices d ON s.device_id = d.id
  WHERE d.user_id = p_user_id;

  -- Active campaigns
  SELECT COUNT(*) INTO v_active_campaigns
  FROM public.user_campaigns WHERE user_id = p_user_id;

  -- Device count
  SELECT COUNT(*) INTO v_device_count
  FROM public.devices WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'nrt_balance', COALESCE(v_wallet_balance, 0),
    'unclaimed_nrt', COALESCE(v_unclaimed_nrt, 0),
    'total_earned', COALESCE(v_total_earned, 0),
    'total_data_gb', COALESCE(v_total_data_gb, 0),
    'active_campaigns', COALESCE(v_active_campaigns, 0),
    'device_count', COALESCE(v_device_count, 0)
  );
END;
$$;

-- SP Dashboard Stats
CREATE OR REPLACE FUNCTION get_sp_dashboard_stats(p_sp_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sp_user_id UUID;
  v_nrt_distributed NUMERIC;
  v_active_campaigns INTEGER;
  v_users_reached INTEGER;
  v_revenue NUMERIC;
BEGIN
  SELECT user_id INTO v_sp_user_id FROM public.sp_profiles WHERE id = p_sp_profile_id;

  -- NRT distributed across SP's campaigns
  SELECT COALESCE(SUM(s.nrt_awarded), 0)
  INTO v_nrt_distributed
  FROM public.device_data_sessions s
  JOIN public.campaigns c ON s.campaign_id = c.id
  WHERE c.sp_id = p_sp_profile_id;

  -- Active campaigns
  SELECT COUNT(*) INTO v_active_campaigns
  FROM public.campaigns WHERE sp_id = p_sp_profile_id AND status = 'active';

  -- Distinct users reached
  SELECT COUNT(DISTINCT d.user_id)
  INTO v_users_reached
  FROM public.device_data_sessions s
  JOIN public.devices d ON s.device_id = d.id
  JOIN public.campaigns c ON s.campaign_id = c.id
  WHERE c.sp_id = p_sp_profile_id;

  -- Revenue (10% SP share)
  v_revenue := v_nrt_distributed * 0.10;

  RETURN jsonb_build_object(
    'nrt_distributed', COALESCE(v_nrt_distributed, 0),
    'active_campaigns', COALESCE(v_active_campaigns, 0),
    'users_reached', COALESCE(v_users_reached, 0),
    'revenue', COALESCE(v_revenue, 0)
  );
END;
$$;

-- ISP Dashboard Stats
CREATE OR REPLACE FUNCTION get_isp_dashboard_stats(p_isp_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_isp_user_id UUID;
  v_nrt_distributed NUMERIC;
  v_active_campaigns INTEGER;
  v_customers INTEGER;
  v_earnings NUMERIC;
  v_total_data_gb NUMERIC;
BEGIN
  SELECT user_id INTO v_isp_user_id FROM public.isp_profiles WHERE id = p_isp_profile_id;

  -- NRT distributed across ISP's campaigns
  SELECT COALESCE(SUM(s.nrt_awarded), 0), COALESCE(SUM(s.bytes_up + s.bytes_down)::NUMERIC / 1e9, 0)
  INTO v_nrt_distributed, v_total_data_gb
  FROM public.device_data_sessions s
  JOIN public.campaigns c ON s.campaign_id = c.id
  JOIN public.devices d ON s.device_id = d.id
  WHERE c.isp_id = p_isp_profile_id
     OR d.isp_name IN (SELECT n.name FROM public.networks n WHERE n.isp_id = p_isp_profile_id AND n.verified = true);

  -- Active campaigns
  SELECT COUNT(*) INTO v_active_campaigns
  FROM public.campaigns WHERE isp_id = p_isp_profile_id AND status = 'active';

  -- Distinct users on ISP network
  SELECT COUNT(DISTINCT d.user_id)
  INTO v_customers
  FROM public.device_data_sessions s
  JOIN public.devices d ON s.device_id = d.id
  JOIN public.campaigns c ON s.campaign_id = c.id
  WHERE c.isp_id = p_isp_profile_id
     OR d.isp_name IN (SELECT n.name FROM public.networks n WHERE n.isp_id = p_isp_profile_id AND n.verified = true);

  -- Earnings (5% ISP share)
  v_earnings := v_nrt_distributed * 0.05;

  RETURN jsonb_build_object(
    'nrt_distributed', COALESCE(v_nrt_distributed, 0),
    'active_campaigns', COALESCE(v_active_campaigns, 0),
    'customers', COALESCE(v_customers, 0),
    'earnings', COALESCE(v_earnings, 0),
    'total_data_gb', COALESCE(v_total_data_gb, 0)
  );
END;
$$;
