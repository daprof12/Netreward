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
    updated_at?: string;
    created_at?: string;
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

      // Step 1: Get SP Profile ID
      const { data: spProfile } = await supabase
        .from('sp_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      const spProfileId = spProfile?.id;
      if (!spProfileId) return [];

      // Step 2: Get all campaigns owned by this SP user
      const { data: spCampaignRows } = await supabase
        .from('campaigns')
        .select('id, title, service:services(name)')
        .eq('sp_id', spProfileId);

      const campaignIds = (spCampaignRows || []).map((c: any) => c.id);
      if (campaignIds.length === 0) return [];

      const campaignInfoMap: Record<string, any> = {};
      for (const c of spCampaignRows || []) campaignInfoMap[c.id] = c;

      // Step 2: Get enrolled users for those campaigns
      const { data: enrollments } = await supabase
        .from('user_campaigns')
        .select('user_id, campaign_id')
        .in('campaign_id', campaignIds);

      const userCampaignMap: Record<string, any> = {};
      for (const e of enrollments || []) {
        if (!userCampaignMap[e.user_id]) userCampaignMap[e.user_id] = campaignInfoMap[e.campaign_id];
      }
      const enrolledUserIds = Object.keys(userCampaignMap);

      // Step 3: Get telemetry sessions for SP campaigns
      const { data: telemetry } = await supabase
        .from('device_data_sessions')
        .select('device_id, bytes_up, bytes_down, nrt_awarded, campaign_id')
        .in('campaign_id', campaignIds);

      const telemetryDeviceIds = [...new Set((telemetry || []).map((t: any) => t.device_id))];

      if (enrolledUserIds.length === 0 && telemetryDeviceIds.length === 0) return [];

      // Step 4: Get devices for those users or device_ids
      let deviceRows: any[] = [];
      if (enrolledUserIds.length > 0) {
        const { data } = await supabase
          .from('devices')
          .select('*, users(display_name, email)')
          .in('user_id', enrolledUserIds)
          .order('created_at', { ascending: false });
        if (data) deviceRows.push(...data);
      }
      
      if (telemetryDeviceIds.length > 0) {
        // Exclude ones we already fetched
        const existingIds = new Set(deviceRows.map(d => d.id));
        const missingIds = telemetryDeviceIds.filter(id => !existingIds.has(id));
        if (missingIds.length > 0) {
          // split into chunks if needed, but assuming small enough
          const { data } = await supabase
            .from('devices')
            .select('*, users(display_name, email)')
            .in('id', missingIds)
            .order('created_at', { ascending: false });
          if (data) deviceRows.push(...data);
        }
      }

      // Step 5: Aggregate telemetry per device and map campaign
      const sessionSumMap: Record<string, { bytes_up: number; bytes_down: number; nrt_awarded: number; campaign_id: string | null }> = {};
      
      for (const t of telemetry || []) {
        if (!sessionSumMap[t.device_id]) sessionSumMap[t.device_id] = { bytes_up: 0, bytes_down: 0, nrt_awarded: 0, campaign_id: t.campaign_id };
        sessionSumMap[t.device_id].bytes_up += t.bytes_up || 0;
        sessionSumMap[t.device_id].bytes_down += t.bytes_down || 0;
        sessionSumMap[t.device_id].nrt_awarded += t.nrt_awarded || 0;
        // Keep the latest or dominant campaign_id (for simplicity, we keep the first one we see)
      }

      // Step 6: Return unified shape
      return deviceRows.map((d: any) => {
        const tel = sessionSumMap[d.id] || { bytes_up: 0, bytes_down: 0, nrt_awarded: 0, campaign_id: null };
        
        // Priority: Telemetry campaign -> Enrollment campaign
        let campId = tel.campaign_id;
        if (!campId && userCampaignMap[d.user_id]) campId = userCampaignMap[d.user_id].id;
        
        const camp = campId ? campaignInfoMap[campId] : null;
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
          device: { 
            device_name: d.device_name, 
            device_type: d.device_type, 
            os: d.os, 
            status: d.status, 
            isp_name: d.isp_name, 
            country: d.country, 
            users: d.users,
            updated_at: d.updated_at,
            created_at: d.created_at
          },
          campaign: camp ? { title: camp.title, service: serviceObj } : null
        };
      }) as unknown as AdminDeviceView[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes to prevent rapid flickering
  });

  return { sessions, isLoading };
}

export function useIspDevices() {
  const { user } = useAuthStore();

  const { data: devices, isLoading } = useQuery({
    queryKey: ['isp_devices', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // 1. Get ISP profile ID
      const { data: ispProfile } = await supabase.from('isp_profiles').select('id').eq('user_id', user.id).single();
      const ispProfileId = ispProfile?.id;
      if (!ispProfileId) return [];

      // 2. Get verified network names
      const { data: networks } = await supabase.from('networks').select('name').eq('isp_id', ispProfileId).eq('verified', true);
      const networkNames = (networks || []).map((n: any) => n.name).filter(Boolean);

      // 3. Get ISP Campaigns
      const { data: campaignRows } = await supabase.from('campaigns').select('id').eq('isp_id', ispProfileId);
      const campaignIds = (campaignRows || []).map((c: any) => c.id);

      // 4. Get enrolled users for ISP campaigns
      let enrolledUserIds: string[] = [];
      if (campaignIds.length > 0) {
        const { data: enrollments } = await supabase.from('user_campaigns').select('user_id').in('campaign_id', campaignIds);
        enrolledUserIds = (enrollments || []).map((e: any) => e.user_id);
      }

      // 5. Fetch relevant devices
      let deviceRows: any[] = [];
      if (networkNames.length > 0) {
        const { data } = await supabase
          .from('devices')
          .select(`
            *,
            users(id, display_name, email),
            device_data_sessions(
              bytes_up, bytes_down, nrt_awarded,
              campaign:campaigns(title, service:services(name))
            )
          `)
          .in('isp_name', networkNames)
          .order('created_at', { ascending: false });
        if (data) deviceRows.push(...data);
      }

      if (enrolledUserIds.length > 0) {
        const { data } = await supabase
          .from('devices')
          .select(`
            *,
            users(id, display_name, email),
            device_data_sessions(
              bytes_up, bytes_down, nrt_awarded,
              campaign:campaigns(title, service:services(name))
            )
          `)
          .in('user_id', enrolledUserIds)
          .order('created_at', { ascending: false });
        if (data) deviceRows.push(...data);
      }

      // Deduplicate devices by ID
      const uniqueDevices = Array.from(new Map(deviceRows.map(d => [d.id, d])).values());

      // 6. Get enrolled campaign titles for fallback
      const ownerIds = [...new Set(uniqueDevices.map((d: any) => d.users?.id || d.user_id).filter(Boolean))];
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

      // 7. Attach enrolled campaign title as fallback to each device
      return uniqueDevices.map((d: any) => ({
        ...d,
        _enrolled_campaign_title: enrollmentMap[d.users?.id || d.user_id] || null
      }));
    },
    enabled: !!user,
  });

  return { devices, isLoading };
}
