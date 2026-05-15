import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { useWalletStore } from './useWalletStore';

export interface TargetLocation {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface SpService {
  id: string;
  name: string;
  category: string;
  description?: string;
  webUrl?: string;
  androidUrl?: string;
  iosUrl?: string;
  logoUrl?: string;
  apiKey?: string;
  verified: boolean;
  status: 'pending_verification' | 'active' | 'suspended';
  country?: string;
  createdAt: string;
}


export interface SpCampaign {
  id: string;
  serviceId: string;
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

export interface CheckoutSession {
  id: string;
  merchantId: string;
  merchantName: string;
  amountNrt: number;
  description: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  createdAt: string;
  expiresAt: string;
  qrPayload: string; // JWT-like string
}

interface SpStore {
  services: SpService[];
  campaigns: SpCampaign[];
  profileId: string | null;
  profileLogo: string | null;
  checkoutSessions: CheckoutSession[];
  isLoading: boolean;
  error: string | null;
  
  initialize: (spId: string) => Promise<void>;
  
  // Service actions
  addService: (service: Omit<SpService, 'id' | 'createdAt' | 'status' | 'verified'>) => Promise<SpService>;
  updateService: (id: string, updates: Partial<SpService>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  
  // Campaign actions
  addCampaign: (campaign: Omit<SpCampaign, 'id' | 'createdAt' | 'status' | 'spentNrt'>) => Promise<SpCampaign>;
  updateCampaign: (id: string, updates: Partial<SpCampaign>) => Promise<void>;
  stopCampaign: (id: string) => Promise<{ refundedAmount: number }>;
  deleteCampaign: (id: string) => Promise<void>;
 
  // Checkout
  createCheckoutSession: (amountNrt: number, description: string) => Promise<CheckoutSession>;
}

export const useSpStore = create<SpStore>()(
  persist(
    (set, get) => ({
      services: [],
      campaigns: [],
      profileId: null,
      profileLogo: null,
      checkoutSessions: [],
      isLoading: false,
      error: null,
      
      initialize: async (spId: string) => {
        const { services } = get();
        // Only show loading if we have no data yet
        if (services.length === 0) set({ isLoading: true, error: null });
        
        try {
          let profileId = spId;
          const { data: profile } = await supabase.from('sp_profiles').select('id, logo_url').eq('user_id', spId).single();
          if (profile) {
            profileId = profile.id;
            set({ profileId: profile.id, profileLogo: profile.logo_url });
          } else {
            const { data: newProfile } = await supabase.from('sp_profiles').insert({ user_id: spId, company_name: 'Alpha SP' }).select().single();
            if (newProfile) profileId = newProfile.id;
          }

          const [servicesRes, campaignsRes] = await Promise.all([
            supabase.from('services').select('*').eq('sp_id', profileId),
            supabase.from('campaigns').select('*').eq('sp_id', profileId)
          ]);

          if (servicesRes.error) throw servicesRes.error;
          if (campaignsRes.error) throw campaignsRes.error;

          const servicesData: SpService[] = servicesRes.data.map(d => ({
            id: d.id, name: d.name, category: d.category, description: d.description,
            webUrl: d.web_url, androidUrl: d.android_url, iosUrl: d.ios_url,
            androidPackageName: d.android_package_name, iosBundleId: d.ios_bundle_id,
            webDomain: d.web_domain, webhookUrl: d.webhook_url, logoUrl: d.logo_url,
            apiKey: d.api_key, secretKey: d.secret_key, webhookSecret: d.webhook_secret,
            verified: d.verified, status: d.status, country: d.country, createdAt: d.created_at
          }));

          const campaignsData: SpCampaign[] = campaignsRes.data.map(d => ({
            id: d.id, serviceId: d.service_id, name: d.title,
            targetLocation: d.target_locations || [], budgetNrt: d.total_budget,
            rewardRate: d.reward_rate_per_gb, startDate: d.start_date, endDate: d.end_date,
            isRecurring: d.is_recurring, status: d.status, createdAt: d.created_at,
            country: d.country, spentNrt: d.budget_spent
          }));

          set({ services: servicesData, campaigns: campaignsData, isLoading: false });
        } catch (err: any) {
          console.error('SP Store Init Error:', err);
          set({ isLoading: false, error: err.message });
        }
      },

      addService: async (service) => {
        set({ isLoading: true, error: null });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data: profile } = await supabase.from('sp_profiles').select('id').eq('user_id', user.id).single();
          if (!profile) throw new Error('SP Profile not found');

          const dbService = {
            sp_id: profile.id,
            name: service.name, category: service.category, description: service.description,
            web_url: service.webUrl, android_url: service.androidUrl, ios_url: service.iosUrl,
            android_package_name: service.androidPackageName, ios_bundle_id: service.iosBundleId,
            web_domain: service.webDomain, webhook_url: service.webhookUrl, logo_url: service.logoUrl,
            api_key: service.apiKey, secret_key: service.secretKey, webhook_secret: service.webhookSecret,
            country: service.country
          };
          
          const { data, error } = await supabase.from('services').insert(dbService).select().single();
          if (error) throw error;
          
          const newService: SpService = {
            ...service,
            id: data.id, verified: data.verified, status: data.status, createdAt: data.created_at
          };
          
          set((state) => ({ services: [...state.services, newService], isLoading: false }));
          return newService;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      
      updateService: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.category !== undefined) dbUpdates.category = updates.category;
          if (updates.description !== undefined) dbUpdates.description = updates.description;
          if (updates.webUrl !== undefined) dbUpdates.web_url = updates.webUrl;
          if (updates.webDomain !== undefined) dbUpdates.web_domain = updates.webDomain;
          if (updates.androidUrl !== undefined) dbUpdates.android_url = updates.androidUrl;
          if (updates.androidPackageName !== undefined) dbUpdates.android_package_name = updates.androidPackageName;
          if (updates.iosUrl !== undefined) dbUpdates.ios_url = updates.iosUrl;
          if (updates.iosBundleId !== undefined) dbUpdates.ios_bundle_id = updates.iosBundleId;
          if (updates.webhookUrl !== undefined) dbUpdates.webhook_url = updates.webhookUrl;
          if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
          if (updates.apiKey !== undefined) dbUpdates.api_key = updates.apiKey;
          if (updates.secretKey !== undefined) dbUpdates.secret_key = updates.secretKey;
          if (updates.webhookSecret !== undefined) dbUpdates.webhook_secret = updates.webhookSecret;
          if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
          if (updates.status !== undefined) dbUpdates.status = updates.status;
          if (updates.country !== undefined) dbUpdates.country = updates.country;
          
          const { error } = await supabase.from('services').update(dbUpdates).eq('id', id);
          if (error) throw error;
          
          set((state) => ({
            services: state.services.map(s => s.id === id ? { ...s, ...updates } : s),
            isLoading: false
          }));
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },
      
      deleteService: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.from('services').delete().eq('id', id);
          if (error) throw error;
          set((state) => ({ services: state.services.filter(s => s.id !== id), isLoading: false }));
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

          const { data: profile } = await supabase.from('sp_profiles').select('id').eq('user_id', user.id).single();
          if (!profile) throw new Error('SP Profile not found');

          const { data, error } = await supabase.rpc('create_campaign_with_escrow', {
            p_creator_id: user.id,
            p_sp_id: profile.id,
            p_isp_id: null,
            p_service_id: campaign.serviceId,
            p_network_id: null,
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
          
          const newCampaign: SpCampaign = {
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


      createCheckoutSession: async (amountNrt, description) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const ref = crypto.randomUUID();

        const { data, error } = await supabase
          .from('scan2pay_sessions')
          .insert({
            merchant_id: user.id,
            amount_nrt: amountNrt,
            description,
            expires_at: expiresAt,
            status: 'pending'
          })
          .select('*, users!merchant_id(display_name)')
          .single();

        if (error) throw error;

        const session: CheckoutSession = {
          id: data.id,
          merchantId: data.merchant_id,
          merchantName: data.users?.display_name || 'Merchant',
          amountNrt: data.amount_nrt,
          description: data.description,
          status: data.status as any,
          createdAt: data.created_at,
          expiresAt: data.expires_at,
          qrPayload: JSON.stringify({
            sessionId: data.id,
            merchantId: data.merchant_id,
            amountNrt: data.amount_nrt,
            ref: ref,
            exp: Math.floor(new Date(expiresAt).getTime() / 1000)
          })
        };
        
        set((state) => ({ checkoutSessions: [session, ...state.checkoutSessions] }));
        return session;
      },
    }),
    {
      name: 'sp-storage',
    }
  )
);
