-- Migration: 00098_denormalize_admin_tables.sql
-- Description: Add denormalized columns to eliminate expensive multi-level JOINs
--              across admin dashboard pages. All changes are ADDITIVE only.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TRANSACTIONS — Add user_id, user_email, user_country, user_display_name
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_country TEXT,
  ADD COLUMN IF NOT EXISTS user_display_name TEXT;

-- Backfill existing rows
UPDATE public.transactions t
SET user_id = w.user_id,
    user_email = u.email,
    user_country = u.country,
    user_display_name = u.display_name
FROM public.wallets w
JOIN public.users u ON u.id = w.user_id
WHERE t.wallet_id = w.id
  AND t.user_email IS NULL;

-- Auto-populate trigger for future inserts
CREATE OR REPLACE FUNCTION public.trg_transactions_denormalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.wallet_id IS NOT NULL AND NEW.user_email IS NULL THEN
    SELECT w.user_id, u.email, u.country, u.display_name
    INTO NEW.user_id, NEW.user_email, NEW.user_country, NEW.user_display_name
    FROM public.wallets w
    JOIN public.users u ON u.id = w.user_id
    WHERE w.id = NEW.wallet_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transactions_denorm ON public.transactions;
CREATE TRIGGER trg_transactions_denorm
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_transactions_denormalize();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. WALLETS — Add user_email, user_country, user_role
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_country TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT;

-- Backfill existing rows
UPDATE public.wallets w
SET user_email = u.email,
    user_country = u.country,
    user_role = u.role::TEXT
FROM public.users u
WHERE w.user_id = u.id
  AND w.user_email IS NULL;

-- Auto-populate trigger for future inserts
CREATE OR REPLACE FUNCTION public.trg_wallets_denormalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.user_email IS NULL THEN
    SELECT u.email, u.country, u.role::TEXT
    INTO NEW.user_email, NEW.user_country, NEW.user_role
    FROM public.users u
    WHERE u.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallets_denorm ON public.wallets;
CREATE TRIGGER trg_wallets_denorm
  BEFORE INSERT ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.trg_wallets_denormalize();

-- Sync trigger: when users table is updated, propagate to wallets
CREATE OR REPLACE FUNCTION public.trg_users_sync_wallets()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email
     OR OLD.country IS DISTINCT FROM NEW.country
     OR OLD.role IS DISTINCT FROM NEW.role THEN
    UPDATE public.wallets
    SET user_email = NEW.email,
        user_country = NEW.country,
        user_role = NEW.role::TEXT
    WHERE user_id = NEW.id;

    -- Also sync to transactions
    UPDATE public.transactions
    SET user_email = NEW.email,
        user_country = NEW.country,
        user_display_name = NEW.display_name
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_sync_wallets ON public.users;
CREATE TRIGGER trg_users_sync_wallets
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_users_sync_wallets();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SCAN2PAY_SESSIONS — Add merchant_email, merchant_country, payer_email
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.scan2pay_sessions
  ADD COLUMN IF NOT EXISTS merchant_email TEXT,
  ADD COLUMN IF NOT EXISTS merchant_country TEXT,
  ADD COLUMN IF NOT EXISTS payer_email TEXT;

-- Backfill existing rows
UPDATE public.scan2pay_sessions s
SET merchant_email = mu.email,
    merchant_country = mu.country
FROM public.users mu
WHERE s.merchant_id = mu.id
  AND s.merchant_email IS NULL;

UPDATE public.scan2pay_sessions s
SET payer_email = pu.email
FROM public.users pu
WHERE s.paid_by = pu.id
  AND s.payer_email IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. WITHDRAWAL_REQUESTS — Add user_email, user_country, bank_name,
--                           account_name, account_number
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_country TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_name_cached TEXT,
  ADD COLUMN IF NOT EXISTS account_number_cached TEXT;

-- Backfill existing rows
UPDATE public.withdrawal_requests wr
SET user_email = u.email,
    user_country = u.country
FROM public.users u
WHERE wr.user_id = u.id
  AND wr.user_email IS NULL;

UPDATE public.withdrawal_requests wr
SET bank_name = pb.name,
    account_name_cached = upm.account_name,
    account_number_cached = upm.account_number
FROM public.user_payment_methods upm
LEFT JOIN public.platform_banks pb ON pb.id = upm.bank_id
WHERE wr.payment_method_id = upm.id
  AND wr.bank_name IS NULL;

-- Auto-populate trigger for future inserts
CREATE OR REPLACE FUNCTION public.trg_withdrawals_denormalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.user_email IS NULL THEN
    SELECT u.email, u.country
    INTO NEW.user_email, NEW.user_country
    FROM public.users u
    WHERE u.id = NEW.user_id;
  END IF;

  IF NEW.payment_method_id IS NOT NULL AND NEW.bank_name IS NULL THEN
    SELECT pb.name, upm.account_name, upm.account_number
    INTO NEW.bank_name, NEW.account_name_cached, NEW.account_number_cached
    FROM public.user_payment_methods upm
    LEFT JOIN public.platform_banks pb ON pb.id = upm.bank_id
    WHERE upm.id = NEW.payment_method_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_withdrawals_denorm ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawals_denorm
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_withdrawals_denormalize();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. USER_CAMPAIGNS — Add user_email, user_display_name, user_country,
--                      campaign_title, sp_company_name, sp_email,
--                      isp_name, isp_email, category
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.user_campaigns
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_display_name TEXT,
  ADD COLUMN IF NOT EXISTS user_country TEXT,
  ADD COLUMN IF NOT EXISTS campaign_title TEXT,
  ADD COLUMN IF NOT EXISTS sp_company_name TEXT,
  ADD COLUMN IF NOT EXISTS sp_email TEXT,
  ADD COLUMN IF NOT EXISTS isp_name TEXT,
  ADD COLUMN IF NOT EXISTS isp_email TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill existing rows
UPDATE public.user_campaigns uc
SET user_email = u.email,
    user_display_name = u.display_name,
    user_country = u.country
FROM public.users u
WHERE uc.user_id = u.id
  AND uc.user_email IS NULL;

UPDATE public.user_campaigns uc
SET campaign_title = c.title,
    category = COALESCE(
      (SELECT LOWER(s.category) FROM public.services s WHERE s.id = c.service_id),
      (SELECT LOWER(n.category) FROM public.networks n WHERE n.id = c.network_id),
      'general'
    ),
    sp_company_name = sp.company_name,
    sp_email = spu.email,
    isp_name = isp.isp_name,
    isp_email = ispu.email
FROM public.campaigns c
LEFT JOIN public.sp_profiles sp ON sp.id = c.sp_id
LEFT JOIN public.users spu ON spu.id = sp.user_id
LEFT JOIN public.isp_profiles isp ON isp.id = c.isp_id
LEFT JOIN public.users ispu ON ispu.id = isp.user_id
WHERE uc.campaign_id = c.id
  AND uc.campaign_title IS NULL;

-- Auto-populate trigger for future inserts
CREATE OR REPLACE FUNCTION public.trg_user_campaigns_denormalize()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.user_email IS NULL THEN
    SELECT u.email, u.display_name, u.country
    INTO NEW.user_email, NEW.user_display_name, NEW.user_country
    FROM public.users u
    WHERE u.id = NEW.user_id;
  END IF;

  IF NEW.campaign_id IS NOT NULL AND NEW.campaign_title IS NULL THEN
    SELECT c.title,
           COALESCE(
             (SELECT LOWER(s.category) FROM public.services s WHERE s.id = c.service_id),
             (SELECT LOWER(n.category) FROM public.networks n WHERE n.id = c.network_id),
             'general'
           ),
           sp.company_name,
           spu.email,
           isp.isp_name,
           ispu.email
    INTO NEW.campaign_title, NEW.category,
         NEW.sp_company_name, NEW.sp_email,
         NEW.isp_name, NEW.isp_email
    FROM public.campaigns c
    LEFT JOIN public.sp_profiles sp ON sp.id = c.sp_id
    LEFT JOIN public.users spu ON spu.id = sp.user_id
    LEFT JOIN public.isp_profiles isp ON isp.id = c.isp_id
    LEFT JOIN public.users ispu ON ispu.id = isp.user_id
    WHERE c.id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_campaigns_denorm ON public.user_campaigns;
CREATE TRIGGER trg_user_campaigns_denorm
  BEFORE INSERT ON public.user_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.trg_user_campaigns_denormalize();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. DEVICES — Add user_email, user_country, last_campaign_title
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_country TEXT,
  ADD COLUMN IF NOT EXISTS last_campaign_title TEXT;

-- Backfill existing rows
UPDATE public.devices d
SET user_email = u.email,
    user_country = u.country
FROM public.users u
WHERE d.user_id = u.id
  AND d.user_email IS NULL;

UPDATE public.devices d
SET last_campaign_title = c.title
FROM public.campaigns c
WHERE d.last_campaign_id = c.id
  AND d.last_campaign_title IS NULL;
