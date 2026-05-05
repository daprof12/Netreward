import { useEffect } from 'react';
import { useThemeStore } from '@/stores/useThemeStore';

export default function ThemeManager() {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'System') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(systemTheme.matches);

      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      systemTheme.addEventListener('change', listener);
      return () => systemTheme.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'Dark');
    }
  }, [theme]);

  return null;
}
