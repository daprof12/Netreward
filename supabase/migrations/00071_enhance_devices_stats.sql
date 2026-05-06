-- ============================================================
-- 00071: Enhance Devices with Stats & Campaign Tracking
-- ============================================================

-- 1. Add new columns to devices table
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS last_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_duration_seconds BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_data_bytes BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS nrt_earned NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS nrt_claimed NUMERIC DEFAULT 0;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_devices_campaign ON public.devices(last_campaign_id);

-- 3. Update RLS (Ensure admins can see everything)
-- Existing policies already allow is_admin() to view all devices.
