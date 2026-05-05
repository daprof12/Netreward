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
          nrt_earned: Number(en.nrt_earned || 0),
          status: en.status
        })), chartData: [], totalUsers: simpleEnrollments.length };
      }

      const participants = await Promise.all((enrollments || []).map(async (en: any) => {
        const { data: devices } = await supabase
          .from('devices')
          .select('device_name, device_type, country')
          .eq('user_id', en.user_id)
          .limit(1);

        const device = devices?.[0] || { device_name: 'Unknown Device', device_type: 'phone', country: 'Unknown' };

        return {
          user_id: en.user_id,
          email: (en.users as any)?.display_name || (en.users as any)?.email || 'Unknown',
          device_name: device.device_name,
          device_type: device.device_type,
          country: device.country,
          data_consumed_gb: Number(en.data_consumed_gb || 0),
          nrt_earned: Number(en.nrt_earned || 0),
          status: en.status
        } as CampaignParticipant;
      }));

      // 2. Fetch pre-aggregated daily stats for chart (last 7 days)
      const { data: stats, error: statsError } = await supabase
        .from('campaign_daily_stats')
        .select('date, total_nrt_distributed, total_users_reached')
        .eq('campaign_id', campaignId)
        .order('date', { ascending: true })
        .limit(7);

      if (statsError) {
        console.error('Error fetching campaign stats:', statsError);
      }

      // Group and normalize for Recharts
      const dailyMap: Record<string, ChartData> = {};
      
      // Initialize last 7 days with zeros
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        dailyMap[dateStr] = { 
          date: d.toLocaleDateString(undefined, { weekday: 'short' }), 
          nrt: 0, 
          users: 0 
        };
      }

      // Fill in real data
      stats?.forEach(s => {
        if (dailyMap[s.date]) {
          dailyMap[s.date].nrt = Number(s.total_nrt_distributed || 0);
          dailyMap[s.date].users = Number(s.total_users_reached || 0);
        }
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
