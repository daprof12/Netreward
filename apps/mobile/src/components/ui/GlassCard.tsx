import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, borderRadius, shadows } from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: boolean;
}

/**
 * GlassCard — translates the web glassmorphism look to native.
 * Uses solid dark backgrounds with subtle borders (no backdrop-filter on native).
 */
export default function GlassCard({ children, style, gradient }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        gradient && styles.gradient,
        shadows.md,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
  },
  gradient: {
    backgroundColor: '#1a1a32',
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
});
