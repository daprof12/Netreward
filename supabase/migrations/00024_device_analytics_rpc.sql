-- Migration: Device Analytics RPCs
-- Created: 2026-05-01

-- 1. Aggregated Analytics for User Dashboard (Devices.tsx)
CREATE OR REPLACE FUNCTION get_user_device_stats(p_user_id UUID, p_time_filter TEXT)
RETURNS TABLE (
  time_label TEXT,
  data_gb NUMERIC,
  nrt_earned NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
BEGIN
  -- Determine time window
  IF p_time_filter = '24H' THEN
    v_start_time := now() - INTERVAL '24 hours';
    RETURN QUERY
    SELECT 
      to_char(date_trunc('hour', session_end), 'HH24:00') as time_label,
      COALESCE(SUM(bytes_up + bytes_down)::NUMERIC / 1e9, 0) as data_gb,
      COALESCE(SUM(nrt_awarded), 0) as nrt_earned
    FROM public.device_data_sessions s
    JOIN public.devices d ON s.device_id = d.id
    WHERE d.user_id = p_user_id AND s.session_end >= v_start_time
    GROUP BY date_trunc('hour', session_end)
    ORDER BY date_trunc('hour', session_end);

  ELSIF p_time_filter = '7D' THEN
    v_start_time := now() - INTERVAL '7 days';
    RETURN QUERY
    SELECT 
      to_char(date_trunc('day', session_end), 'Dy') as time_label,
      COALESCE(SUM(bytes_up + bytes_down)::NUMERIC / 1e9, 0) as data_gb,
      COALESCE(SUM(nrt_awarded), 0) as nrt_earned
    FROM public.device_data_sessions s
    JOIN public.devices d ON s.device_id = d.id
    WHERE d.user_id = p_user_id AND s.session_end >= v_start_time
    GROUP BY date_trunc('day', session_end)
    ORDER BY date_trunc('day', session_end);

  ELSIF p_time_filter = '1M' THEN
    v_start_time := now() - INTERVAL '1 month';
    RETURN QUERY
    SELECT 
      'W' || to_char(session_end, 'W') as time_label,
      COALESCE(SUM(bytes_up + bytes_down)::NUMERIC / 1e9, 0) as data_gb,
      COALESCE(SUM(nrt_awarded), 0) as nrt_earned
    FROM public.device_data_sessions s
    JOIN public.devices d ON s.device_id = d.id
    WHERE d.user_id = p_user_id AND s.session_end >= v_start_time
    GROUP BY date_trunc('week', session_end), to_char(session_end, 'W')
    ORDER BY date_trunc('week', session_end);

  ELSE -- ALL
    RETURN QUERY
    SELECT 
      to_char(date_trunc('month', session_end), 'Mon') as time_label,
      COALESCE(SUM(bytes_up + bytes_down)::NUMERIC / 1e9, 0) as data_gb,
      COALESCE(SUM(nrt_awarded), 0) as nrt_earned
    FROM public.device_data_sessions s
    JOIN public.devices d ON s.device_id = d.id
    WHERE d.user_id = p_user_id
    GROUP BY date_trunc('month', session_end)
    ORDER BY date_trunc('month', session_end);
  END IF;
END;
$$;


-- 2. Breakdown of Data Usage by Campaign/App for a specific Device (DeviceDetail.tsx)
DROP FUNCTION IF EXISTS get_device_app_usage(UUID);

CREATE OR REPLACE FUNCTION get_device_app_usage(p_device_id UUID)
RETURNS TABLE (
  campaign_id UUID,
  app_name TEXT,
  service_category TEXT,
  duration_seconds BIGINT,
  total_data_gb NUMERIC,
  nrt_earned NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.title as app_name,
    COALESCE(svc.category, 'Network') as service_category,
    COALESCE(SUM(s.duration_seconds), 0)::BIGINT as duration_seconds,
    COALESCE(SUM(s.bytes_up + s.bytes_down)::NUMERIC / 1e9, 0) as total_data_gb,
    COALESCE(SUM(s.nrt_awarded), 0) as nrt_earned,
    c.status::TEXT as status
  FROM public.device_data_sessions s
  JOIN public.campaigns c ON s.campaign_id = c.id
  LEFT JOIN public.services svc ON c.service_id = svc.id
  WHERE s.device_id = p_device_id
  GROUP BY c.id, c.title, svc.category, c.status
  ORDER BY nrt_earned DESC;
END;
$$;
