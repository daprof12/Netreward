import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  reward_nrt: number;
  status: 'pending' | 'active' | 'expired';
  created_at: string;
  referred_user?: {
    display_name: string | null;
    email: string;
  };
}

export function useReferrals() {
  const { user } = useAuthStore();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred_user:referred_id (display_name, email)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user,
  });

  const { data: referralCode } = useQuery({
    queryKey: ['referral_code', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data?.referral_code || 'NR-' + user.id.replace(/-/g, '').slice(-8).toUpperCase();
    },
    enabled: !!user,
  });

  const totalReferred = referrals?.length || 0;
  const totalEarned = referrals
    ?.filter(r => r.status === 'active')
    .reduce((sum, r) => sum + Number(r.reward_nrt), 0) || 0;
  const pendingRewards = referrals
    ?.filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + Number(r.reward_nrt), 0) || 0;

  return {
    referrals: referrals || [],
    referralCode: referralCode || '',
    isLoading,
    totalReferred,
    totalEarned,
    pendingRewards,
  };
}
