-- Migration: Analytics Views
-- Created: 2026-05-01

-- 1. Campaign Daily Stats View for SP Dashboard
CREATE OR REPLACE VIEW public.campaign_daily_stats AS
SELECT
  DATE(s.session_end) as date,
  c.sp_id as provider_id,
  COUNT(DISTINCT d.user_id) as total_users_reached,
  SUM(s.bytes_up + s.bytes_down) as total_data_bytes,
  SUM(s.nrt_awarded) as total_nrt_distributed
FROM public.device_data_sessions s
JOIN public.campaigns c ON s.campaign_id = c.id
JOIN public.devices d ON s.device_id = d.id
GROUP BY DATE(s.session_end), c.sp_id;

-- Ensure SPs can query this view via RLS wrapper or grant
GRANT SELECT ON public.campaign_daily_stats TO authenticated;

-- 2. ISP Network Stats View for ISP Dashboard
CREATE OR REPLACE VIEW public.isp_network_stats AS
SELECT
  DATE(s.session_end) as date,
  n.isp_id as isp_id,
  50 as avg_latency_ms, -- Mock metric for now
  1 as packet_loss_percentage, -- Mock metric for now
  SUM(s.bytes_up + s.bytes_down) as total_traffic_bytes,
  COUNT(DISTINCT d.user_id) as active_users
FROM public.device_data_sessions s
JOIN public.devices d ON s.device_id = d.id
JOIN public.isp_networks n ON d.isp_name = n.name
GROUP BY DATE(s.session_end), n.isp_id;

GRANT SELECT ON public.isp_network_stats TO authenticated;
