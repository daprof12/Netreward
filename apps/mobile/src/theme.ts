// NetReward Shared Theme — used by both web and mobile
// All platforms MUST use these exact tokens

export const colors = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgCard: '#16161f',
  bgElevated: '#1c1c2a',
  accentPrimary: '#6366f1',
  accentSecondary: '#8b5cf6',
  accentTertiary: '#a78bfa',
  accentGlow: 'rgba(99, 102, 241, 0.3)',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassBg: 'rgba(255,255,255,0.04)',
  destructive: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const typography = {
  fontFamily: {
    default: 'Inter',
    mono: 'JetBrains Mono',
  },
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};
