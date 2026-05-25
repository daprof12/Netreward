import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/useThemeStore';

export const darkColors = {
  bgPrimary: '#0D1117',
  bgSecondary: '#161B22',
  accentPrimary: '#059669',
  accentSecondary: '#10B981',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textTertiary: '#64748b',
  success: '#059669',
  error: '#ef4444',
  warning: '#f59e0b',
  glassBg: 'rgba(22, 27, 34, 0.7)',
  glassBorder: 'rgba(48, 54, 61, 0.5)',
};

export const lightColors = {
  bgPrimary: '#F6F8FA',
  bgSecondary: '#FFFFFF',
  accentPrimary: '#059669',
  accentSecondary: '#10B981',
  textPrimary: '#1F2328',
  textSecondary: '#656D76',
  textTertiary: '#8C959F',
  success: '#059669',
  error: '#ef4444',
  warning: '#f59e0b',
  glassBg: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(208, 215, 222, 0.5)',
};

export function useThemeColors() {
  const { theme } = useThemeStore();
  const systemTheme = useColorScheme();
  
  if (theme === 'System') {
    return systemTheme === 'light' ? lightColors : darkColors;
  }
  return theme === 'Light' ? lightColors : darkColors;
}

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  glow: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  }
};
