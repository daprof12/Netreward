import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme';

interface SafeScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  backgroundColor?: string;
  style?: ViewStyle;
}

/**
 * SafeScreen — CRITICAL wrapper for all screens.
 * 
 * Handles safe area insets for:
 * - Android: status bar, camera punch-holes, gesture navigation bar
 * - iOS: notch, Dynamic Island, home indicator, rounded corners
 * 
 * RULES:
 * 1. Tab screens: use edges={['top']} (tab bar handles bottom)
 * 2. Full screens: use edges={['top', 'bottom']}
 * 3. Modals: use edges={['bottom']} (modal header handles top)
 * 4. NEVER hardcode padding values
 */
export default function SafeScreen({
  children,
  edges = ['top', 'bottom'],
  backgroundColor = colors.bgPrimary,
  style,
}: SafeScreenProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
      <StatusBar style="light" backgroundColor={backgroundColor} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
