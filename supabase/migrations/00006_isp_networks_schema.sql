-- Migration for ISP Networks and Campaign Upgrades
-- Creates the public.networks table and updates public.campaigns to support ISP campaigns

CREATE TABLE public.networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isp_id UUID REFERENCES public.isp_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    logo_url TEXT,
    verified BOOLEAN DEFAULT false,
    country TEXT,
    signal_strength INTEGER DEFAULT 0,
    coverage TEXT,
    asn TEXT,
    ip_ranges JSONB DEFAULT '[]'::jsonb,
    handshake_url TEXT,
    webhook_url TEXT,
    api_key TEXT,
    api_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update campaigns to support ISPs
-- Campaigns can now be linked to either an SP Service or an ISP Network.
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES public.isp_profiles(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE;

-- RLS Policies for Networks
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ISP can view own networks" 
ON public.networks FOR SELECT 
USING (isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "ISP can insert own networks" 
ON public.networks FOR INSERT 
WITH CHECK (isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "ISP can update own networks" 
ON public.networks FOR UPDATE 
USING (isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "ISP can delete own networks" 
ON public.networks FOR DELETE 
USING (isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()));

-- Trigger to auto-update updated_at for networks
CREATE TRIGGER update_networks_modtime 
BEFORE UPDATE ON public.networks 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
