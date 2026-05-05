import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'user' | 'sp' | 'isp' | 'admin';

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  kyc_verified: boolean;
  kyc_status: 'none' | 'pending' | 'verified' | 'rejected';
  country: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  session: Session | null;
  isOnboarded: boolean;
  isLoading: boolean;
  setUser: (user: User | null, role?: UserRole) => void;
  setSession: (session: Session | null) => void;
  setHasOnboarded: (status: boolean) => void;
  setLoading: (status: boolean) => void;
  initialize: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  role: 'user',
  session: null,
  isOnboarded: localStorage.getItem('hasOnboarded') === 'true',
  isLoading: true,
  setUser: (user, role) => set((state) => ({ 
    user, 
    role: role || (user?.user_metadata?.role as UserRole) || 'user' 
  })),
  setSession: (session) => set({ session }),
  setHasOnboarded: (status) => {
    localStorage.setItem('hasOnboarded', String(status));
    set({ isOnboarded: status });
  },
  setLoading: (status) => set({ isLoading: status }),
  initialize: () => {
    let walletCleanup: (() => void) | null = null;

    const fetchProfile = async (session: Session | null) => {
      if (walletCleanup) {
        walletCleanup();
        walletCleanup = null;
      }

      if (!session?.user) {
        set({ session: null, user: null, profile: null, role: 'user', isLoading: false });
        return;
      }
      
      const role = (session.user.user_metadata?.role as UserRole) || 'user';
      const { profile } = get();
      
      // ONLY set isLoading to true if we don't have a profile yet.
      // This prevents the global "spinner" from clearing the UI during navigations.
      if (!profile) {
        set({ session, user: session.user, role, isLoading: true });
      } else {
        set({ session, user: session.user, role });
      }
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
          
        if (!error && data) {
          set({ profile: data, role: data.role as UserRole });
          
          // Fetch and subscribe to wallet
          const { useWalletStore } = await import('./useWalletStore');
          await useWalletStore.getState().fetchBalance(session.user.id);
          walletCleanup = useWalletStore.getState().subscribeToWallet(session.user.id);

          // Fetch and subscribe to P2P
          const { useP2PStore } = await import('./useP2PStore');
          await useP2PStore.getState().fetchOffers();
          await useP2PStore.getState().fetchOrders(session.user.id);
          await useP2PStore.getState().fetchPaymentAccounts(session.user.id);
          const p2pCleanup = useP2PStore.getState().subscribeToOrders(session.user.id);
          const { useNotificationStore } = await import('./useNotificationStore');
          await useNotificationStore.getState().fetchNotifications(session.user.id);
          const notifCleanup = useNotificationStore.getState().subscribeToNotifications(session.user.id);
          
          const originalCleanup = walletCleanup;
          walletCleanup = () => {
            originalCleanup?.();
            p2pCleanup();
            notifCleanup();
          };

          // Initialize Role-specific stores
          if (role === 'sp') {
            const { useSpStore } = await import('./useSpStore');
            await useSpStore.getState().initialize(session.user.id);
          } else if (role === 'isp') {
            const { useIspStore } = await import('./useIspStore');
            await useIspStore.getState().initialize(session.user.id);
          }
        }
      } catch (e) {
        console.error('Error fetching profile', e);
      } finally {
        set({ isLoading: false });
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session);
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session);
    });
  },
  refreshProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!error && data) {
        set({ profile: data, role: data.role as UserRole });
      }
    } catch (e) {
      console.error('Error refreshing profile', e);
    }
  },
  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null, role: 'user', isLoading: false });
  }
}));
