-- Migration: Evolve system_settings into a key-value store
-- This is required because many parts of the app use:
--   .eq('key', 'token_config'), .eq('key', 'reward_config'), etc.
-- The original table was a single-row wide table; we extend it to support key-value pairs.

-- Create the key-value settings table
CREATE TABLE IF NOT EXISTS public.kv_settings (
    key   TEXT PRIMARY KEY,
    value JSONB,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.kv_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read kv_settings"
ON public.kv_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage kv_settings"
ON public.kv_settings FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Seed default values used across the app
INSERT INTO public.kv_settings (key, value, category) VALUES
(
  'token_config',
  '{"currentValue": 0.005, "symbol": "NRT", "decimals": 9}',
  'token'
),
(
  'reward_config',
  '{"rewardPerMB": 0.1, "minWithdrawal": 10, "maxDailyReward": 500}',
  'rewards'
),
(
  'maintenance_mode',
  'false',
  'system'
),
(
  'token_frozen',
  'false',
  'system'
),
(
  'admin_security_config',
  '{"twoFactorRequired": false, "sessionTimeoutMinutes": 60}',
  'security'
)
ON CONFLICT (key) DO NOTHING;

-- Create a view that aliases kv_settings as system_settings queries expect
-- so that existing code using .from('system_settings').eq('key', ...) works
-- Note: We also keep the original system_settings table untouched for backward compat.
-- App code should migrate to using kv_settings, but we create a compatibility view.
CREATE OR REPLACE VIEW public.system_settings_kv AS
  SELECT key, value, category, created_at, updated_at FROM public.kv_settings;
