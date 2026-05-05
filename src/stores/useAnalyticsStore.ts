import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface CampaignStat {
  date: string;
  total_users_reached: number;
  total_data_bytes: number;
  total_nrt_distributed: number;
}

export interface NetworkStat {
  date: string;
  avg_latency_ms: number;
  packet_loss_percentage: number;
  total_traffic_bytes: number;
  active_users: number;
}

interface AnalyticsStore {
  campaignStats: CampaignStat[];
  networkStats: NetworkStat[];
  isLoading: boolean;
  error: string | null;
  
  fetchCampaignStats: (providerId: string, days?: number) => Promise<void>;
  fetchNetworkStats: (ispId: string, days?: number) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  campaignStats: [],
  networkStats: [],
  isLoading: false,
  error: null,

  fetchCampaignStats: async (providerId: string, days: number = 7) => {
    set({ isLoading: true, error: null });
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .from('campaign_daily_stats')
        .select('*')
        .eq('provider_id', providerId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      set({ campaignStats: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchNetworkStats: async (ispId: string, days: number = 7) => {
    set({ isLoading: true, error: null });
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .from('isp_network_stats')
        .select('*')
        .eq('isp_id', ispId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      set({ networkStats: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));
