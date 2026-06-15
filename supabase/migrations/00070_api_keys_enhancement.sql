-- ============================================================
-- 00070: API Keys Enhancement (SP & ISP Centralized Keys)
-- ============================================================

-- 1. Upgrade sp_api_keys table (Recreate it since it was dropped in 00036)
CREATE TABLE IF NOT EXISTS public.sp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sp_id UUID REFERENCES public.sp_profiles(id) ON DELETE CASCADE,
  sp_email TEXT NOT NULL,
  api_key TEXT,
  sdk_key TEXT,
  payment_key TEXT,
  webhook_secret TEXT,
  webhook_url TEXT,
  status TEXT DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_sp_api_keys_sdk ON public.sp_api_keys(sdk_key);
CREATE INDEX IF NOT EXISTS idx_sp_api_keys_payment ON public.sp_api_keys(payment_key);

-- 2. Create isp_api_keys table
CREATE TABLE IF NOT EXISTS public.isp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isp_id UUID REFERENCES public.isp_profiles(id) ON DELETE CASCADE,
  isp_email TEXT NOT NULL,
  sdk_key TEXT,
  payment_key TEXT,
  webhook_secret TEXT,
  webhook_url TEXT,
  status TEXT DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_isp_api_keys_sdk ON public.isp_api_keys(sdk_key);
CREATE INDEX IF NOT EXISTS idx_isp_api_keys_payment ON public.isp_api_keys(payment_key);

-- 3. Security & Permissions
ALTER TABLE public.isp_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "isp_api_keys_public" ON public.isp_api_keys;
CREATE POLICY "isp_api_keys_public" ON public.isp_api_keys FOR ALL USING (true) WITH CHECK (true);

-- 4. Initial Data Sync (Optional manual step if not run via SQL editor)
-- This ensures the system is ready for the Musiq integration
