-- Migration: Add logo_url to Profiles
-- Description: Adds a logo_url column to both sp_profiles and isp_profiles to support brand identity.

-- 1. SP Profiles
ALTER TABLE public.sp_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. ISP Profiles
ALTER TABLE public.isp_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 3. Sync existing logos from services/networks if available (Optional but helpful)
-- Note: This is just a helper, will sync based on the first service/network found.
UPDATE public.sp_profiles sp
SET logo_url = (SELECT logo_url FROM public.services s WHERE s.sp_id = sp.id AND logo_url IS NOT NULL LIMIT 1)
WHERE logo_url IS NULL;

UPDATE public.isp_profiles isp
SET logo_url = (SELECT logo_url FROM public.networks n WHERE n.isp_id = isp.id AND logo_url IS NOT NULL LIMIT 1)
WHERE logo_url IS NULL;
