-- Phase 10: Advanced Analytics Schema
-- Created: 2026

-- 1. Campaign Performance Tracking
CREATE TABLE IF NOT EXISTS public.campaign_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.users(id),
    date DATE NOT NULL,
    total_users_reached INT DEFAULT 0,
    total_data_bytes BIGINT DEFAULT 0,
    total_nrt_distributed NUMERIC(18,9) DEFAULT 0,
    avg_session_duration INT DEFAULT 0, -- in seconds
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(campaign_id, date)
);

-- 2. ISP Network Performance Tracking
CREATE TABLE IF NOT EXISTS public.isp_network_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_id UUID REFERENCES public.users(id),
    network_id UUID REFERENCES public.networks(id),
    date DATE NOT NULL,
    avg_latency_ms INT DEFAULT 0,
    packet_loss_percentage NUMERIC(5,2) DEFAULT 0,
    total_traffic_bytes BIGINT DEFAULT 0,
    active_users INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(network_id, date)
);

-- 3. Geographic Earning Hotspots (Aggregated)
CREATE TABLE IF NOT EXISTS public.geo_earning_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    date DATE NOT NULL,
    total_nrt_earned NUMERIC(18,9) DEFAULT 0,
    user_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(region_name, country_code, date)
);

-- Enable RLS
ALTER TABLE public.campaign_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.isp_network_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_earning_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can view their own campaign stats" ON public.campaign_daily_stats
    FOR SELECT TO authenticated
    USING (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "ISPs can view their own network stats" ON public.isp_network_stats
    FOR SELECT TO authenticated
    USING (isp_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view all geo stats" ON public.geo_earning_stats
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 4. Helper Function to increment daily stats (Atomic)
CREATE OR REPLACE FUNCTION public.increment_campaign_stats(
    p_campaign_id UUID,
    p_provider_id UUID,
    p_data_bytes BIGINT,
    p_nrt_amount NUMERIC
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.campaign_daily_stats (campaign_id, provider_id, date, total_users_reached, total_data_bytes, total_nrt_distributed)
    VALUES (p_campaign_id, p_provider_id, CURRENT_DATE, 1, p_data_bytes, p_nrt_amount)
    ON CONFLICT (campaign_id, date) DO UPDATE SET
        total_users_reached = public.campaign_daily_stats.total_users_reached + 1,
        total_data_bytes = public.campaign_daily_stats.total_data_bytes + p_data_bytes,
        total_nrt_distributed = public.campaign_daily_stats.total_nrt_distributed + p_nrt_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
