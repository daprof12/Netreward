-- Migration: Fix Analytics and Participant Visibility
-- Description: Corrects RLS policies to allow SPs and ISPs to view their campaign participants.

-- 1. Fix user_campaigns visibility for creators
DROP POLICY IF EXISTS "Creators can view their campaign enrollments" ON public.user_campaigns;
CREATE POLICY "Creators can view their campaign enrollments" 
ON public.user_campaigns FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.campaigns c 
        WHERE c.id = campaign_id 
        AND (
            c.sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()) OR 
            c.isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

-- 2. Allow creators to view basic info of their participants
-- This is necessary for the analytics join to 'users' table to work.
DROP POLICY IF EXISTS "Creators can view participants" ON public.users;
CREATE POLICY "Creators can view participants" 
ON public.users FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_campaigns uc
        JOIN public.campaigns c ON uc.campaign_id = c.id
        WHERE uc.user_id = public.users.id
        AND (
            c.sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()) OR 
            c.isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        )
    )
);
