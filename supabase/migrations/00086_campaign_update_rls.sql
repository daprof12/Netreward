-- Migration: Allow ISP campaign owners to update their own campaigns
-- The campaigns table has RLS but no UPDATE policy for the campaign creator.
-- This adds the missing policy so EditIspCampaign can save changes.

-- Drop any conflicting old policies first
DROP POLICY IF EXISTS "ISP can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "SP can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Campaign owners can update" ON public.campaigns;

-- Allow the creator (sp_id or isp_id match the logged-in user's profile) to update
-- We resolve via the isp_profiles and sp_profiles tables to get the profile ID
CREATE POLICY "ISP can update own campaigns"
ON public.campaigns
FOR UPDATE
USING (
  isp_id IN (
    SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()
  )
  OR
  sp_id IN (
    SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  isp_id IN (
    SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()
  )
  OR
  sp_id IN (
    SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()
  )
);

-- Also ensure SELECT is open for the owner
DROP POLICY IF EXISTS "ISP can view own campaigns" ON public.campaigns;
CREATE POLICY "ISP can view own campaigns"
ON public.campaigns
FOR SELECT
USING (
  isp_id IN (
    SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()
  )
  OR
  sp_id IN (
    SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()
  )
  OR auth.role() = 'service_role'
);
