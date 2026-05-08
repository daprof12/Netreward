-- Migration: Clean up deprecated fields and redundant tables
-- Following the refactor to single API key per service/network
-- Created: 2026-05-08

-- ==========================================
-- 1. Drop deprecated columns from services table
-- These were never actively populated from the current CreateService form
-- ==========================================
ALTER TABLE public.services
    DROP COLUMN IF EXISTS android_package_name,
    DROP COLUMN IF EXISTS ios_bundle_id,
    DROP COLUMN IF EXISTS web_domain,
    DROP COLUMN IF EXISTS webhook_url,
    DROP COLUMN IF EXISTS secret_key,
    DROP COLUMN IF EXISTS webhook_secret;

-- ==========================================
-- 2. Drop deprecated columns from networks table
-- webhook_url and api_secret are no longer used
-- ==========================================
ALTER TABLE public.networks
    DROP COLUMN IF EXISTS webhook_url,
    DROP COLUMN IF EXISTS api_secret;

-- ==========================================
-- 3. Drop redundant API key tables
-- Each service/network now stores its own api_key directly
-- ==========================================
DROP TABLE IF EXISTS public.isp_api_keys CASCADE;
DROP TABLE IF EXISTS public.sp_api_keys CASCADE;
