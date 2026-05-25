import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import { useThemeColors } from '@/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetworkStatusManager from '@/components/NetworkStatusManager';

const queryClient = new QueryClient();

export default function RootLayout() {
  const colors = useThemeColors();
  const { initialize, isLoading, user, isOnboarded } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initialize();
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isRoot = (segments as string[]).length === 0;

    if (!isOnboarded) {
      if (segments[0] !== 'onboarding') {
        router.replace('/onboarding');
      }
    } else if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else {
      if (inAuthGroup || isRoot || segments[0] === 'onboarding') {
        router.replace('/(tabs)');
      }
    }
  }, [user, isOnboarded, isLoading, isReady, segments]);

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <NetworkStatusManager />
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
