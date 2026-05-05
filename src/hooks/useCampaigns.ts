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

  // Fetch all active campaigns
  const { data: activeCampaigns, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: async () => {
      // Use explicit joins to get branding data
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          sp:sp_profiles (company_name, logo_url),
          isp:isp_profiles (isp_name, logo_url),
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

        // Debug: Log if ISP logo is missing but profile exists
        if (isp && !isp.logo_url) {
           console.warn('ISP profile found but missing logo_url:', isp.isp_name);
        }

        return {
          ...camp,
          // Derive target_app: priority is service name, then network name, then campaign title
          target_app: svc?.name || net?.name || camp.title || 'App Service',
          // Priority: Service Logo > Network Logo > Profile Logo (SP or ISP) > Fallback null
          logo_url: svc?.logo_url || net?.logo_url || sp?.logo_url || isp?.logo_url || null,
          creator_name: sp?.company_name || isp?.isp_name || svc?.name || net?.name || 'NetReward Partner',
          creator_logo: sp?.logo_url || isp?.logo_url || null,
          category: svc?.category || net?.category || (sp ? 'Service' : isp ? 'Network' : 'General'),
          // Ensure target_locations is preserved
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
            sp:sp_profiles (company_name, logo_url),
            isp:isp_profiles (isp_name, logo_url),
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

        return {
          ...en,
          campaigns: {
            ...camp,
            target_app: svc?.name || net?.name || camp.title || 'App Service',
            logo_url: svc?.logo_url || net?.logo_url || sp?.logo_url || isp?.logo_url || null,
            creator_name: sp?.company_name || isp?.isp_name || svc?.name || net?.name || 'NetReward Partner',
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
