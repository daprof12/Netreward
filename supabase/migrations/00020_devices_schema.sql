-- Migration: Devices Schema & Data Tracking
-- Created: 2026-05-01

-- 1. Drop existing tables if they exist to prevent errors during local dev resets
DROP TABLE IF EXISTS public.device_data_sessions CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;

-- 2. Devices Table
CREATE TABLE public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('phone', 'laptop', 'tablet', 'desktop', 'other')),
    os TEXT,
    mac_address TEXT,
    ip_address TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'offline', 'disconnected')),
    country TEXT,
    isp_name TEXT,
    signal_strength INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Device Data Sessions (Tracking Payload)
CREATE TABLE public.device_data_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT UNIQUE NOT NULL, -- Client-generated nonce for deduplication
    bytes_up BIGINT DEFAULT 0,
    bytes_down BIGINT DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    nrt_awarded NUMERIC(18, 9) DEFAULT 0.000000000,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Row Level Security (RLS)

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_data_sessions ENABLE ROW LEVEL SECURITY;

-- Device RLS: Users can view and manage their own devices
DROP POLICY IF EXISTS "Users can view own devices" ON public.devices;
CREATE POLICY "Users can view own devices" ON public.devices 
FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own devices" ON public.devices;
CREATE POLICY "Users can insert own devices" ON public.devices 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own devices" ON public.devices;
CREATE POLICY "Users can update own devices" ON public.devices 
FOR UPDATE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can delete own devices" ON public.devices;
CREATE POLICY "Users can delete own devices" ON public.devices 
FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- SP and ISP can view devices linked to their campaigns (via sessions)
CREATE POLICY "SP can view devices in their campaigns" ON public.devices 
FOR SELECT USING (
    id IN (
        SELECT dds.device_id FROM public.device_data_sessions dds
        JOIN public.campaigns c ON dds.campaign_id = c.id
        JOIN public.sp_profiles sp ON c.sp_id = sp.id
        WHERE sp.user_id = auth.uid()
    )
);

-- Session RLS: Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON public.device_data_sessions 
FOR SELECT USING (
    device_id IN (SELECT id FROM public.devices WHERE user_id = auth.uid())
);

-- SP can view sessions for their campaigns
CREATE POLICY "SP can view own campaign sessions" ON public.device_data_sessions 
FOR SELECT USING (
    campaign_id IN (
        SELECT id FROM public.campaigns 
        WHERE sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid())
    )
);

-- 5. Triggers
CREATE TRIGGER update_devices_modtime 
BEFORE UPDATE ON public.devices 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
