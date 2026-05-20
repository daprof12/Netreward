-- Migration: Grant Admin Access to Devices Table
-- Description: Adds explicit RLS policies to ensure admins can view and manage all devices, fixing an issue where they only saw their own.

DROP POLICY IF EXISTS "Admins can view all devices" ON public.devices;
CREATE POLICY "Admins can view all devices" 
ON public.devices FOR SELECT 
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all devices" ON public.devices;
CREATE POLICY "Admins can update all devices" 
ON public.devices FOR UPDATE 
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete all devices" ON public.devices;
CREATE POLICY "Admins can delete all devices" 
ON public.devices FOR DELETE 
USING (public.is_admin());
