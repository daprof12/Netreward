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
  const { user, role } = useAuthStore();
  const { profile: spProfile } = useSpStore();
  const { profile: ispProfile } = useIspStore();

  // 1. User Earnings Heatmap
  const { data: userHeatmap, isLoading: isUserHeatmapLoading } = useQuery({
    queryKey: ['userHeatmap', user?.id],
    queryFn: async () => {
      if (!user?.id || role !== 'user') return [];
      const { data, error } = await supabase
        .rpc('get_user_earnings_heatmap', { p_user_id: user.id });
      if (error) throw error;
      return data?.map((d: any) => ({
        activity_date: d.activity_date,
        intensity: d.intensity,
        value: d.nrt_earned
      })) as HeatmapData[];
    },
    enabled: !!user?.id && role === 'user',
  });

  // 2. SP Platform Activity Heatmap
  const { data: spHeatmap, isLoading: isSpHeatmapLoading } = useQuery({
    queryKey: ['spHeatmap', spProfile?.id],
    queryFn: async () => {
      if (!spProfile?.id || role !== 'sp') return [];
      const { data, error } = await supabase
        .rpc('get_sp_platform_activity_heatmap', { p_sp_id: spProfile.id });
      if (error) throw error;
      return data?.map((d: any) => ({
        activity_date: d.activity_date,
        intensity: d.intensity,
        value: d.nrt_distributed
      })) as HeatmapData[];
    },
    enabled: !!spProfile?.id && role === 'sp',
  });

  // 3. ISP Network Activity Heatmap
  const { data: ispHeatmap, isLoading: isIspHeatmapLoading } = useQuery({
    queryKey: ['ispHeatmap', ispProfile?.id],
    queryFn: async () => {
      if (!ispProfile?.id || role !== 'isp') return [];
      const { data, error } = await supabase
        .rpc('get_isp_network_activity_heatmap', { p_isp_id: ispProfile.id });
      if (error) throw error;
      return data?.map((d: any) => ({
        activity_date: d.activity_date,
        intensity: d.intensity,
        value: d.data_consumed_gb
      })) as HeatmapData[];
    },
    enabled: !!ispProfile?.id && role === 'isp',
  });

  // 4. SP Telemetry (Audience Insights & ROI)
  const { data: spTelemetry, isLoading: isSpTelemetryLoading } = useQuery({
    queryKey: ['spTelemetry', spProfile?.id],
    queryFn: async () => {
      if (!spProfile?.id || role !== 'sp') return [];
      const { data, error } = await supabase
        .from('sp_telemetry')
        .select('*')
        .eq('sp_id', spProfile.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });
      if (error) throw error;
      return data as SpTelemetry[];
    },
    enabled: !!spProfile?.id && role === 'sp',
  });

  // 5. ISP Telemetry (Network Health)
  const { data: ispTelemetry, isLoading: isIspTelemetryLoading } = useQuery({
    queryKey: ['ispTelemetry', ispProfile?.id],
    queryFn: async () => {
      if (!ispProfile?.id || role !== 'isp') return [];
      const { data, error } = await supabase
        .from('isp_telemetry')
        .select('*')
        .eq('isp_id', ispProfile.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });
      if (error) throw error;
      return data as IspTelemetry[];
    },
    enabled: !!ispProfile?.id && role === 'isp',
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
