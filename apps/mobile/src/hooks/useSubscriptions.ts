import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';

export interface Subscription {
  id: string;
  merchant_id: string;
  service_id?: string;
  network_id?: string;
  merchant_name: string;
  merchant_logo: string | null;
  category: string;
  merchant_type: 'sp' | 'isp';
  auto_renew: boolean;
  status: 'active' | 'paused' | 'cancelled';
  last_payment_at: string;
  next_renewal_at: string;
  amount_nrt: number;
}

export function useSubscriptions() {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSubscriptions();
    } else {
      setSubscriptions([]);
      setLoading(false);
    }
  }, [user?.id]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .order('next_renewal_at', { ascending: true });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to load subscriptions', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRenew = async (subscriptionId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ auto_renew: enabled })
        .eq('id', subscriptionId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId ? { ...sub, auto_renew: enabled } : sub
        )
      );
      showToast(enabled ? 'Auto-renew enabled' : 'Auto-renew disabled', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update auto-renew status', 'danger');
    }
  };

  return {
    subscriptions,
    loading,
    toggleAutoRenew,
    refresh: fetchSubscriptions
  };
}
