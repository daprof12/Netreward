import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type UserRole = 'user' | 'sp' | 'isp' | 'admin';

interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  active_role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  nrt_balance?: number;
}

interface AuthState {
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data) {
          set({
            profile: data,
            isAuthenticated: true,
          });
        }
      }
    } catch (e) {
      console.error('Auth init error:', e);
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data) {
          set({ profile: data, isAuthenticated: true });
        }
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
      set({ profile: data });
    }
  },
}));
