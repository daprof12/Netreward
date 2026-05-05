import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface Wallet {
  id: string;
  user_id: string;
  solana_public_key: string | null;
  nrt_balance: number;
  status: string;
}

export function useWallet() {
  const { user } = useAuthStore();

  const { data: wallet, isLoading, error } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // First try to fetch existing wallet
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no wallet exists yet, we could trigger creation logic here,
      // but for now we return the data (which may be null)
      return data as Wallet | null;
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('claim_all_rewards', { p_user_id: user.id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-enrollments', user?.id] });
    }
  });

  return {
    wallet,
    isLoading,
    error,
    claimRewards: claimMutation.mutateAsync,
    isClaiming: claimMutation.isPending
  };
}
