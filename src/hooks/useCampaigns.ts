import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

// Note: Using standard interfaces that match our Supabase DB schema
export interface Campaign {
  id: string;
  sp_id: string;
  isp_id: string;
  title: string;
  target_app: string;
  reward_rate_per_gb: number;
  total_budget: number;
  budget_spent: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  logo_url?: string;
  creator_name?: string;
  category?: string;
  target_locations?: any[];
  country?: string;
}

export interface UserCampaign {
  id: string;
  campaign_id: string;
  data_consumed_gb: number;
  nrt_earned: number;
  status: string;
}

export function useCampaigns() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Helper to extract a single object from potential array (Supabase join behavior)
  const getSingle = (val: any) => Array.isArray(val) ? val[0] : val;

  // Helper to resolve creator name — same pattern as adminApi.ts
  // If the profile was auto-created with the 'Alpha SP/ISP' sentinel name,
  // fall through to the linked user's display_name instead.
  const resolveCreatorName = (sp: any, isp: any, svc: any, net: any): string => {
    if (sp) {
      return sp.company_name === 'Alpha SP'
        ? sp.users?.display_name || sp.company_name
        : sp.company_name;
    }
    if (isp) {
      return isp.isp_name === 'Alpha ISP'
        ? isp.users?.display_name || isp.isp_name
        : isp.isp_name;
    }
    return svc?.name || net?.name || 'NetReward Partner';
  };

  // Fetch all active campaigns
  const { data: activeCampaigns, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          sp:sp_profiles (company_name, logo_url, users (display_name)),
          isp:isp_profiles (isp_name, logo_url, users (display_name)),
          svc:services (name, logo_url, category),
          net:networks (name, logo_url, category)
        `)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
      }

      const normalized = (data || []).map((camp: any) => {
        const sp = getSingle(camp.sp);
        const isp = getSingle(camp.isp);
        const svc = getSingle(camp.svc);
        const net = getSingle(camp.net);

        // Resolve users sub-object (may also be wrapped in array by Supabase)
        if (sp && Array.isArray(sp.users)) sp.users = sp.users[0];
        if (isp && Array.isArray(isp.users)) isp.users = isp.users[0];

        return {
          ...camp,
          target_app: svc?.name || net?.name || camp.title || 'App Service',
          logo_url: svc?.logo_url || net?.logo_url || sp?.logo_url || isp?.logo_url || null,
          creator_name: resolveCreatorName(sp, isp, svc, net),
          creator_logo: sp?.logo_url || isp?.logo_url || null,
          category: svc?.category || net?.category || (sp ? 'Service' : isp ? 'Network' : 'General'),
          target_locations: camp.target_locations || []
        };
      });

      return normalized as Campaign[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch campaigns the current user is enrolled in
  const { data: userEnrollments, isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['user_campaigns', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_campaigns')
        .select(`
          *,
          campaigns:campaigns!campaign_id (
            *,
            sp:sp_profiles (company_name, logo_url, users (display_name)),
            isp:isp_profiles (isp_name, logo_url, users (display_name)),
            svc:services (name, logo_url, category),
            net:networks (name, logo_url, category)
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user enrollments:', error);
        throw error;
      }

      return (data || []).map((en: any) => {
        if (!en.campaigns) return en;
        const camp = en.campaigns;
        const sp = getSingle(camp.sp);
        const isp = getSingle(camp.isp);
        const svc = getSingle(camp.svc);
        const net = getSingle(camp.net);

        if (sp && Array.isArray(sp.users)) sp.users = sp.users[0];
        if (isp && Array.isArray(isp.users)) isp.users = isp.users[0];

        return {
          ...en,
          campaigns: {
            ...camp,
            target_app: svc?.name || net?.name || camp.title || 'App Service',
            logo_url: svc?.logo_url || net?.logo_url || sp?.logo_url || isp?.logo_url || null,
            creator_name: resolveCreatorName(sp, isp, svc, net),
            creator_logo: sp?.logo_url || isp?.logo_url || null,
            category: svc?.category || net?.category || (sp ? 'Service' : isp ? 'Network' : 'General'),
            target_locations: camp.target_locations || []
          }
        };
      });
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Mutation to join a campaign
  const joinCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!user) throw new Error("Must be logged in to join campaign");

      const { data, error } = await supabase
        .from('user_campaigns')
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_campaigns', user?.id] });
    }
  });

  return {
    activeCampaigns,
    userEnrollments,
    isLoading: isLoadingCampaigns || isLoadingEnrollments,
    joinCampaign: joinCampaignMutation.mutateAsync,
    isJoining: joinCampaignMutation.isPending
  };
}
