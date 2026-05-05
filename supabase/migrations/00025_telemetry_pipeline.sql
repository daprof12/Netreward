-- Migration: Real-Time Telemetry Pipeline (Phase E3)
-- Created: 2026-05-01

-- ==========================================
-- 1. SP Telemetry (Audience Insights & ROI)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.sp_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sp_id UUID REFERENCES public.sp_profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    country TEXT NOT NULL,
    device_type TEXT NOT NULL, -- 'Mobile App', 'Chrome Extension', 'Desktop App', 'Other'
    interest_category TEXT,
    views INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    total_cost_nrt NUMERIC(18, 9) DEFAULT 0,
    avg_duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(campaign_id, date, country, device_type, interest_category)
);

ALTER TABLE public.sp_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SP can view own telemetry" ON public.sp_telemetry
FOR SELECT USING (
    sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid())
);

-- ==========================================
-- 2. ISP Telemetry (Network Health)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.isp_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isp_id UUID REFERENCES public.isp_profiles(id) ON DELETE CASCADE,
    network_id UUID REFERENCES public.networks(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    node_name TEXT NOT NULL,
    avg_latency_ms INTEGER DEFAULT 0,
    packet_loss_pct NUMERIC(5, 4) DEFAULT 0, -- e.g., 0.0002 for 0.02%
    uptime_pct NUMERIC(5, 4) DEFAULT 1.0,    -- e.g., 0.9998 for 99.98%
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(network_id, date, node_name)
);

ALTER TABLE public.isp_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ISP can view own telemetry" ON public.isp_telemetry
FOR SELECT USING (
    isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid())
);

-- ==========================================
-- 3. Heatmap RPCs
-- ==========================================

-- A function to generate 112 days (16 weeks * 7 days) of daily earning totals
CREATE OR REPLACE FUNCTION get_user_earnings_heatmap(p_user_id UUID)
RETURNS TABLE (
    activity_date DATE,
    nrt_earned NUMERIC,
    intensity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_earned NUMERIC;
BEGIN
    -- 1. Get the maximum earnings on any single day to calculate intensity scale
    SELECT COALESCE(MAX(daily_nrt), 1) INTO v_max_earned
    FROM (
        SELECT SUM(nrt_awarded) as daily_nrt
        FROM public.device_data_sessions s
        JOIN public.devices d ON s.device_id = d.id
        WHERE d.user_id = p_user_id AND session_end >= CURRENT_DATE - INTERVAL '112 days'
        GROUP BY session_end::DATE
    ) max_calc;

    IF v_max_earned = 0 THEN v_max_earned := 1; END IF;

    -- 2. Return a complete grid (so UI doesn't have to fill missing dates)
    RETURN QUERY
    WITH date_series AS (
        SELECT (CURRENT_DATE - (111 - generate_series(0, 111))::INTEGER) AS ddate
    ),
    daily_stats AS (
        SELECT 
            session_end::DATE as ddate,
            SUM(nrt_awarded) as total_nrt
        FROM public.device_data_sessions s
        JOIN public.devices d ON s.device_id = d.id
        WHERE d.user_id = p_user_id AND session_end >= CURRENT_DATE - INTERVAL '112 days'
        GROUP BY session_end::DATE
    )
    SELECT 
        ds.ddate as activity_date,
        COALESCE(st.total_nrt, 0) as nrt_earned,
        CASE
            WHEN COALESCE(st.total_nrt, 0) = 0 THEN 0
            WHEN COALESCE(st.total_nrt, 0) < (v_max_earned * 0.25) THEN 1
            WHEN COALESCE(st.total_nrt, 0) < (v_max_earned * 0.50) THEN 2
            WHEN COALESCE(st.total_nrt, 0) < (v_max_earned * 0.75) THEN 3
            ELSE 4
        END as intensity
    FROM date_series ds
    LEFT JOIN daily_stats st ON ds.ddate = st.ddate
    ORDER BY ds.ddate ASC;
END;
$$;

-- SP Platform Activity Heatmap
CREATE OR REPLACE FUNCTION get_sp_platform_activity_heatmap(p_sp_id UUID)
RETURNS TABLE (
    activity_date DATE,
    nrt_distributed NUMERIC,
    intensity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_distributed NUMERIC;
BEGIN
    SELECT COALESCE(MAX(daily_nrt), 1) INTO v_max_distributed
    FROM (
        SELECT SUM(nrt_awarded) as daily_nrt
        FROM public.device_data_sessions s
        JOIN public.campaigns c ON s.campaign_id = c.id
        WHERE c.sp_id = p_sp_id AND session_end >= CURRENT_DATE - INTERVAL '112 days'
        GROUP BY session_end::DATE
    ) max_calc;

    IF v_max_distributed = 0 THEN v_max_distributed := 1; END IF;

    RETURN QUERY
    WITH date_series AS (
        SELECT (CURRENT_DATE - (111 - generate_series(0, 111))::INTEGER) AS ddate
    ),
    daily_stats AS (
        SELECT 
            session_end::DATE as ddate,
            SUM(nrt_awarded) as total_nrt
        FROM public.device_data_sessions s
        JOIN public.campaigns c ON s.campaign_id = c.id
        WHERE c.sp_id = p_sp_id AND session_end >= CURRENT_DATE - INTERVAL '112 days'
        GROUP BY session_end::DATE
    )
    SELECT 
        ds.ddate as activity_date,
        COALESCE(st.total_nrt, 0) as nrt_distributed,
        CASE
            WHEN COALESCE(st.total_nrt, 0) = 0 THEN 0
            WHEN COALESCE(st.total_nrt, 0) < (v_max_distributed * 0.25) THEN 1
            WHEN COALESCE(st.total_nrt, 0) < (v_max_distributed * 0.50) THEN 2
            WHEN COALESCE(st.total_nrt, 0) < (v_max_distributed * 0.75) THEN 3
            ELSE 4
        END as intensity
    FROM date_series ds
    LEFT JOIN daily_stats st ON ds.ddate = st.ddate
    ORDER BY ds.ddate ASC;
END;
$$;

-- ISP Network Activity Heatmap
CREATE OR REPLACE FUNCTION get_isp_network_activity_heatmap(p_isp_id UUID)
RETURNS TABLE (
    activity_date DATE,
    data_consumed_gb NUMERIC,
    intensity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_max_data NUMERIC;
BEGIN
    SELECT COALESCE(MAX(daily_data), 1) INTO v_max_data
    FROM (
        SELECT SUM(bytes_up + bytes_down)::NUMERIC / 1e9 as daily_data
        FROM public.device_data_sessions s
        JOIN public.campaigns c ON s.campaign_id = c.id
        WHERE c.isp_id = p_isp_id AND session_end >= CURRENT_DATE - INTERVAL '112 days'
        GROUP BY session_end::DATE
    ) max_calc;

    IF v_max_data = 0 THEN v_max_data := 1; END IF;

    RETURN QUERY
    WITH date_series AS (
        SELECT (CURRENT_DATE - (111 - generate_series(0, 111))::INTEGER) AS ddate
    ),
    daily_stats AS (
        SELECT 
            session_end::DATE as ddate,
            SUM(bytes_up + bytes_down)::NUMERIC / 1e9 as total_data
        FROM public.device_data_sessions s
        JOIN public.campaigns c ON s.campaign_id = c.id
        WHERE c.isp_id = p_isp_id AND session_end >= CURRENT_DATE - INTERVAL '112 days'
        GROUP BY session_end::DATE
    )
    SELECT 
        ds.ddate as activity_date,
        COALESCE(st.total_data, 0) as data_consumed_gb,
        CASE
            WHEN COALESCE(st.total_data, 0) = 0 THEN 0
            WHEN COALESCE(st.total_data, 0) < (v_max_data * 0.25) THEN 1
            WHEN COALESCE(st.total_data, 0) < (v_max_data * 0.50) THEN 2
            WHEN COALESCE(st.total_data, 0) < (v_max_data * 0.75) THEN 3
            ELSE 4
        END as intensity
    FROM date_series ds
    LEFT JOIN daily_stats st ON ds.ddate = st.ddate
    ORDER BY ds.ddate ASC;
END;
$$;
