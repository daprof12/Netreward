import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { type TargetLocation } from './useSpStore';
import { useWalletStore } from './useWalletStore';

export interface IspNetwork {
  id: string;
  name: string;
  category: string;
  logoUrl?: string;
  verified: boolean;
  country?: string;
  signalStrength?: number; // 0-100%
  coverage?: string; // e.g. "North America, Europe"
  asn?: string; // e.g. "AS6453"
  ipRanges?: string[]; // CIDR blocks e.g. ["197.210.0.0/16"]
  handshakeUrl?: string; // ISP endpoint for BGP challenge-response
  apiKey?: string;
  createdAt: string;
}

export interface IspCampaign {
  id: string;
  networkId: string;
  name: string;
  targetLocation: TargetLocation[];
  budgetNrt: number;
  rewardRate: number; // NRT per GB or default calc
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  country?: string;
  spentNrt: number; // Mock tracking
}

interface IspStore {
  networks: IspNetwork[];
  campaigns: IspCampaign[];
  profileId: string | null;
  profileLogo: string | null;
  ispName: string | null;
  isLoading: boolean;
  error: string | null;
  
  initialize: (ispId: string) => Promise<void>;
  
  // Network actions
  addNetwork: (network: Omit<IspNetwork, 'id' | 'createdAt' | 'verified'>) => Promise<IspNetwork>;
  updateNetwork: (id: string, updates: Partial<IspNetwork>) => Promise<void>;
  deleteNetwork: (id: string) => Promise<void>;
  
  // Campaign actions
  addCampaign: (campaign: Omit<IspCampaign, 'id' | 'createdAt' | 'status' | 'spentNrt'>) => Promise<IspCampaign>;
  updateCampaign: (id: string, updates: Partial<IspCampaign>) => Promise<void>;
  stopCampaign: (id: string) => Promise<{ refundedAmount: number }>;
  deleteCampaign: (id: string) => Promise<void>;
}

export const useIspStore = create<IspStore>()(
  persist(
    (set, get) => ({
      networks: [],
      campaigns: [],
      profileId: null,
      profileLogo: null,
      ispName: null,
      isLoading: false,
      error: null,
      
      initialize: async (ispId: string) => {
        const { networks } = get();
        if (networks.length === 0) set({ isLoading: true, error: null });
        try {
          // Get the ISP profile id
          let profileId = ispId;
          const { data: profile } = await supabase.from('isp_profiles').select('id, logo_url, isp_name').eq('user_id', ispId).single();
          if (profile) {
            profileId = profile.id;
            set({ profileId: profile.id, profileLogo: profile.logo_url, ispName: profile.isp_name });
          } else {
            const { data: newProfile } = await supabase.from('isp_profiles').insert({ user_id: ispId, isp_name: 'Alpha ISP' }).select().single();
            if (newProfile) {
              profileId = newProfile.id;
              set({ ispName: newProfile.isp_name });
            }
          }

          const [networksRes, campaignsRes] = await Promise.all([
            supabase.from('networks').select('*').eq('isp_id', profileId),
            supabase.from('campaigns').select('*').eq('isp_id', profileId)
          ]);

          if (networksRes.error) throw networksRes.error;
          if (campaignsRes.error) throw campaignsRes.error;

          const networksData: IspNetwork[] = networksRes.data.map(d => ({
            id: d.id, name: d.name, category: d.category, logoUrl: d.logo_url,
            verified: d.verified, country: d.country, signalStrength: d.signal_strength,
            coverage: d.coverage, asn: d.asn, ipRanges: d.ip_ranges || [],
            handshakeUrl: d.handshake_url,
            apiKey: d.api_key, createdAt: d.created_at
          }));

          const campaignsData: IspCampaign[] = campaignsRes.data.map(d => ({
            id: d.id, networkId: d.network_id, name: d.title,
            targetLocation: d.target_locations || [], budgetNrt: d.total_budget,
            rewardRate: d.reward_rate_per_gb, startDate: d.start_date, endDate: d.end_date,
            isRecurring: d.is_recurring, status: d.status, createdAt: d.created_at,
            country: d.country, spentNrt: d.budget_spent
          }));

          set({ networks: networksData, campaigns: campaignsData, isLoading: false });
        } catch (err: any) {
          console.error('ISP Store Init Error:', err);
          set({ error: err.message, isLoading: false });
        }
      },

      addNetwork: async (network) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data: profile } = await supabase.from('isp_profiles').select('id').eq('user_id', user.id).single();
          if (!profile) throw new Error('ISP Profile not found');

          const dbNetwork = {
            isp_id: profile.id,
            name: network.name, category: network.category, logo_url: network.logoUrl,
            country: network.country, signal_strength: network.signalStrength, coverage: network.coverage,
            asn: network.asn, ip_ranges: network.ipRanges as any, handshake_url: network.handshakeUrl,
            api_key: network.apiKey
          };
          
          const { data, error } = await supabase.from('networks').insert(dbNetwork).select().single();
          if (error) throw error;
          
          const newNetwork: IspNetwork = {
            ...network,
            id: data.id, verified: data.verified, createdAt: data.created_at
          };
          
          set((state) => ({ networks: [...state.networks, newNetwork], isLoading: false }));
          return newNetwork;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      
      updateNetwork: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.category !== undefined) dbUpdates.category = updates.category;
          if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
          if (updates.country !== undefined) dbUpdates.country = updates.country;
          if (updates.signalStrength !== undefined) dbUpdates.signal_strength = updates.signalStrength;
          if (updates.coverage !== undefined) dbUpdates.coverage = updates.coverage;
          if (updates.asn !== undefined) dbUpdates.asn = updates.asn;
          if (updates.ipRanges !== undefined) dbUpdates.ip_ranges = updates.ipRanges;
          if (updates.handshakeUrl !== undefined) dbUpdates.handshake_url = updates.handshakeUrl;
          if (updates.apiKey !== undefined) dbUpdates.api_key = updates.apiKey;
          if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
          
          const { error } = await supabase.from('networks').update(dbUpdates).eq('id', id);
          if (error) throw error;
          
          set((state) => ({
            networks: state.networks.map(n => n.id === id ? { ...n, ...updates } : n),
            isLoading: false
          }));
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      
      deleteNetwork: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.from('networks').delete().eq('id', id);
          if (error) throw error;
          set((state) => ({ networks: state.networks.filter(n => n.id !== id), isLoading: false }));
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      
      addCampaign: async (campaign) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data: profile } = await supabase.from('isp_profiles').select('id').eq('user_id', user.id).single();
          if (!profile) throw new Error('ISP Profile not found');

          const { data, error } = await supabase.rpc('create_campaign_with_escrow', {
            p_creator_id: user.id,
            p_sp_id: null,
            p_isp_id: profile.id,
            p_service_id: null,
            p_network_id: campaign.networkId,
            p_title: campaign.name,
            p_reward_rate_per_gb: campaign.rewardRate,
            p_total_budget: campaign.budgetNrt,
            p_start_date: campaign.startDate,
            p_end_date: campaign.endDate,
            p_is_recurring: campaign.isRecurring,
            p_country: campaign.country,
            p_target_locations: campaign.targetLocation
          });

          if (error) throw error;
          if (data.status === 'error') throw new Error(data.message);
          
          const { data: newCampaignData, error: fetchError } = await supabase.from('campaigns').select('*').eq('id', data.campaign_id).single();
          if (fetchError) throw fetchError;
          
          const newCampaign: IspCampaign = {
            ...campaign,
            id: newCampaignData.id, status: newCampaignData.status, spentNrt: newCampaignData.budget_spent, createdAt: newCampaignData.created_at
          };
          
          set((state) => ({ campaigns: [...state.campaigns, newCampaign], isLoading: false }));
          return newCampaign;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      
      updateCampaign: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // If budget is changing, use the atomic RPC
          if (updates.budgetNrt !== undefined) {
            const currentCampaign = get().campaigns.find(c => c.id === id);
            if (currentCampaign && updates.budgetNrt !== currentCampaign.budgetNrt) {
              const { data, error: rpcError } = await supabase.rpc('adjust_campaign_budget', {
                p_campaign_id: id,
                p_user_id: user.id,
                p_new_budget: updates.budgetNrt
              });
              if (rpcError) throw rpcError;
              if (data?.status === 'error') throw new Error(data.message);
              // Refresh wallet balance after budget adjustment
              await useWalletStore.getState().fetchBalance(user.id);
            }
          }

          // Update non-budget fields via direct update
          const dbUpdates: any = {};
          if (updates.networkId !== undefined) dbUpdates.network_id = updates.networkId;
          if (updates.name !== undefined) dbUpdates.title = updates.name;
          if (updates.status !== undefined) dbUpdates.status = updates.status;
          if (updates.spentNrt !== undefined) dbUpdates.budget_spent = updates.spentNrt;
          if (updates.rewardRate !== undefined) dbUpdates.reward_rate_per_gb = updates.rewardRate;
          if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
          if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
          if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
          if (updates.country !== undefined) dbUpdates.country = updates.country;
          if (updates.targetLocation !== undefined) dbUpdates.target_locations = updates.targetLocation;
          
          // Only run direct update if there are non-budget fields to update
          if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase.from('campaigns').update(dbUpdates).eq('id', id);
            if (error) throw error;
          }
          
          set((state) => ({
            campaigns: state.campaigns.map(c => c.id === id ? { ...c, ...updates } : c),
            isLoading: false
          }));
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      stopCampaign: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase.rpc('stop_campaign_with_refund', {
            p_campaign_id: id,
            p_user_id: user.id
          });
          if (error) throw error;
          if (data?.status === 'error') throw new Error(data.message);

          // Refresh wallet balance after refund
          await useWalletStore.getState().fetchBalance(user.id);

          set((state) => ({
            campaigns: state.campaigns.map(c => c.id === id ? { ...c, status: 'completed' as const } : c),
            isLoading: false
          }));

          return { refundedAmount: data?.refunded_amount || 0 };
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      
      deleteCampaign: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          // Refund remaining balance before deleting
          const campaign = get().campaigns.find(c => c.id === id);
          if (campaign && campaign.status !== 'completed' && campaign.status !== 'canceled') {
            const { data, error: rpcError } = await supabase.rpc('cancel_campaign_with_refund', {
              p_campaign_id: id,
              p_user_id: user.id
            });
            if (rpcError) throw rpcError;
            if (data?.status === 'error') throw new Error(data.message);
          }

          const { error } = await supabase.from('campaigns').delete().eq('id', id);
          if (error) throw error;

          // Refresh wallet balance after refund
          await useWalletStore.getState().fetchBalance(user.id);

          set((state) => ({ campaigns: state.campaigns.filter(c => c.id !== id), isLoading: false }));
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
    }),
    {
      name: 'isp-storage',
    }
  )
);
