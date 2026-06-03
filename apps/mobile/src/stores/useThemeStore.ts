import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { customStorage } from '@/lib/storage';

export type Theme = 'Light' | 'Dark' | 'System';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'System',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => customStorage),
    }
  )
);
