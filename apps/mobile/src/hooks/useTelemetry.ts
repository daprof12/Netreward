import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';

// Heatmap Data Type
export interface HeatmapData {
  activity_date: string;
  intensity: number;
  value: number; // Represents nrt_earned, nrt_distributed, or data_consumed_gb
}

// SP Telemetry Type
export interface SpTelemetry {
  date: string;
  country: string;
  device_type: string;
  interest_category: string;
  views: number;
  conversions: number;
  total_cost_nrt: number;
  avg_duration_seconds: number;
}

// ISP Telemetry Type
export interface IspTelemetry {
  date: string;
  node_name: string;
  avg_latency_ms: number;
  packet_loss_pct: number;
  uptime_pct: number;
  active_users: number;
}

export function useTelemetry() {
  const { user, profile, active_role } = useAuthStore();
  const spProfileId = useSpStore(state => state.profileId);
  const ispProfileId = useIspStore(state => state.profileId);

  // 1. User Earnings Heatmap
  const { data: userHeatmap, isLoading: isUserHeatmapLoading } = useQuery({
    queryKey: ['userHeatmap', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .rpc('get_user_earnings_heatmap', { p_user_id: profile.id });
      if (error) throw error;
      return data?.map((d: any) => ({
        activity_date: d.activity_date,
        intensity: d.intensity,
        value: d.nrt_earned
      })) as HeatmapData[];
    },
    enabled: !!profile?.id,
  });

  // 2. SP Platform Activity Heatmap
  const { data: spHeatmap, isLoading: isSpHeatmapLoading } = useQuery({
    queryKey: ['spHeatmap', spProfileId, active_role],
    queryFn: async () => {
      if (!spProfileId || active_role !== 'sp') return [];
      const { data, error } = await supabase
        .rpc('get_sp_platform_activity_heatmap', { p_sp_id: spProfileId });
      if (error) throw error;
      return data?.map((d: any) => ({
        activity_date: d.activity_date,
        intensity: d.intensity,
        value: d.nrt_distributed
      })) as HeatmapData[];
    },
    enabled: !!profile?.id && !!spProfileId && active_role === 'sp',
  });

  // 3. ISP Network Activity Heatmap
  const { data: ispHeatmap, isLoading: isIspHeatmapLoading } = useQuery({
    queryKey: ['ispHeatmap', ispProfileId, active_role],
    queryFn: async () => {
      if (!ispProfileId || active_role !== 'isp') return [];
      const { data, error } = await supabase
        .rpc('get_isp_network_activity_heatmap', { p_isp_id: ispProfileId });
      if (error) throw error;
      return data?.map((d: any) => ({
        activity_date: d.activity_date,
        intensity: d.intensity,
        value: d.data_consumed_gb
      })) as HeatmapData[];
    },
    enabled: !!profile?.id && !!ispProfileId && active_role === 'isp',
  });

  // 4. SP Telemetry (Audience Insights & ROI) — derived from device_data_sessions via RPC
  const { data: spTelemetry, isLoading: isSpTelemetryLoading } = useQuery({
    queryKey: ['spTelemetry', spProfileId, active_role],
    queryFn: async () => {
      if (!spProfileId || active_role !== 'sp') return [];
      const { data, error } = await supabase
        .rpc('get_sp_telemetry_insights', {
          p_sp_id: spProfileId,
          p_days: 30
        });
      if (error) throw error;
      return data as SpTelemetry[];
    },
    enabled: !!profile?.id && !!spProfileId && active_role === 'sp',
  });

  // 5. ISP Telemetry (Network Health) — derived from device_data_sessions via RPC
  const { data: ispTelemetry, isLoading: isIspTelemetryLoading } = useQuery({
    queryKey: ['ispTelemetry', ispProfileId, active_role],
    queryFn: async () => {
      if (!ispProfileId || active_role !== 'isp') return [];
      const { data, error } = await supabase
        .rpc('get_isp_telemetry_insights', {
          p_isp_id: ispProfileId,
          p_days: 30
        });
      if (error) throw error;
      return data as IspTelemetry[];
    },
    enabled: !!profile?.id && !!ispProfileId && active_role === 'isp',
  });

  return {
    userHeatmap,
    isUserHeatmapLoading,
    spHeatmap,
    isSpHeatmapLoading,
    ispHeatmap,
    isIspHeatmapLoading,
    spTelemetry,
    isSpTelemetryLoading,
    ispTelemetry,
    isIspTelemetryLoading
  };
}
