-- Migration: Fix User Enrollment Permissions
-- Description: Ensures users can join campaigns by fixing RLS policies.

-- 1. Enable RLS (just in case)
ALTER TABLE public.user_campaigns ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.user_campaigns;
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.user_campaigns;

-- 3. Create fresh, robust policies
CREATE POLICY "Users can view own enrollments" 
ON public.user_campaigns FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves" 
ON public.user_campaigns FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Allow SPs and ISPs to see who joined their campaigns
CREATE POLICY "Creators can view their campaign enrollments" 
ON public.user_campaigns FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.campaigns c 
        WHERE c.id = campaign_id 
        AND (c.sp_id = auth.uid() OR c.isp_id = auth.uid())
    )
);
