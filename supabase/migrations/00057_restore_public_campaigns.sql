-- Migration: Restore Public Campaign Visibility
-- Description: Ensures regular users can see active campaigns while keeping management restricted to creators.

-- 1. Allow everyone to see active campaigns
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Anyone can view active campaigns" 
ON public.campaigns FOR SELECT 
TO authenticated
USING (status = 'active');

-- 2. Keep the creator management policy robust (already there but ensuring no conflicts)
-- Note: "SPs/ISPs can view own campaigns" handles draft/paused visibility for owners.
