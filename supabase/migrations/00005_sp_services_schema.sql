-- Migration for SP Services and Campaign Upgrades
-- Creates the public.services table and updates public.campaigns

CREATE TYPE service_status AS ENUM ('pending_verification', 'active', 'suspended');

CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sp_id UUID REFERENCES public.sp_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    web_url TEXT,
    android_url TEXT,
    ios_url TEXT,
    android_package_name TEXT,
    ios_bundle_id TEXT,
    web_domain TEXT,
    webhook_url TEXT,
    logo_url TEXT,
    api_key TEXT,
    secret_key TEXT,
    webhook_secret TEXT,
    verified BOOLEAN DEFAULT false,
    status service_status DEFAULT 'pending_verification'::service_status,
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alter campaigns to reference the new services table
-- Currently campaigns has target_app TEXT. We'll drop it and add service_id.
ALTER TABLE public.campaigns DROP COLUMN IF EXISTS target_app;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE CASCADE;

-- Add new campaign metadata columns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS country TEXT;

-- RLS Policies for Services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SP can view own services" 
ON public.services FOR SELECT 
USING (sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "SP can insert own services" 
ON public.services FOR INSERT 
WITH CHECK (sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "SP can update own services" 
ON public.services FOR UPDATE 
USING (sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "SP can delete own services" 
ON public.services FOR DELETE 
USING (sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()));

-- Trigger to auto-update updated_at for services
CREATE TRIGGER update_services_modtime 
BEFORE UPDATE ON public.services 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
