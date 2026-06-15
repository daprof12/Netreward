import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useWalletStore } from './useWalletStore';
import { useP2PStore } from './useP2PStore';
import { useNotificationStore } from './useNotificationStore';
import { useSpStore } from './useSpStore';
import { useIspStore } from './useIspStore';

export type UserRole = 'user' | 'sp' | 'isp' | 'admin';

interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  active_role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  kyc_verified: boolean;
  kyc_status: 'none' | 'pending' | 'verified' | 'rejected';
  kyc_user_status: 'none' | 'pending' | 'verified' | 'rejected';
  kyc_sp_status:   'none' | 'pending' | 'verified' | 'rejected';
  kyc_isp_status:  'none' | 'pending' | 'verified' | 'rejected';
  country: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  active_role: UserRole;
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
  active_role: 'user',
  session: null,
  isOnboarded: false,
  isLoading: true,
  setUser: (user, role) => {
    const targetRole = role || (user?.user_metadata?.role as UserRole) || 'user';
    const targetActiveRole = (user?.user_metadata?.active_role as UserRole) || role || (user?.user_metadata?.role as UserRole) || 'user';
    set({ 
      user, 
      role: targetRole,
      active_role: targetActiveRole
    });
    if (user?.id) {
      if (targetActiveRole === 'sp') {
        useSpStore.getState().initialize(user.id).catch(console.error);
      } else if (targetActiveRole === 'isp') {
        useIspStore.getState().initialize(user.id).catch(console.error);
      }
    }
  },
  setSession: (session) => set({ session }),
  setHasOnboarded: (status) => {
    SecureStore.setItemAsync('hasOnboarded', String(status));
    set({ isOnboarded: status });
  },
  setLoading: (status) => set({ isLoading: status }),
  initialize: () => {
    SecureStore.getItemAsync('hasOnboarded').then((val) => {
      if (val === 'true') set({ isOnboarded: true });
    });
    let walletCleanup: (() => void) | null = null;

    const fetchProfile = async (session: Session | null) => {
      if (walletCleanup) {
        walletCleanup();
        walletCleanup = null;
      }

      if (!session?.user) {
        set({ session: null, user: null, profile: null, role: 'user', active_role: 'user', isLoading: false });
        return;
      }
      
      const { profile, role: currentRole, active_role: currentActiveRole } = get();
      
      // If we already have a profile in state, preserve the current role to prevent UI flashing
      // Otherwise, try to get it from JWT metadata, fallback to 'user'
      const role = profile ? currentRole : ((session.user.user_metadata?.role as UserRole) || 'user');
      const active_role = profile ? currentActiveRole : ((session.user.user_metadata?.active_role as UserRole) || role);
      
      // ONLY set isLoading to true if we don't have a profile yet.
      // This prevents the global "spinner" from clearing the UI during navigations.
      if (!profile) {
        set({ session, user: session.user, role, active_role, isLoading: true });
      } else {
        set({ session, user: session.user, role, active_role });
      }
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
          
        if (!error && data) {
          set({ profile: data, role: data.role as UserRole, active_role: (data.active_role || data.role) as UserRole });
          
          // Fetch and subscribe to wallet
          await useWalletStore.getState().fetchBalance(session.user.id);
          walletCleanup = useWalletStore.getState().subscribeToWallet(session.user.id);

          // Fetch and subscribe to P2P
          await useP2PStore.getState().fetchOffers();
          await useP2PStore.getState().fetchOrders(session.user.id);
          await useP2PStore.getState().fetchPaymentAccounts(session.user.id);
          const p2pCleanup = useP2PStore.getState().subscribeToOrders(session.user.id);
          await useNotificationStore.getState().fetchNotifications(session.user.id);
          const notifCleanup = useNotificationStore.getState().subscribeToNotifications(session.user.id);
          
          const originalCleanup = walletCleanup;
          walletCleanup = () => {
            originalCleanup?.();
            p2pCleanup();
            notifCleanup();
          };

          // Initialize Role-specific stores
          const targetActiveRole = (data.active_role || data.role) as UserRole;
          if (targetActiveRole === 'sp') {
            await useSpStore.getState().initialize(session.user.id);
          } else if (targetActiveRole === 'isp') {
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
        const targetActiveRole = (data.active_role || data.role) as UserRole;
        set({ profile: data, role: data.role as UserRole, active_role: targetActiveRole });
        if (targetActiveRole === 'sp') {
          await useSpStore.getState().initialize(session.user.id);
        } else if (targetActiveRole === 'isp') {
          await useIspStore.getState().initialize(session.user.id);
        }
      }
    } catch (e) {
      console.error('Error refreshing profile', e);
    }
  },
  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null, role: 'user', active_role: 'user', isLoading: false });
  }
}));
