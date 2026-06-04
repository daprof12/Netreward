import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export type GamingPlatform = 'playstation' | 'xbox' | 'steam' | 'oculus_vr' | 'nintendo_switch' | 'android' | 'ios' | 'web';

export interface GamingAccount {
  id: string;
  user_id: string;
  platform: GamingPlatform;
  platform_username: string;
  display_name: string | null;
  verified: boolean;
  linked_at: string;
  updated_at: string;
}

export const GAMING_PLATFORMS: Record<GamingPlatform, { label: string; usernamePlaceholder: string; usernameLabel: string; color: string }> = {
  playstation: {
    label: 'PlayStation',
    usernameLabel: 'PSN ID',
    usernamePlaceholder: 'e.g. xKiller99',
    color: '#003791',
  },
  xbox: {
    label: 'Xbox',
    usernameLabel: 'Gamertag',
    usernamePlaceholder: 'e.g. MasterChief42',
    color: '#107C10',
  },
  steam: {
    label: 'Steam',
    usernameLabel: 'Steam Username',
    usernamePlaceholder: 'e.g. gabe_n',
    color: '#1B2838',
  },
  oculus_vr: {
    label: 'Oculus VR',
    usernameLabel: 'Oculus Username',
    usernamePlaceholder: 'e.g. VRplayer1',
    color: '#8B5CF6',
  },
  nintendo_switch: {
    label: 'Nintendo Switch',
    usernameLabel: 'Nintendo ID',
    usernamePlaceholder: 'e.g. Mario_Fan',
    color: '#E60012',
  },
  android: {
    label: 'Android',
    usernameLabel: 'Google Play ID',
    usernamePlaceholder: 'e.g. user@gmail.com',
    color: '#3DDC84',
  },
  ios: {
    label: 'iOS (Apple)',
    usernameLabel: 'Apple Game Center ID',
    usernamePlaceholder: 'e.g. player_one',
    color: '#A2AAAD',
  },
  web: {
    label: 'Web Browser',
    usernameLabel: 'Web Account ID',
    usernamePlaceholder: 'e.g. web_player1',
    color: '#F97316',
  },
};

const QUERY_KEY = 'gaming_accounts';

export function useGamingAccounts() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: gamingAccounts = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('gaming_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('linked_at', { ascending: true });

        if (error) {
          // Table may not exist yet (migration not applied) — treat as empty
          console.warn('[useGamingAccounts] Query error (table may not exist):', error.message);
          return [];
        }
        return (data || []) as GamingAccount[];
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const linkAccountMutation = useMutation({
    mutationFn: async ({ platform, username }: { platform: GamingPlatform; username: string }) => {
      if (!user) throw new Error('Must be logged in');
      const { data, error } = await supabase
        .from('gaming_accounts')
        .insert({
          user_id: user.id,
          platform,
          platform_username: username.trim(),
          display_name: GAMING_PLATFORMS[platform].label,
        })
        .select()
        .single();
      if (error) throw error;
      return data as GamingAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
    },
  });

  const unlinkAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('gaming_accounts')
        .delete()
        .eq('id', accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ accountId, username }: { accountId: string; username: string }) => {
      const { data, error } = await supabase
        .from('gaming_accounts')
        .update({ platform_username: username.trim() })
        .eq('id', accountId)
        .select()
        .single();
      if (error) throw error;
      return data as GamingAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, user?.id] });
    },
  });

  const linkedPlatforms = new Set(gamingAccounts.map(a => a.platform));

  return {
    gamingAccounts,
    linkedPlatforms,
    isLoading,
    linkAccount: linkAccountMutation.mutateAsync,
    isLinking: linkAccountMutation.isPending,
    unlinkAccount: unlinkAccountMutation.mutateAsync,
    isUnlinking: unlinkAccountMutation.isPending,
    updateAccount: updateAccountMutation.mutateAsync,
    isUpdating: updateAccountMutation.isPending,
  };
}
