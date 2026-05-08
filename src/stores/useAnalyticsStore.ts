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
  
  fetchCampaignStats: (spProfileId: string, days?: number) => Promise<void>;
  fetchNetworkStats: (ispProfileId: string, days?: number) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  campaignStats: [],
  networkStats: [],
  isLoading: false,
  error: null,

  fetchCampaignStats: async (spProfileId: string, days: number = 7) => {
    set({ isLoading: true, error: null });
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .rpc('get_sp_campaign_stats', {
          p_sp_id: spProfileId,
          p_start_date: startDate.toISOString().split('T')[0]
        });

      if (error) throw error;
      set({ campaignStats: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchNetworkStats: async (ispProfileId: string, days: number = 7) => {
    set({ isLoading: true, error: null });
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .rpc('get_isp_network_stats', {
          p_isp_id: ispProfileId,
          p_start_date: startDate.toISOString().split('T')[0]
        });

      if (error) throw error;
      set({ networkStats: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));
