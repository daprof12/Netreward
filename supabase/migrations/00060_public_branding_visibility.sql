-- Migration: Public Visibility for Branding Data
-- Description: Allows authenticated users to view profiles, services, and networks so that logos and creator names are visible in the campaign list.

-- 1. SP Profiles Visibility
DROP POLICY IF EXISTS "Public can view SP profiles" ON public.sp_profiles;
CREATE POLICY "Public can view SP profiles" 
ON public.sp_profiles FOR SELECT 
TO authenticated 
USING (true);

-- 2. ISP Profiles Visibility
DROP POLICY IF EXISTS "Public can view ISP profiles" ON public.isp_profiles;
CREATE POLICY "Public can view ISP profiles" 
ON public.isp_profiles FOR SELECT 
TO authenticated 
USING (true);

-- 3. Services Visibility
DROP POLICY IF EXISTS "Public can view services" ON public.services;
CREATE POLICY "Public can view services" 
ON public.services FOR SELECT 
TO authenticated 
USING (status = 'active' OR verified = true);

-- 4. Networks Visibility
DROP POLICY IF EXISTS "Public can view networks" ON public.networks;
CREATE POLICY "Public can view networks" 
ON public.networks FOR SELECT 
TO authenticated 
USING (verified = true);

-- 5. Ensure campaigns are visible (Refining existing policy)
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Anyone can view active campaigns" 
ON public.campaigns FOR SELECT 
TO authenticated 
USING (status = 'active');
