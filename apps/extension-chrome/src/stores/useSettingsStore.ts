import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type Theme = 'dark' | 'light';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN';
export type Language = 'en' | 'es' | 'fr';

interface SettingsState {
  theme: Theme;
  currency: Currency;
  language: Language;
  nrtPrice: number;
  setTheme: (theme: Theme) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  initializeSettings: () => Promise<void>;
  fetchNrtPrice: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark', // default to dark
  currency: 'USD',
  language: 'en',
  nrtPrice: 0.005,

  initializeSettings: async () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await chrome.storage.local.get(['theme', 'currency', 'language']) as { theme?: string, currency?: string, language?: string };
      const theme = result.theme || 'dark';
      set({ 
        theme: theme as Theme, 
        currency: (result.currency || 'USD') as Currency, 
        language: (result.language || 'en') as Language 
      });
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      const theme = (localStorage.getItem('theme') || 'dark') as Theme;
      set({
        theme,
        currency: (localStorage.getItem('currency') || 'USD') as Currency,
        language: (localStorage.getItem('language') || 'en') as Language
      });
      document.documentElement.setAttribute('data-theme', theme);
    }
    get().fetchNrtPrice();
  },

  fetchNrtPrice: async () => {
    try {
      const { data } = await supabase
        .from('kv_settings')
        .select('value')
        .eq('key', 'token_config')
        .maybeSingle();
      if (data?.value) {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (parsed?.currentValue) {
          set({ nrtPrice: Number(parsed.currentValue) });
        }
      }
    } catch (e) {
      console.warn('fetchNrtPrice error', e);
    }
  },

  setTheme: async (theme) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ theme });
    } else {
      localStorage.setItem('theme', theme);
    }
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
  },

  setCurrency: async (currency) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ currency });
    } else {
      localStorage.setItem('currency', currency);
    }
    set({ currency });
  },

  setLanguage: async (language) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ language });
    } else {
      localStorage.setItem('language', language);
    }
    set({ language });
  },
}));
