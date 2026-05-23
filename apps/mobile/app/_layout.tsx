import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/useAuthStore';
import { colors } from '../src/theme';

export default function RootLayout() {
  const { profile, isLoading, isAuthenticated, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';
    const activeRole = profile?.active_role || profile?.role || 'user';

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
    } else if (isAuthenticated && inAuthGroup) {
      // Direct user based on role
      if (activeRole === 'sp') {
        router.replace('/dashboard/sp');
      } else if (activeRole === 'isp') {
        router.replace('/dashboard/isp');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isLoading, isAuthenticated, segments, profile]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.bgPrimary} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgPrimary } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="dashboard/sp" />
        <Stack.Screen name="dashboard/isp" />
        <Stack.Screen name="wallet/p2p" />
        <Stack.Screen name="wallet/scan2pay" />
        <Stack.Screen name="settings/kyc" />
        <Stack.Screen name="settings/referrals" />
        <Stack.Screen name="settings/history" />
      </Stack>
    </>
  );
}
