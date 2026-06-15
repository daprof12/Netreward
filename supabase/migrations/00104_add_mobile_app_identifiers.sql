-- Migration: Add android_package_name and ios_bundle_id to services table
-- These fields allow the client apps to perform deep linking into mobile games/apps.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS android_package_name TEXT,
  ADD COLUMN IF NOT EXISTS ios_bundle_id TEXT;

COMMENT ON COLUMN public.services.android_package_name IS 'Android package name (e.g. com.example.game) for deep linking into the Android app';
COMMENT ON COLUMN public.services.ios_bundle_id IS 'iOS bundle identifier (e.g. com.example.game) for deep linking into the iOS app';
