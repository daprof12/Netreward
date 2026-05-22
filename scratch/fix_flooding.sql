ALTER TABLE public.user_campaigns ADD COLUMN IF NOT EXISTS unclaimed_sp_nrt NUMERIC(18, 9) DEFAULT 0.000000000;
ALTER TABLE public.user_campaigns ADD COLUMN IF NOT EXISTS unclaimed_isp_nrt NUMERIC(18, 9) DEFAULT 0.000000000;

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

  -- 9. Credit unclaimed amounts in user_campaigns (accumulate for all parties until claim)
  UPDATE public.user_campaigns 
  SET unclaimed_nrt = unclaimed_nrt + v_user_share,
      unclaimed_sp_nrt = unclaimed_sp_nrt + v_sp_share,
      unclaimed_isp_nrt = unclaimed_isp_nrt + v_isp_share,
      data_consumed_gb = data_consumed_gb + v_total_gb
  WHERE user_id = v_user_id AND campaign_id = p_campaign_id;

  -- If user_campaigns row doesn't exist for this campaign, insert it
  IF NOT FOUND THEN
    INSERT INTO public.user_campaigns (user_id, campaign_id, unclaimed_nrt, unclaimed_sp_nrt, unclaimed_isp_nrt, data_consumed_gb)
    VALUES (v_user_id, p_campaign_id, v_user_share, v_sp_share, v_isp_share, v_total_gb)
    ON CONFLICT (user_id, campaign_id) DO UPDATE
    SET unclaimed_nrt = public.user_campaigns.unclaimed_nrt + EXCLUDED.unclaimed_nrt,
        unclaimed_sp_nrt = public.user_campaigns.unclaimed_sp_nrt + EXCLUDED.unclaimed_sp_nrt,
        unclaimed_isp_nrt = public.user_campaigns.unclaimed_isp_nrt + EXCLUDED.unclaimed_isp_nrt,
        data_consumed_gb = public.user_campaigns.data_consumed_gb + EXCLUDED.data_consumed_gb;
  END IF;

  -- Removed immediate SP and ISP wallet updates/transactions to prevent flooding

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
    
    v_campaign_row RECORD;
    v_campaign_sp_id UUID;
    v_campaign_isp_id UUID;
    v_sp_user_id UUID;
    v_isp_user_id UUID;
    v_sp_wallet_id UUID;
    v_isp_wallet_id UUID;
    v_campaign_title TEXT;
BEGIN
    -- Sum from user_campaigns
    SELECT COALESCE(SUM(unclaimed_nrt), 0)
    INTO v_campaign_unclaimed
    FROM public.user_campaigns
    WHERE user_id = p_user_id;

    -- Sum from wallets (populated by process_tracking_report v2 fallback)
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

    -- Create transaction record for User
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

    -- Process SP and ISP cashbacks for all campaigns being claimed
    FOR v_campaign_row IN 
        SELECT campaign_id, COALESCE(unclaimed_sp_nrt, 0) as sp_nrt, COALESCE(unclaimed_isp_nrt, 0) as isp_nrt 
        FROM public.user_campaigns 
        WHERE user_id = p_user_id AND (unclaimed_sp_nrt > 0 OR unclaimed_isp_nrt > 0)
    LOOP
        SELECT sp_id, isp_id, title INTO v_campaign_sp_id, v_campaign_isp_id, v_campaign_title
        FROM public.campaigns WHERE id = v_campaign_row.campaign_id;
        
        -- Credit SP
        IF v_campaign_row.sp_nrt > 0 AND v_campaign_sp_id IS NOT NULL THEN
            SELECT user_id INTO v_sp_user_id FROM public.sp_profiles WHERE id = v_campaign_sp_id;
            IF v_sp_user_id IS NOT NULL THEN
                SELECT id INTO v_sp_wallet_id FROM public.wallets WHERE user_id = v_sp_user_id;
                IF v_sp_wallet_id IS NOT NULL THEN
                    UPDATE public.wallets 
                    SET nrt_balance = nrt_balance + v_campaign_row.sp_nrt 
                    WHERE id = v_sp_wallet_id;

                    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
                    VALUES (v_sp_wallet_id, v_campaign_row.sp_nrt, 'reward', 
                            'SP 10% cashback from campaign: ' || v_campaign_title);
                END IF;
            END IF;
        END IF;

        -- Credit ISP
        IF v_campaign_row.isp_nrt > 0 AND v_campaign_isp_id IS NOT NULL THEN
            SELECT user_id INTO v_isp_user_id FROM public.isp_profiles WHERE id = v_campaign_isp_id;
            IF v_isp_user_id IS NOT NULL THEN
                SELECT id INTO v_isp_wallet_id FROM public.wallets WHERE user_id = v_isp_user_id;
                IF v_isp_wallet_id IS NOT NULL THEN
                    UPDATE public.wallets 
                    SET nrt_balance = nrt_balance + v_campaign_row.isp_nrt 
                    WHERE id = v_isp_wallet_id;

                    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
                    VALUES (v_isp_wallet_id, v_campaign_row.isp_nrt, 'reward', 
                            'ISP 5% cashback from campaign: ' || v_campaign_title);
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- Reset unclaimed rewards in user_campaigns
    UPDATE public.user_campaigns 
    SET unclaimed_nrt = 0, unclaimed_sp_nrt = 0, unclaimed_isp_nrt = 0 
    WHERE user_id = p_user_id;

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
