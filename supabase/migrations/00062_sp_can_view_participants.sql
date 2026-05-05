-- Allow SPs and ISPs to view the profiles of users enrolled in their campaigns
CREATE POLICY "Providers can view participants" ON public.users FOR SELECT USING (
    id IN (
        SELECT user_id FROM public.user_campaigns WHERE campaign_id IN (
            SELECT id FROM public.campaigns WHERE 
                sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()) OR
                isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid())
        )
    )
);
