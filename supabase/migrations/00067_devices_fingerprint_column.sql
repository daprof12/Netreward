-- Migration: Add fingerprint column to devices table
-- Enables deduplication when linking devices from useDeviceManager.
-- A unique fingerprint (UUID stored in localStorage) ensures one physical
-- device cannot be linked twice to the same or different accounts.

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS fingerprint TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Index for fast fingerprint lookups (used on every page load)
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON public.devices(fingerprint);

-- Trigger to keep updated_at current
DROP TRIGGER IF EXISTS update_devices_modtime ON public.devices;
CREATE TRIGGER update_devices_modtime
  BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
