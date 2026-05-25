import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN';
export type Language = 'en' | 'es' | 'fr';

interface SettingsState {
  theme: Theme;
  currency: Currency;
  language: Language;
  setTheme: (theme: Theme) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  setLanguage: (language: Language) => Promise<void>;
  initializeSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark', // default to dark
  currency: 'USD',
  language: 'en',

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
