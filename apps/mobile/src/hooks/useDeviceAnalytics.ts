import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

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
      if (!user) return { chartData: [], summary: { totalData: 0, totalNrt: 0 } };

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
          totalData,
          totalNrt
        }
      };
    },
    enabled: !!user,
  });
}

export function useDeviceAppUsage(deviceId: string, timeFilter: TimeFilter = 'ALL') {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['device_app_usage', deviceId, timeFilter],
    queryFn: async () => {
      if (!user || !deviceId) return [];

      let query = supabase
        .from('device_data_sessions')
        .select(`
          duration_seconds,
          bytes_up,
          bytes_down,
          nrt_awarded,
          session_end,
          campaign_id,
          campaign:campaigns (
            id,
            title,
            status,
            service:services (
              category
            )
          )
        `)
        .eq('device_id', deviceId);

      if (timeFilter !== 'ALL') {
        const date = new Date();
        if (timeFilter === '24H') date.setHours(date.getHours() - 24);
        else if (timeFilter === '7D') date.setDate(date.getDate() - 7);
        else if (timeFilter === '1M') date.setMonth(date.getMonth() - 1);
        query = query.gte('session_end', date.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const aggregated = new Map<string, DeviceAppUsage>();

      for (const row of (data || [])) {
        const camp = Array.isArray(row.campaign) ? row.campaign[0] : row.campaign;
        if (!camp) continue;
        const svc = Array.isArray(camp.service) ? camp.service[0] : camp.service;
        
        const cid = camp.id;
        if (!aggregated.has(cid)) {
          aggregated.set(cid, {
            campaign_id: cid,
            app_name: camp.title,
            service_category: svc?.category || 'Network',
            duration_seconds: 0,
            total_data_gb: 0,
            nrt_earned: 0,
            status: camp.status
          });
        }
        
        const acc = aggregated.get(cid)!;
        acc.duration_seconds += Number(row.duration_seconds || 0);
        acc.total_data_gb += (Number(row.bytes_up || 0) + Number(row.bytes_down || 0)) / 1e9;
        acc.nrt_earned += Number(row.nrt_awarded || 0);
      }

      return Array.from(aggregated.values()).sort((a, b) => b.nrt_earned - a.nrt_earned);
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

export function useDeviceSummaries(timeFilter: TimeFilter = 'ALL') {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['device_summaries', user?.id, timeFilter],
    queryFn: async () => {
      if (!user) return {};

      let query = supabase
        .from('device_data_sessions')
        .select('device_id, bytes_up, bytes_down, nrt_awarded, session_end')
        .in('device_id', (
          await supabase
            .from('devices')
            .select('id')
            .eq('user_id', user.id)
        ).data?.map(d => d.id) || []);

      if (timeFilter !== 'ALL') {
        const date = new Date();
        if (timeFilter === '24H') date.setHours(date.getHours() - 24);
        else if (timeFilter === '7D') date.setDate(date.getDate() - 7);
        else if (timeFilter === '1M') date.setMonth(date.getMonth() - 1);
        query = query.gte('session_end', date.toISOString());
      }

      const { data, error } = await query;

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
