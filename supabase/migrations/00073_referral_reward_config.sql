-- Migration: Referral Reward Config
-- Adds admin-configurable referral bonus to kv_settings and
-- creates process_referral_reward() RPC that reads the live bonus amount.
-- Created: 2026-05-13

-- ============================================================
-- 1. Seed referral_config into kv_settings
-- ============================================================
INSERT INTO public.kv_settings (key, value, category)
VALUES (
  'referral_config',
  '{
    "bonusNrt": 5,
    "condition": "first_reward",
    "minRewardsToUnlock": 1,
    "cooldownDays": 0,
    "maxReferralsPerUser": 0
  }',
  'rewards'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. process_referral_reward(p_referred_id UUID)
--    Called when a referred user qualifies (first reward earned).
--    Reads bonusNrt from kv_settings so admin changes take effect instantly.
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referred_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id        UUID;
  v_referral_id        UUID;
  v_referral_status    TEXT;
  v_bonus_nrt          NUMERIC(18,6);
  v_condition          TEXT;
  v_max_refs           INT;
  v_cooldown_days      INT;
  v_referrer_wallet_id UUID;
  v_existing_count     INT;
  v_last_payout        TIMESTAMPTZ;
  v_config             JSONB;
BEGIN
  -- 1. Load referral config from kv_settings
  SELECT value INTO v_config
  FROM public.kv_settings
  WHERE key = 'referral_config';

  v_bonus_nrt     := COALESCE((v_config->>'bonusNrt')::NUMERIC, 5);
  v_condition     := COALESCE(v_config->>'condition', 'first_reward');
  v_max_refs      := COALESCE((v_config->>'maxReferralsPerUser')::INT, 0);
  v_cooldown_days := COALESCE((v_config->>'cooldownDays')::INT, 0);

  -- 2. Find referrer via users.referred_by
  SELECT referred_by INTO v_referrer_id
  FROM public.users
  WHERE id = p_referred_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_referrer');
  END IF;

  -- 3. Find or create the referrals row
  SELECT id, status INTO v_referral_id, v_referral_status
  FROM public.referrals
  WHERE referrer_id = v_referrer_id AND referred_id = p_referred_id;

  -- Already processed — idempotent guard
  IF v_referral_status = 'active' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_processed');
  END IF;

  -- 4. Max referrals cap (0 = unlimited)
  IF v_max_refs > 0 THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM public.referrals
    WHERE referrer_id = v_referrer_id AND status = 'active';

    IF v_existing_count >= v_max_refs THEN
      RETURN jsonb_build_object('success', false, 'reason', 'max_referrals_reached');
    END IF;
  END IF;

  -- 5. Cooldown check (0 = no cooldown)
  IF v_cooldown_days > 0 THEN
    SELECT MAX(created_at) INTO v_last_payout
    FROM public.referrals
    WHERE referrer_id = v_referrer_id AND status = 'active';

    IF v_last_payout IS NOT NULL AND
       v_last_payout > (now() - (v_cooldown_days || ' days')::INTERVAL) THEN
      RETURN jsonb_build_object('success', false, 'reason', 'cooldown_active');
    END IF;
  END IF;

  -- 6. Upsert referrals row with live bonus amount
  IF v_referral_id IS NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_nrt, status)
    VALUES (v_referrer_id, p_referred_id, v_bonus_nrt, 'active')
    RETURNING id INTO v_referral_id;
  ELSE
    UPDATE public.referrals
    SET reward_nrt = v_bonus_nrt, status = 'active'
    WHERE id = v_referral_id;
  END IF;

  -- 7. Credit referrer's wallet
  SELECT id INTO v_referrer_wallet_id
  FROM public.wallets
  WHERE user_id = v_referrer_id;

  IF v_referrer_wallet_id IS NOT NULL THEN
    UPDATE public.wallets
    SET nrt_balance = nrt_balance + v_bonus_nrt,
        updated_at  = now()
    WHERE id = v_referrer_wallet_id;
  END IF;

  -- 8. Insert audit transaction record
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    metadata,
    created_at
  ) VALUES (
    v_referrer_id,
    'referral_bonus',
    v_bonus_nrt,
    'NRT',
    'completed',
    'Referral bonus — new user joined and earned first reward',
    jsonb_build_object(
      'referred_user_id', p_referred_id,
      'referral_id',      v_referral_id,
      'condition',        v_condition
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success',     true,
    'referrer_id', v_referrer_id,
    'bonus_nrt',   v_bonus_nrt,
    'referral_id', v_referral_id
  );
END;
$$;

-- Grant execute to authenticated users (the function is SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.process_referral_reward(UUID) TO authenticated;

-- ============================================================
-- 3. RLS: allow authenticated users to read referral_config
--    (already covered by the broad kv_settings SELECT policy,
--     but we add a specific named policy for clarity)
-- ============================================================
-- No additional policy needed — existing "Anyone authenticated can read kv_settings"
-- policy covers SELECT on all rows including referral_config.

COMMENT ON FUNCTION public.process_referral_reward IS
  'Credits the referrer with the admin-configured NRT bonus when a referred user '
  'qualifies. Reads bonusNrt live from kv_settings so admin changes apply instantly.';
