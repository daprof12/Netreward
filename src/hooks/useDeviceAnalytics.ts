import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import NrtAmount from '@/components/ui/NrtAmount';

export type TimeFilter = '24H' | '7D' | '1M' | 'ALL';

export interface UserDeviceStat {
  time_label: string;
  data_gb: number;
  nrt_earned: number;
}

export interface DeviceAppUsage {
  campaign_id: string;
  app_name: string;
  service_category: string;
  duration_seconds: number;
  total_data_gb: number;
  nrt_earned: number;
  status: string;
}

export function useUserDeviceStats(timeFilter: TimeFilter) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['user_device_stats', user?.id, timeFilter],
    queryFn: async () => {
      if (!user) return { chartData: [], summary: { totalData: '0 GB', totalNrt: '0.00 NRT' } };

      const { data, error } = await supabase.rpc('get_user_device_stats', {
        p_user_id: user.id,
        p_time_filter: timeFilter,
      });

      if (error) throw error;

      // Ensure we have an array
      const rawData = (data as any[]) || [];

      // Calculate summaries
      let totalData = 0;
      let totalNrt = 0;

      const chartData = rawData.map(d => {
        const data_gb = Number(d.data_gb || 0);
        const nrt_earned = Number(d.nrt_earned || 0);
        totalData += data_gb;
        totalNrt += nrt_earned;

        return {
          time: d.time_label,
          data: data_gb,
          nrt: nrt_earned
        };
      });

      return {
        chartData,
        summary: {
          totalData: `${totalData.toFixed(2)} GB`,
          totalNrt: `$<NrtAmount value={totalNrt} />`
        }
      };
    },
    enabled: !!user,
  });
}

export function useDeviceAppUsage(deviceId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['device_app_usage', deviceId],
    queryFn: async () => {
      if (!user || !deviceId) return [];

      const { data, error } = await supabase.rpc('get_device_app_usage', {
        p_device_id: deviceId,
      });

      if (error) throw error;
      return (data as DeviceAppUsage[]) || [];
    },
    enabled: !!user && !!deviceId,
  });
}

/** Per-device aggregated stats (total data + NRT) for display in device list cards */
export interface DeviceSummary {
  device_id: string;
  total_data_gb: number;
  total_nrt_earned: number;
  session_count: number;
}

export function useDeviceSummaries() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['device_summaries', user?.id],
    queryFn: async () => {
      if (!user) return {};

      const { data, error } = await supabase
        .from('device_data_sessions')
        .select('device_id, bytes_up, bytes_down, nrt_awarded')
        .in('device_id', (
          await supabase
            .from('devices')
            .select('id')
            .eq('user_id', user.id)
        ).data?.map(d => d.id) || []);

      if (error) throw error;

      // Aggregate per device
      const map: Record<string, DeviceSummary> = {};
      for (const row of (data || [])) {
        if (!map[row.device_id]) {
          map[row.device_id] = { device_id: row.device_id, total_data_gb: 0, total_nrt_earned: 0, session_count: 0 };
        }
        map[row.device_id].total_data_gb += (Number(row.bytes_up || 0) + Number(row.bytes_down || 0)) / 1e9;
        map[row.device_id].total_nrt_earned += Number(row.nrt_awarded || 0);
        map[row.device_id].session_count += 1;
      }
      return map;
    },
    enabled: !!user,
  });
}

/** Fetch a single device's details by ID */
export function useDeviceById(deviceId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      if (!user || !deviceId) return null;

      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', deviceId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!deviceId,
  });
}
