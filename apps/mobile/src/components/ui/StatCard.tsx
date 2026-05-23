import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, borderRadius, shadows } from '../../theme';

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  valueColor?: string;
  style?: ViewStyle;
}

export default function StatCard({ icon, iconBg, label, value, valueColor, style }: StatCardProps) {
  return (
    <View style={[styles.card, shadows.sm, style]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 12,
    gap: 4,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
});
