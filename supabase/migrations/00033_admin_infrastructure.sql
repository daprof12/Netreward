-- =============================================================================
-- Migration 00033: Admin Infrastructure Tables
-- Creates all tables needed for the admin dashboard to operate on real data
-- =============================================================================

-- ─── 1. Verified Exchangers ──────────────────────────────────────────────────
-- Admin-managed, user-readable. Powers both AdminExchangers and VerifiedExchanger pages.
CREATE TABLE IF NOT EXISTS public.exchangers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  country TEXT DEFAULT 'Global',
  volume_24h NUMERIC DEFAULT 0,
  rating NUMERIC DEFAULT 5.0,
  trading_limit NUMERIC DEFAULT 10000,
  status TEXT DEFAULT 'pending' CHECK (status IN ('verified','pending','suspended')),
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  badge TEXT,
  badge_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.exchangers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exchangers_read_all" ON public.exchangers FOR SELECT USING (true);
CREATE POLICY "exchangers_admin_write" ON public.exchangers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 2. Processing Fees ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.processing_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_name TEXT NOT NULL UNIQUE,           -- 'P2P Trade', 'Checkout', 'Withdrawal', 'Deposit'
  calc_type TEXT DEFAULT 'percent' CHECK (calc_type IN ('flat','percent')),
  value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.processing_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fees_read_all" ON public.processing_fees FOR SELECT USING (true);
CREATE POLICY "fees_admin_write" ON public.processing_fees FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default fees
INSERT INTO public.processing_fees (fee_name, calc_type, value) VALUES
  ('P2P Trade', 'percent', 1),
  ('Checkout', 'percent', 0.5),
  ('Withdrawal', 'flat', 2),
  ('Deposit', 'flat', 0)
ON CONFLICT (fee_name) DO NOTHING;

-- ─── 3. API Endpoints Registry ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT DEFAULT 'GET' CHECK (method IN ('GET','POST','PUT','DELETE','PATCH')),
  rate_limit INT DEFAULT 60,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','disabled')),
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_endpoints_admin_only" ON public.api_endpoints FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default endpoints
INSERT INTO public.api_endpoints (name, path, method, rate_limit) VALUES
  ('Auth Token', '/api/auth/token', 'POST', 10),
  ('User Profile', '/api/user/profile', 'GET', 60),
  ('Campaign List', '/api/campaigns', 'GET', 120),
  ('Service API', '/api/services', 'GET', 100),
  ('NRT Transfer', '/api/wallet/transfer', 'POST', 5),
  ('Admin Dashboard', '/api/admin/stats', 'GET', 30)
ON CONFLICT DO NOTHING;

-- ─── 4. Admin Roles & Permissions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_roles_admin_only" ON public.admin_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 5. Payment Gateways ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gateway_type TEXT NOT NULL,
  status TEXT DEFAULT 'coming_soon' CHECK (status IN ('active','coming_soon','disabled')),
  fees TEXT,
  description TEXT,
  country TEXT DEFAULT 'Global',
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gateways_read_all" ON public.payment_gateways FOR SELECT USING (true);
CREATE POLICY "gateways_admin_write" ON public.payment_gateways FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default gateways
INSERT INTO public.payment_gateways (name, gateway_type, status, fees, description, country) VALUES
  ('NRT Internal Ledger', 'Token Transfer', 'active', '0%', 'Zero-fee internal wallet-to-wallet NRT transfers.', 'Global'),
  ('P2P Escrow', 'Peer-to-Peer', 'active', '1%', 'Escrow-backed P2P trading with dispute resolution.', 'Global'),
  ('Stripe Connect', 'Fiat On-Ramp', 'coming_soon', '2.9% + $0.30', 'Credit/debit card purchases for NRT tokens.', 'USA'),
  ('Paystack', 'Fiat On-Ramp', 'coming_soon', '1.5%', 'African market fiat gateway (NGN, GHS, ZAR).', 'Nigeria'),
  ('Coinbase Commerce', 'Crypto On-Ramp', 'coming_soon', '1%', 'BTC/ETH/USDT to NRT conversion.', 'Global')
ON CONFLICT DO NOTHING;

-- ─── 6. Feature Flags (Admin-controlled feature toggles) ────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,          -- 'p2p_trading', 'scan2pay', 'withdrawals', etc.
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  restricted_countries TEXT[] DEFAULT '{}',   -- Countries where feature is disabled
  restricted_roles TEXT[] DEFAULT '{}',       -- Roles excluded from feature
  config JSONB DEFAULT '{}'::jsonb,           -- Additional feature-specific config
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_flags_read_all" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "feature_flags_admin_write" ON public.feature_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default feature flags
INSERT INTO public.feature_flags (feature_key, display_name, description) VALUES
  ('p2p_trading', 'P2P Trading', 'Enable peer-to-peer NRT trading marketplace'),
  ('scan2pay', 'Scan2Pay', 'Enable QR code payment scanning for SP services'),
  ('withdrawals', 'Fiat Withdrawals', 'Allow users to withdraw NRT to fiat currency'),
  ('deposits', 'Deposits', 'Allow users to deposit into NRT wallets'),
  ('campaigns', 'Campaigns', 'Allow SP/ISP to create and manage ad campaigns'),
  ('referrals', 'Referral Program', 'Enable user referral rewards system'),
  ('kyc_verification', 'KYC Verification', 'Require KYC for account upgrades'),
  ('biometric_auth', 'Biometric Authentication', 'Allow biometric login and payment confirmation'),
  ('web3_wallet', 'Web3 Wallet', 'Enable Solana wallet connection and on-chain features'),
  ('data_tracking', 'Data Tracking & Rewards', 'Enable device data usage tracking for NRT earning')
ON CONFLICT (feature_key) DO NOTHING;

-- ─── 7. Security Logs (enhanced from system_audit_logs) ─────────────────────
-- Reuse existing system_audit_logs table but add security-specific fields
ALTER TABLE public.system_audit_logs 
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','critical'));

-- ─── 8. Data Retention Policy Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  retention_days INT NOT NULL DEFAULT 365,
  archive_enabled BOOLEAN DEFAULT false,
  last_cleanup_at TIMESTAMPTZ,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retention_admin_only" ON public.data_retention_policies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Seed default retention policies
INSERT INTO public.data_retention_policies (table_name, retention_days, archive_enabled, description) VALUES
  ('system_audit_logs', 90, true, 'Audit trail — archive after 90 days'),
  ('notifications', 60, true, 'User notifications — archive after 60 days'),
  ('device_data_sessions', 180, true, 'Device telemetry — archive after 6 months'),
  ('sp_telemetry', 180, true, 'SP telemetry data — archive after 6 months'),
  ('transactions', 730, false, 'Financial transactions — keep 2 years (compliance)'),
  ('support_tickets', 365, true, 'Support tickets — archive after 1 year'),
  ('p2p_orders', 365, false, 'P2P trade history — keep 1 year')
ON CONFLICT (table_name) DO NOTHING;

-- ─── 9. Cleanup RPC Function ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_data_retention_cleanup()
RETURNS JSONB AS $$
DECLARE
  policy RECORD;
  deleted_count INT;
  results JSONB := '[]'::jsonb;
BEGIN
  FOR policy IN SELECT * FROM public.data_retention_policies WHERE archive_enabled = true
  LOOP
    EXECUTE format(
      'DELETE FROM public.%I WHERE created_at < NOW() - INTERVAL ''%s days''',
      policy.table_name,
      policy.retention_days
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    UPDATE public.data_retention_policies 
    SET last_cleanup_at = NOW() 
    WHERE id = policy.id;
    
    results := results || jsonb_build_object(
      'table', policy.table_name,
      'deleted', deleted_count
    );
  END LOOP;
  
  RETURN results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 10. Admin Settings (profile, 2FA preferences, backups) ─────────────────
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  pin_hash TEXT,                              -- Hashed admin PIN for sensitive actions
  biometrics_enabled BOOLEAN DEFAULT false,
  two_factor_enabled BOOLEAN DEFAULT false,
  backup_schedule TEXT DEFAULT 'weekly',       -- 'daily', 'weekly', 'monthly', 'manual'
  last_backup_at TIMESTAMPTZ,
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "critical_only": false}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_settings_own" ON public.admin_settings FOR ALL USING (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
