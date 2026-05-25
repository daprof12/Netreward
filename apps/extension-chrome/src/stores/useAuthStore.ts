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
  hasCompletedOnboarding: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  hasCompletedOnboarding: true, // defaults to true until we check storage

  initialize: async () => {
    set({ isLoading: true });
    try {
      // Check onboarding status from chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get('hasCompletedOnboarding') as { hasCompletedOnboarding?: boolean };
        set({ hasCompletedOnboarding: result.hasCompletedOnboarding ?? false });
      } else {
        // Fallback for local testing outside extension
        const local = localStorage.getItem('hasCompletedOnboarding');
        set({ hasCompletedOnboarding: local === 'true' });
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session error:', error.message);
        // Clear local storage manually as signOut might fail with same invalid token
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const keys = await chrome.storage.local.get(null);
          const supabaseKeys = Object.keys(keys).filter(k => k.startsWith('sb-'));
          if (supabaseKeys.length > 0) {
            await chrome.storage.local.remove(supabaseKeys);
          }
        }
        await supabase.auth.signOut().catch(() => {});
        set({ isAuthenticated: false, profile: null });
        return;
      }

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
      await supabase.auth.signOut().catch(() => {});
      set({ isAuthenticated: false, profile: null });
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

  completeOnboarding: async () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ hasCompletedOnboarding: true });
    } else {
      localStorage.setItem('hasCompletedOnboarding', 'true');
    }
    set({ hasCompletedOnboarding: true });
  },
}));
