import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_type: 'user' | 'admin' | 'counterparty';
  sender_id: string | null;
  message: string;
  created_at: string;
}

export interface P2PDispute {
  id: string;
  user_id: string;
  trade_id: string;
  category: string;
  reason: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  evidence_urls: string[];
  created_at: string;
  updated_at: string;
  messages?: DisputeMessage[];
}

export function useDisputes() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['disputes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('p2p_disputes')
        .select(`
          *,
          messages:dispute_messages(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Sort messages within each dispute
      return (data as P2PDispute[]).map(d => ({
        ...d,
        messages: (d.messages || []).sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }));
    },
    enabled: !!user,
  });

  const createDisputeMutation = useMutation({
    mutationFn: async (params: { trade_id: string; category: string; reason: string; description: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('p2p_disputes')
        .insert({
          user_id: user.id,
          trade_id: params.trade_id,
          category: params.category,
          reason: params.reason,
          description: params.description,
        })
        .select()
        .single();
      if (error) throw error;

      // Add the initial message
      await supabase.from('dispute_messages').insert({
        dispute_id: data.id,
        sender_type: 'user',
        sender_id: user.id,
        message: params.reason,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes', user?.id] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (params: { disputeId: string; message: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: params.disputeId,
          sender_type: 'user',
          sender_id: user.id,
          message: params.message,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes', user?.id] });
    },
  });

  return {
    disputes: disputes || [],
    isLoading,
    createDispute: createDisputeMutation.mutateAsync,
    isCreating: createDisputeMutation.isPending,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
