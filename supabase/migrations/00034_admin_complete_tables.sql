-- ============================================================
-- 00034: Complete admin tables for full dashboard DB migration
-- Adds missing columns to existing tables, creates new tables
-- ============================================================

-- ─── Fix admin_roles: add name & email columns ─────────────────────────────
ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE admin_roles ADD COLUMN IF NOT EXISTS email TEXT;
-- Backfill name from role_name for existing rows
UPDATE admin_roles SET name = role_name WHERE name IS NULL AND role_name IS NOT NULL;

-- ─── Fix payment_gateways: add 'type' alias column ─────────────────────────
ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS type TEXT;
UPDATE payment_gateways SET type = gateway_type WHERE type IS NULL AND gateway_type IS NOT NULL;

-- ─── Checkout Integrations (AdminPayments) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS checkout_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sp_name TEXT DEFAULT '',
  sp_email TEXT DEFAULT '',
  service_name TEXT DEFAULT '',
  category TEXT DEFAULT 'Other',
  country TEXT DEFAULT 'Global',
  status TEXT DEFAULT 'active',
  volume_nrt NUMERIC DEFAULT 0,
  tx_count INTEGER DEFAULT 0,
  tx_success INTEGER DEFAULT 0,
  tx_failed INTEGER DEFAULT 0,
  tx_pending INTEGER DEFAULT 0,
  tx_cancelled INTEGER DEFAULT 0,
  tx_timeout INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE checkout_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checkout_integrations_public" ON checkout_integrations;
CREATE POLICY "checkout_integrations_public" ON checkout_integrations FOR ALL USING (true) WITH CHECK (true);

-- ─── Local Banks (AdminPayments) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS local_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT DEFAULT 'Nigeria',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE local_banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "local_banks_public" ON local_banks;
CREATE POLICY "local_banks_public" ON local_banks FOR ALL USING (true) WITH CHECK (true);

-- ─── API Endpoints (AdminApiEndpoints / AdminRateLimits) ────────────────────
CREATE TABLE IF NOT EXISTS api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  method TEXT DEFAULT 'GET',
  path TEXT NOT NULL,
  rate_limit INTEGER DEFAULT 100,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_endpoints_public" ON api_endpoints;
CREATE POLICY "api_endpoints_public" ON api_endpoints FOR ALL USING (true) WITH CHECK (true);

-- ─── Processing Fees (AdminRewardSettings) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS processing_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_name TEXT NOT NULL,
  calc_type TEXT DEFAULT 'percent',
  value NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE processing_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "processing_fees_public" ON processing_fees;
CREATE POLICY "processing_fees_public" ON processing_fees FOR ALL USING (true) WITH CHECK (true);

-- ─── Tracking Sessions (AdminTracking) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_email TEXT,
  campaign_name TEXT DEFAULT '',
  sp_email TEXT DEFAULT '',
  source TEXT DEFAULT 'sdk',
  device_ip TEXT DEFAULT '',
  user_ip TEXT DEFAULT '',
  data_rx_bytes BIGINT DEFAULT 0,
  data_tx_bytes BIGINT DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  nrt_awarded NUMERIC DEFAULT 0,
  validation_score NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  reject_reason TEXT DEFAULT '',
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tracking_sessions_public" ON tracking_sessions;
CREATE POLICY "tracking_sessions_public" ON tracking_sessions FOR ALL USING (true) WITH CHECK (true);

-- ─── Tracking Anomalies (AdminTracking) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_email TEXT,
  flag_type TEXT DEFAULT 'UNKNOWN',
  details TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  admin_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE tracking_anomalies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tracking_anomalies_public" ON tracking_anomalies;
CREATE POLICY "tracking_anomalies_public" ON tracking_anomalies FOR ALL USING (true) WITH CHECK (true);

-- ─── SP API Keys (AdminTracking) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sp_email TEXT NOT NULL,
  api_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE sp_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_api_keys_public" ON sp_api_keys;
CREATE POLICY "sp_api_keys_public" ON sp_api_keys FOR ALL USING (true) WITH CHECK (true);

-- ─── Scan2Pay Sessions (AdminCheckout) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan2pay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sp_email TEXT DEFAULT '',
  merchant_email TEXT DEFAULT '',
  user_email TEXT DEFAULT '',
  payer_email TEXT DEFAULT '',
  service_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  nrt_amount NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  usd_value NUMERIC DEFAULT 0,
  fiat_amount NUMERIC DEFAULT 0,
  country TEXT DEFAULT 'Global',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE scan2pay_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scan2pay_sessions_public" ON scan2pay_sessions;
CREATE POLICY "scan2pay_sessions_public" ON scan2pay_sessions FOR ALL USING (true) WITH CHECK (true);

-- ─── Seed default API endpoints ─────────────────────────────────────────────
INSERT INTO api_endpoints (name, method, path, rate_limit, status) VALUES
  ('User Authentication', 'POST', '/auth/login', 30, 'active'),
  ('User Registration', 'POST', '/auth/register', 10, 'active'),
  ('Get User Profile', 'GET', '/users/profile', 120, 'active'),
  ('Update Profile', 'PUT', '/users/profile', 60, 'active'),
  ('Get Wallet Balance', 'GET', '/wallet/balance', 120, 'active'),
  ('NRT Transfer', 'POST', '/wallet/transfer', 30, 'active'),
  ('P2P Create Offer', 'POST', '/p2p/offers', 20, 'active'),
  ('P2P List Offers', 'GET', '/p2p/offers', 120, 'active'),
  ('Campaign Analytics', 'GET', '/campaigns/analytics', 60, 'active'),
  ('Support Ticket', 'POST', '/support/tickets', 15, 'active')
ON CONFLICT DO NOTHING;

-- ─── Seed default processing fees ───────────────────────────────────────────
INSERT INTO processing_fees (fee_name, calc_type, value) VALUES
  ('Withdrawal', 'percent', 1.5),
  ('P2P Trade', 'percent', 0.5),
  ('Checkout', 'percent', 2.0),
  ('Exchange', 'flat', 5)
ON CONFLICT DO NOTHING;

-- ─── Seed default admin role ────────────────────────────────────────────────
INSERT INTO admin_roles (role_name, name, email, permissions, status) VALUES
  ('Super Admin', 'Super Admin', 'admin@netreward.online', '["all"]'::jsonb, 'active')
ON CONFLICT DO NOTHING;

-- ─── Make admin_roles RLS more permissive for admin access ──────────────────
DROP POLICY IF EXISTS "admin_roles_admin_only" ON admin_roles;
CREATE POLICY "admin_roles_full_access" ON admin_roles FOR ALL USING (true) WITH CHECK (true);
