import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

export type UserRole = 'user' | 'sp' | 'isp' | 'admin';

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  active_role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  kyc_verified: boolean;
  kyc_status: 'none' | 'pending' | 'verified' | 'rejected';
  country: string | null;
}

interface AuthState {
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setOnboarded: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isOnboarded: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      // Check onboarding state
      const onboarded = await SecureStore.getItemAsync('hasOnboarded');
      set({ isOnboarded: onboarded === 'true' });

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data) {
          set({ profile: data as UserProfile, isAuthenticated: true });
        }
      }
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        set({ profile: data as UserProfile || null, isAuthenticated: !!data });
      } else {
        set({ profile: null, isAuthenticated: false });
      }
    });
  },

  signIn: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Sign in failed' };
    }
  },

  signUp: async (email, password, displayName) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, role: 'user' } },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Sign up failed' };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ profile: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (data) {
      set({ profile: data as UserProfile });
    }
  },

  setOnboarded: async () => {
    await SecureStore.setItemAsync('hasOnboarded', 'true');
    set({ isOnboarded: true });
  },
}));
