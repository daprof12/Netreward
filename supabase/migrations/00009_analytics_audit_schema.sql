-- System Audit Logs for tracking administrative actions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- e.g., 'approve_kyc', 'update_config', 'delete_user'
  resource_type TEXT NOT NULL, -- e.g., 'kyc_submission', 'system_setting', 'user'
  resource_id TEXT,
  payload_before JSONB,
  payload_after JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON system_audit_logs;
CREATE POLICY "Admins can view audit logs" ON system_audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Country-specific tax rates
CREATE TABLE IF NOT EXISTS country_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE, -- ISO alpha-2
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_label TEXT NOT NULL DEFAULT 'VAT', -- VAT, GST, Sales Tax, etc.
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on tax rates
ALTER TABLE country_tax_rates ENABLE ROW LEVEL SECURITY;

-- Everyone can read active tax rates, only admins can modify
DROP POLICY IF EXISTS "Public read active tax rates" ON country_tax_rates;
CREATE POLICY "Public read active tax rates" ON country_tax_rates
  FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can modify tax rates" ON country_tax_rates;
CREATE POLICY "Admins can modify tax rates" ON country_tax_rates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Tax Deductions Log
CREATE TABLE IF NOT EXISTS tax_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  transaction_id UUID, -- Links to the reward/payment transaction
  gross_amount NUMERIC(18,9) NOT NULL,
  tax_amount NUMERIC(18,9) NOT NULL,
  net_amount NUMERIC(18,9) NOT NULL,
  tax_rate_applied NUMERIC(5,2) NOT NULL,
  country_code TEXT NOT NULL,
  tax_label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tax_deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tax deductions" ON tax_deductions;
CREATE POLICY "Users can view their own tax deductions" ON tax_deductions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Aggregated daily stats for performance
CREATE TABLE IF NOT EXISTS user_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  total_data_bytes BIGINT DEFAULT 0,
  total_nrt_earned NUMERIC(18,9) DEFAULT 0,
  active_campaigns_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Financial Reports Registry
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  report_type TEXT NOT NULL, -- 'earnings', 'campaign_roi', 'tax_summary'
  format TEXT NOT NULL, -- 'csv', 'pdf'
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  download_url TEXT,
  metadata JSONB, -- stores date range, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert some default tax rates
INSERT INTO country_tax_rates (country_code, tax_percentage, tax_label) VALUES
('NG', 7.50, 'VAT'),
('US', 0.00, 'Sales Tax'),
('GB', 20.00, 'VAT'),
('GH', 15.00, 'VAT'),
('ZA', 15.00, 'VAT')
ON CONFLICT (country_code) DO NOTHING;
