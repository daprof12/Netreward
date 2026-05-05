import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface P2POffer {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  nrt_amount: number;
  price_per_nrt: number;
  min_limit: number;
  max_limit: number;
  payment_methods: string[];
  status: 'active' | 'closed';
  created_at: string;
  country: string;
  display_name?: string; // Joined from users
  // Derived display fields
  userName?: string;
  userId?: string;
  asset?: string;
  rating?: number;
  reviewCount?: number;
  completionRate?: number;
  maxAmount?: number;
  paymentMethods?: string[];
}

export interface P2POrder {
  id: string;
  offer_id: string;
  seller_id: string;
  buyer_id: string;
  nrt_amount: number;
  fiat_amount: number;
  payment_method: string;
  status: 'pending' | 'paid' | 'completed' | 'disputed' | 'cancelled';
  proof_url: string | null;
  escrow_locked: boolean;
  has_dispute: boolean;
  created_at: string;
}

export interface PaymentAccount {
  id: string;
  user_id: string;
  provider: string;
  account_name: string;
  account_number: string;
  is_verified: boolean;
  type?: string;
  country?: string;
  // CamelCase aliases for UI compatibility
  accountName?: string;
  accountNumber?: string;
  isVerified?: boolean;
}

/** Helper to normalize DB row into display-friendly shape */
function normalizeOffer(o: any): P2POffer {
  return {
    ...o,
    display_name: o.users?.display_name || o.display_name || 'Unknown User',
    // Map snake_case to camelCase for UI compatibility
    userName: o.users?.display_name || o.display_name || 'Unknown',
    userId: o.user_id,
    asset: 'NRT',
    rating: null,
    reviewCount: 0,
    completionRate: 100,
    maxAmount: o.max_limit || o.nrt_amount,
    paymentMethods: o.payment_methods || [],
  };
}

interface P2PState {
  offers: P2POffer[];
  orders: P2POrder[];
  paymentAccounts: PaymentAccount[];
  isLoading: boolean;
  fetchOffers: (filters?: any) => Promise<void>;
  fetchOrders: (userId: string) => Promise<void>;
  fetchPaymentAccounts: (userId: string) => Promise<void>;
  subscribeToOrders: (userId: string) => () => void;
  createOrder: (order: Omit<P2POrder, 'id' | 'created_at' | 'status' | 'escrow_locked' | 'has_dispute' | 'proof_url'>) => Promise<P2POrder | null>;
  addOffer: (offer: any) => Promise<void>;
  updateOffer: (id: string, updates: any) => Promise<void>;
  deleteOffer: (id: string) => Promise<void>;
  addPaymentAccount: (account: Omit<PaymentAccount, 'id' | 'is_verified' | 'user_id'>) => Promise<void>;
  deletePaymentAccount: (id: string) => Promise<void>;
}

export const useP2PStore = create<P2PState>((set, get) => ({
  offers: [],
  orders: [],
  paymentAccounts: [],
  isLoading: false,
  fetchOffers: async (filters) => {
    set({ isLoading: true });
    let query = supabase
      .from('p2p_offers')
      .select('*, users(display_name)')
      .eq('status', 'active');
    
    if (filters?.type) query = query.eq('type', filters.type);
    if (filters?.country) query = query.eq('country', filters.country);

    const { data, error } = await query;
    if (!error && data) {
      set({ offers: data.map(normalizeOffer) });
    }
    set({ isLoading: false });
  },
  fetchOrders: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('p2p_orders')
      .select('*')
      .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ orders: data });
    }
    set({ isLoading: false });
  },
  fetchPaymentAccounts: async (userId) => {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('user_id', userId);
    
    if (!error && data) {
      set({ paymentAccounts: data.map((a: any) => ({
        ...a,
        accountName: a.account_name,
        accountNumber: a.account_number,
        isVerified: a.is_verified,
      })) });
    }
  },
  subscribeToOrders: (userId: string) => {
    const channelId = `p2p_orders:${userId}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'p2p_orders',
          filter: `seller_id=eq.${userId}`,
        },
        () => get().fetchOrders(userId)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'p2p_orders',
          filter: `buyer_id=eq.${userId}`,
        },
        () => get().fetchOrders(userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
  createOrder: async (order) => {
    const { data, error } = await supabase
      .from('p2p_orders')
      .insert(order)
      .select()
      .single();
    
    if (!error && data) {
      set(state => ({ orders: [data, ...state.orders] }));
      return data;
    }
    return null;
  },

  addOffer: async (offerData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const dbOffer = {
      user_id: user.id,
      type: offerData.type,
      nrt_amount: offerData.maxAmount || 0,
      price_per_nrt: offerData.price || 0,
      min_limit: offerData.minAmount || 0,
      max_limit: offerData.maxAmount || 0,
      payment_methods: offerData.paymentMethods || [],
      status: 'active',
      country: user.user_metadata?.country || 'NG',
    };

    const { data, error } = await supabase
      .from('p2p_offers')
      .insert(dbOffer)
      .select('*, users(display_name)')
      .single();

    if (error) throw error;
    if (data) {
      set(state => ({ offers: [normalizeOffer(data), ...state.offers] }));
    }
  },

  updateOffer: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.price !== undefined) dbUpdates.price_per_nrt = updates.price;
    if (updates.minAmount !== undefined) dbUpdates.min_limit = updates.minAmount;
    if (updates.maxAmount !== undefined) {
      dbUpdates.max_limit = updates.maxAmount;
      dbUpdates.nrt_amount = updates.maxAmount;
    }
    if (updates.paymentMethods !== undefined) dbUpdates.payment_methods = updates.paymentMethods;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { error } = await supabase.from('p2p_offers').update(dbUpdates).eq('id', id);
    if (error) throw error;

    // Refresh offers
    get().fetchOffers();
  },

  deleteOffer: async (id) => {
    const { error } = await supabase.from('p2p_offers').delete().eq('id', id);
    if (!error) {
      set(state => ({ offers: state.offers.filter(o => o.id !== id) }));
    }
  },

  addPaymentAccount: async (account) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dbAccount: any = {
      user_id: user.id,
      provider: account.provider,
      account_name: (account as any).accountName || (account as any).account_name || '',
      account_number: (account as any).accountNumber || (account as any).account_number || '',
    };

    const { error } = await supabase
      .from('payment_accounts')
      .insert(dbAccount);
    
    if (!error) {
      get().fetchPaymentAccounts(user.id);
    }
  },
  deletePaymentAccount: async (id) => {
    const { error } = await supabase
      .from('payment_accounts')
      .delete()
      .eq('id', id);
    
    if (!error) {
      set(state => ({ 
        paymentAccounts: state.paymentAccounts.filter(a => a.id !== id) 
      }));
    }
  },
}));

