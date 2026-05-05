import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      name: 'theme-store',
    }
  )
);
