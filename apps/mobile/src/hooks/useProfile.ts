import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'sp' | 'isp' | 'admin';
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  kyc_verified: boolean;
}

export function useProfile() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    }
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (newRole: 'user' | 'sp' | 'isp') => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('switch_user_role', { new_role: newRole });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    }
  });

  return {
    profile,
    isLoading,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
    switchRole: switchRoleMutation.mutateAsync,
    isSwitchingRole: switchRoleMutation.isPending,
  };
}
