-- Migration: Add Fingerprint to Devices
-- Description: Adds a fingerprint column to the devices table to allow persistent device identification.

-- 1. Add the column
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- 2. Add an index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON public.devices(fingerprint);

-- 3. Update RLS policies to allow SPs and ISPs to view device details for their participants
-- (Already covered by previous policies, but ensuring they are robust)
DROP POLICY IF EXISTS "SP can view devices in their campaigns" ON public.devices;
CREATE POLICY "SP can view devices in their campaigns" ON public.devices 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_campaigns uc
        JOIN public.campaigns c ON uc.campaign_id = c.id
        WHERE uc.user_id = public.devices.user_id
        AND (c.sp_id = auth.uid() OR c.isp_id = auth.uid())
    )
);
