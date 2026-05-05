-- 1. First, instantly kill the broken policy to stop the 500 errors
DROP POLICY IF EXISTS "Providers can view participants" ON public.users;

-- 2. Create a secure, isolated function to check access (bypasses the recursion trap)
CREATE OR REPLACE FUNCTION public.check_provider_access(p_participant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_campaigns uc
        JOIN public.campaigns c ON uc.campaign_id = c.id
        LEFT JOIN public.sp_profiles sp ON c.sp_id = sp.id
        LEFT JOIN public.isp_profiles isp ON c.isp_id = isp.id
        WHERE uc.user_id = p_participant_id
          AND (sp.user_id = auth.uid() OR isp.user_id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Apply the safe policy using the isolated function
CREATE POLICY "Providers can view participants safe" ON public.users 
FOR SELECT USING (public.check_provider_access(id));
