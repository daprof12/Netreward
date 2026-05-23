import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pmpeyfkbqipfnhokfksl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY';

// Chrome extension storage adapter — uses chrome.storage.local instead of localStorage
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(key, (result) => {
          resolve((result[key] as string) || null);
        });
      } else {
        resolve(localStorage.getItem(key));
      }
    });
  },
  setItem: async (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [key]: value }, () => resolve());
      } else {
        localStorage.setItem(key, value);
        resolve();
      }
    });
  },
  removeItem: async (key: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove(key, () => resolve());
      } else {
        localStorage.removeItem(key);
        resolve();
      }
    });
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
