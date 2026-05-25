import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface TrackingState {
  isTracking: boolean;
  todayBytesUp: number;
  todayBytesDown: number;
  todayNrtEarned: number;
  activeCampaignCount: number;
  nrtBalance: number;
  campaigns: any[];
  recentActivity: any[];
  toggleTracking: () => void;
  fetchDashboardData: (userId: string) => Promise<void>;
  fetchCampaigns: (userId: string) => Promise<void>;
  updateStats: (bytesUp: number, bytesDown: number) => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  isTracking: true,
  todayBytesUp: 0,
  todayBytesDown: 0,
  todayNrtEarned: 0,
  activeCampaignCount: 0,
  nrtBalance: 0,
  campaigns: [],
  recentActivity: [],

  toggleTracking: () => {
    const newState = !get().isTracking;
    set({ isTracking: newState });
    // Notify the service worker
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'TOGGLE_TRACKING', enabled: newState });
    }
  },

  fetchDashboardData: async (userId: string) => {
    try {
      // Fetch wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('nrt_balance')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch active campaign count
      const { data: enrollments } = await supabase
        .from('user_campaigns')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active');

      // Fetch today's tracking stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: sessions } = await supabase
        .from('tracking_sessions')
        .select('bytes_up, bytes_down, nrt_awarded')
        .eq('user_id', userId)
        .gte('session_start', todayStart.toISOString());

      let todayUp = 0, todayDown = 0, todayNrt = 0;
      (sessions || []).forEach((s: any) => {
        todayUp += Number(s.bytes_up || 0);
        todayDown += Number(s.bytes_down || 0);
        todayNrt += Number(s.nrt_awarded || 0);
      });

      set({
        nrtBalance: Number(wallet?.nrt_balance || 0),
        activeCampaignCount: enrollments?.length || 0,
        todayBytesUp: todayUp,
        todayBytesDown: todayDown,
        todayNrtEarned: todayNrt,
      });
    } catch (e) {
      console.error('Dashboard data error:', e);
    }
  },

  fetchCampaigns: async (userId: string) => {
    try {
      const { data: enrollments } = await supabase
        .from('user_campaigns')
        .select('*, campaigns(*)')
        .eq('user_id', userId);

      const { data: available } = await supabase
        .from('campaigns')
        .select(`
          *,
          sp:sp_profiles (company_name, logo_url, users (display_name)),
          isp:isp_profiles (isp_name, logo_url, users (display_name)),
          svc:services (name, logo_url, category),
          net:networks (name, logo_url, category)
        `)
        .eq('status', 'active')
        .limit(50);

      const getSingle = (val: any) => Array.isArray(val) ? val[0] : val;

      const enrolledIds = new Set((enrollments || []).map((e: any) => e.campaign_id));
      const allCampaigns = (available || []).map((c: any) => {
        const sp = getSingle(c.sp);
        const isp = getSingle(c.isp);
        const svc = getSingle(c.svc);
        const net = getSingle(c.net);

        return {
          ...c,
          target_app: svc?.name || net?.name || c.title || 'App Service',
          logo_url: svc?.logo_url || net?.logo_url || sp?.logo_url || isp?.logo_url || null,
          provider_name: sp?.company_name || isp?.isp_name || svc?.name || net?.name || 'NetReward Partner',
          category: svc?.category || net?.category || (sp ? 'Service' : isp ? 'Network' : 'General'),
          enrolled: enrolledIds.has(c.id),
          enrollment: (enrollments || []).find((e: any) => e.campaign_id === c.id),
        };
      });

      // Fetch recent activity
      const { data: activity } = await supabase
        .from('device_data_sessions')
        .select('campaign_id, session_end')
        .order('session_end', { ascending: false })
        .limit(20);

      set({ campaigns: allCampaigns, recentActivity: activity || [] });
    } catch (e) {
      console.error('Campaigns error:', e);
    }
  },

  updateStats: (bytesUp, bytesDown) => {
    set((state) => ({
      todayBytesUp: state.todayBytesUp + bytesUp,
      todayBytesDown: state.todayBytesDown + bytesDown,
    }));
  },
}));
