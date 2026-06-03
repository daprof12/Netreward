import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// v1.0.1 - Fixed column mapping
export interface CampaignParticipant {
  user_id: string;
  email: string;
  device_name: string;
  device_type: string;
  country: string;
  data_consumed_gb: number;
  nrt_earned: number;
  status: string;
}

export interface ChartData {
  date: string;
  nrt: number;
  users: number;
}

export function useCampaignAnalytics(campaignId: string) {
  return useQuery({
    queryKey: ['campaign_analytics', campaignId],
    queryFn: async () => {
      if (!campaignId) return { participants: [], chartData: [], totalUsers: 0 };

      // 1. Fetch participants (with explicit join to avoid 400)
      const { data: enrollments, error: enrollError } = await supabase
        .from('user_campaigns')
        .select(`
          user_id,
          data_consumed_gb,
          nrt_earned,
          unclaimed_nrt,
          status,
          users (
            email,
            display_name
          )
        `)
        .eq('campaign_id', campaignId);

      if (enrollError) {
        console.error('Error fetching enrollments for analytics:', enrollError);
        // If join fails, try a simple select
        const { data: simpleEnrollments } = await supabase
          .from('user_campaigns')
          .select('*')
          .eq('campaign_id', campaignId);
        
        if (!simpleEnrollments) return { participants: [], chartData: [], totalUsers: 0 };
        // We'll proceed with limited user info if join fails
        return { participants: (simpleEnrollments || []).map(en => ({
          user_id: en.user_id,
          email: 'Participant',
          device_name: 'Device',
          device_type: 'phone',
          country: 'Unknown',
          data_consumed_gb: Number(en.data_consumed_gb || 0),
          nrt_earned: Number(en.nrt_earned || 0) + Number(en.unclaimed_nrt || 0),
          status: en.status
        })), chartData: [], totalUsers: simpleEnrollments.length };
      }

      const participants = await Promise.all((enrollments || []).map(async (en: any) => {
        const { data: devices } = await supabase
          .from('devices')
          .select('device_name, device_type, country, status, updated_at, created_at')
          .eq('user_id', en.user_id)
          .limit(1);

        const device = devices?.[0] || { device_name: 'Unknown Device', device_type: 'phone', country: 'Unknown', status: 'offline', updated_at: null, created_at: null };

        let deviceStatus = 'offline';
        if (device.status !== 'offline' && device.status !== 'disconnected') {
          const timeStr = device.updated_at || device.created_at;
          if (timeStr) {
            const diffMin = (Date.now() - new Date(timeStr).getTime()) / 60000;
            if (diffMin < 5) {
              deviceStatus = 'active';
            } else if (diffMin < 15) {
              deviceStatus = 'idle';
            }
          }
        }

        return {
          user_id: en.user_id,
          email: (en.users as any)?.display_name || (en.users as any)?.email || 'Unknown',
          device_name: device.device_name,
          device_type: device.device_type,
          country: device.country,
          data_consumed_gb: Number(en.data_consumed_gb || 0),
          nrt_earned: Number(en.nrt_earned || 0) + Number(en.unclaimed_nrt || 0),
          status: deviceStatus
        } as CampaignParticipant;
      }));

      // 2. Fetch raw sessions to build the chart (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: stats, error: statsError } = await supabase
        .from('device_data_sessions')
        .select('session_end, nrt_awarded, device_id')
        .eq('campaign_id', campaignId)
        .gte('session_end', sevenDaysAgo.toISOString());

      if (statsError) {
        console.error('Error fetching campaign stats:', statsError);
      }

      // Group and normalize for Recharts
      const dailyMap: Record<string, ChartData> = {};
      const uniqueUsersPerDay: Record<string, Set<string>> = {};
      
      // Initialize last 7 days with zeros
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        dailyMap[dateStr] = { 
          date: d.toLocaleDateString(undefined, { weekday: 'short' }), 
          nrt: 0, 
          users: 0 
        };
        uniqueUsersPerDay[dateStr] = new Set();
      }

      // Fill in real data
      stats?.forEach(s => {
        if (!s.session_end) return;
        const dateStr = s.session_end.split('T')[0];
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].nrt += Number(s.nrt_awarded || 0);
          if (s.device_id) uniqueUsersPerDay[dateStr].add(s.device_id);
        }
      });

      // Assign unique users count
      Object.keys(dailyMap).forEach(dateStr => {
        dailyMap[dateStr].users = uniqueUsersPerDay[dateStr]?.size || 0;
      });

      const chartData = Object.values(dailyMap);

      return {
        participants,
        chartData,
        totalUsers: participants.length
      };
    },
    enabled: !!campaignId,
    staleTime: 1000 * 60 * 5,
  });
}
