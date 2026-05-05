import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface SupportTicket {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

export function useSupportTickets() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support_tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (params: { category: string; subject: string; description: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          category: params.category,
          subject: params.subject,
          description: params.description,
        })
        .select()
        .single();
      if (error) throw error;

      // Also insert the initial message
      await supabase.from('ticket_messages').insert({
        ticket_id: data.id,
        sender_id: user.id,
        message: params.description,
        is_admin: false,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support_tickets', user?.id] });
    },
  });

  return {
    tickets: tickets || [],
    isLoading,
    createTicket: createTicketMutation.mutateAsync,
    isCreating: createTicketMutation.isPending,
  };
}
