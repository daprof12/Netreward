-- Migration: Correct RLS for SP/ISP Analytics
-- Description: Fixes policies to correctly link SP/ISP User IDs to their Profile IDs for campaign data visibility.

-- 1. Fix user_campaigns visibility for creators
DROP POLICY IF EXISTS "Creators can view their campaign enrollments" ON public.user_campaigns;

CREATE POLICY "Creators can view their campaign enrollments" 
ON public.user_campaigns FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.campaigns c 
        LEFT JOIN public.sp_profiles sp ON c.sp_id = sp.id
        LEFT JOIN public.isp_profiles isp ON c.isp_id = isp.id
        WHERE c.id = public.user_campaigns.campaign_id 
        AND (sp.user_id = auth.uid() OR isp.user_id = auth.uid())
    )
);

-- 2. Fix devices visibility for creators
DROP POLICY IF EXISTS "SP can view devices in their campaigns" ON public.devices;

CREATE POLICY "SP/ISP can view devices in their campaigns" ON public.devices 
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_campaigns uc
        JOIN public.campaigns c ON uc.campaign_id = c.id
        LEFT JOIN public.sp_profiles sp ON c.sp_id = sp.id
        LEFT JOIN public.isp_profiles isp ON c.isp_id = isp.id
        WHERE uc.user_id = public.devices.user_id
        AND (sp.user_id = auth.uid() OR isp.user_id = auth.uid())
    )
);

-- 3. Ensure SP/ISP can see their own campaigns (just in case)
DROP POLICY IF EXISTS "SPs can view own campaigns" ON public.campaigns;
CREATE POLICY "SPs/ISPs can view own campaigns" ON public.campaigns
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sp_profiles sp WHERE sp.id = sp_id AND sp.user_id = auth.uid()
    ) OR 
    EXISTS (
        SELECT 1 FROM public.isp_profiles isp WHERE isp.id = isp_id AND isp.user_id = auth.uid()
    )
);
