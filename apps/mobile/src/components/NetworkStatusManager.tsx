import React, { useEffect, useRef, useCallback } from 'react';
import * as Network from 'expo-network';
import { useToastStore } from '@/stores/useToastStore';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Polls network state every 10 seconds and shows toasts when
 * connectivity changes. Uses expo-network (no window.addEventListener).
 */
export default function NetworkStatusManager() {
  const { showToast } = useToastStore();
  const prevOnline = useRef<boolean | null>(null); // null = unknown (first check)

  const checkNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      const online = !!(state.isConnected && state.isInternetReachable);

      if (prevOnline.current !== null) {
        if (!online && prevOnline.current) {
          showToast('No internet connection', 'danger');
        } else if (online && !prevOnline.current) {
          showToast('Connection restored', 'success');
        }
      }

      prevOnline.current = online;
    } catch {
      // Silently ignore — network check isn't critical
    }
  }, [showToast]);

  useEffect(() => {
    // Initial check
    checkNetwork();

    // Poll every 10 seconds
    const interval = setInterval(checkNetwork, 10_000);

    // Also re-check when the app comes back to foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkNetwork();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [checkNetwork]);

  return null;
}
