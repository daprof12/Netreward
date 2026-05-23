import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import SafeScreen from '../../src/components/ui/SafeScreen';
import SpDashboardScreen from '../../src/screens/SpDashboardScreen';
import { colors } from '../../src/theme';

export default function SpDashboardRoute() {
  const router = useRouter();
  return (
    <SafeScreen edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.bgPrimary }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, color: colors.accentPrimary }}>← Back</Text>
        </Pressable>
      </View>
      <SpDashboardScreen />
    </SafeScreen>
  );
}
