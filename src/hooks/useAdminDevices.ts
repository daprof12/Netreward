import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface AdminDeviceView {
  id: string;
  device_id: string;
  campaign_id: string;
  bytes_up: number;
  bytes_down: number;
  nrt_awarded: number;
  session_start: string;
  session_end: string;
  device: {
    device_name: string;
    device_type: string;
    os: string;
    status: string;
    isp_name: string;
    country: string;
    users?: { display_name: string | null; email: string };
  };
  campaign: {
    title: string;
    service?: { name: string };
  };
}

export function useSpDevices() {
  const { user } = useAuthStore();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sp_device_sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Step 1: Get all campaigns owned by this SP user
      const { data: spCampaignRows } = await supabase
        .from('campaigns')
        .select('id, title, service:services(name)')
        .eq('sp_id', user.id);

      const campaignIds = (spCampaignRows || []).map((c: any) => c.id);
      if (campaignIds.length === 0) return [];

      const campaignInfoMap: Record<string, any> = {};
      for (const c of spCampaignRows || []) campaignInfoMap[c.id] = c;

      // Step 2: Get enrolled users for those campaigns
      const { data: enrollments } = await supabase
        .from('user_campaigns')
        .select('user_id, campaign_id')
        .in('campaign_id', campaignIds);

      if (!enrollments?.length) return [];

      const userCampaignMap: Record<string, any> = {};
      for (const e of enrollments) {
        if (!userCampaignMap[e.user_id]) userCampaignMap[e.user_id] = campaignInfoMap[e.campaign_id];
      }

      const enrolledUserIds = Object.keys(userCampaignMap);

      // Step 3: Get devices for those users
      const { data: deviceRows, error } = await supabase
        .from('devices')
        .select('*, users(display_name, email)')
        .in('user_id', enrolledUserIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Step 4: Aggregate telemetry per device
      const deviceIds = (deviceRows || []).map((d: any) => d.id);
      const sessionSumMap: Record<string, { bytes_up: number; bytes_down: number; nrt_awarded: number }> = {};

      if (deviceIds.length > 0) {
        const { data: telemetry } = await supabase
          .from('device_data_sessions')
          .select('device_id, bytes_up, bytes_down, nrt_awarded')
          .in('device_id', deviceIds);

        for (const t of telemetry || []) {
          if (!sessionSumMap[t.device_id]) sessionSumMap[t.device_id] = { bytes_up: 0, bytes_down: 0, nrt_awarded: 0 };
          sessionSumMap[t.device_id].bytes_up += t.bytes_up || 0;
          sessionSumMap[t.device_id].bytes_down += t.bytes_down || 0;
          sessionSumMap[t.device_id].nrt_awarded += t.nrt_awarded || 0;
        }
      }

      // Step 5: Return unified shape
      return (deviceRows || []).map((d: any) => {
        const camp = userCampaignMap[d.user_id];
        const tel = sessionSumMap[d.id] || { bytes_up: 0, bytes_down: 0, nrt_awarded: 0 };
        const serviceObj = camp?.service ? (Array.isArray(camp.service) ? camp.service[0] : camp.service) : null;
        return {
          id: d.id,
          device_id: d.id,
          campaign_id: camp?.id || null,
          bytes_up: tel.bytes_up,
          bytes_down: tel.bytes_down,
          nrt_awarded: tel.nrt_awarded,
          session_start: d.created_at,
          session_end: d.updated_at || d.created_at,
          device: { device_name: d.device_name, device_type: d.device_type, os: d.os, status: d.status, isp_name: d.isp_name, country: d.country, users: d.users },
          campaign: camp ? { title: camp.title, service: serviceObj } : null
        };
      }) as unknown as AdminDeviceView[];
    },
    enabled: !!user,
  });

  return { sessions, isLoading };
}

export function useIspDevices() {
  const { user } = useAuthStore();

  const { data: devices, isLoading } = useQuery({
    queryKey: ['isp_devices', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Query all devices with their owner info and any telemetry sessions
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          users(id, display_name, email),
          device_data_sessions(
            campaign:campaigns(title)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each device, if no telemetry session has a campaign, look up
      // the device owner's enrolled campaigns via user_campaigns
      const ownerIds = [...new Set((data || []).map((d: any) => d.users?.id || d.user_id).filter(Boolean))];
      let enrollmentMap: Record<string, string> = {};

      if (ownerIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('user_campaigns')
          .select('user_id, campaign:campaigns(title)')
          .in('user_id', ownerIds);

        for (const e of enrollments || []) {
          const campaignObj = Array.isArray(e.campaign) ? e.campaign[0] : e.campaign;
          if (!enrollmentMap[e.user_id] && campaignObj?.title) {
            enrollmentMap[e.user_id] = campaignObj.title;
          }
        }
      }

      // Attach enrolled campaign title as fallback to each device
      return (data || []).map((d: any) => ({
        ...d,
        _enrolled_campaign_title: enrollmentMap[d.users?.id || d.user_id] || null
      }));
    },
    enabled: !!user,
  });

  return { devices, isLoading };
}
