import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface WalletState {
  balanceNRT: number;
  fiatValue: number; 
  isLoading: boolean;
  walletId: string | null;
  fetchBalance: (userId: string) => Promise<void>;
  subscribeToWallet: (userId: string) => () => void;
  setLoading: (state: boolean) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balanceNRT: 0,
  fiatValue: 0.005, 
  isLoading: false,
  walletId: null,
  fetchBalance: async (userId: string) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('wallets')
      .select('id, nrt_balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching wallet:', error);
    } else if (data) {
      set({ balanceNRT: data.nrt_balance, walletId: data.id });
    } else {
      // No wallet found, don't throw 406
      set({ balanceNRT: 0, walletId: null });
    }
    set({ isLoading: false });
  },
  subscribeToWallet: (userId: string) => {
    // Unique channel name to avoid "already subscribed" errors if multiple calls happen fast
    const channelId = `wallet:${userId}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          set({ balanceNRT: payload.new.nrt_balance });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
  setLoading: (state: boolean) => set({ isLoading: state }),
}));
