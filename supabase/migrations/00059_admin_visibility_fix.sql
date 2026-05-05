-- Migration: Grant Admin Access to Services and Networks
-- Description: Adds RLS policies to allow users with the 'admin' role to view and manage all records in the services and networks tables.

-- 1. Services Table Admin Policies
CREATE POLICY "Admins can view all services" 
ON public.services FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all services" 
ON public.services FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete all services" 
ON public.services FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- 2. Networks Table Admin Policies
CREATE POLICY "Admins can view all networks" 
ON public.networks FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all networks" 
ON public.networks FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete all networks" 
ON public.networks FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- 3. Also ensure campaign visibility for admins (just in case)
DROP POLICY IF EXISTS "Admins can view all campaigns" ON public.campaigns;
CREATE POLICY "Admins can view all campaigns" 
ON public.campaigns FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
