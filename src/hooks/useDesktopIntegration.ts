import { useEffect, useState } from 'react';
import { useTelemetryStore } from '../stores/useTelemetryStore';

// Extend Window interface for Electron API
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      updateTrayStats: (stats: any) => void;
      showNotification: (title: string, body: string) => void;
      getPlatform: () => Promise<any>;
      onTrackingToggled: (callback: (enabled: boolean) => void) => void;
      onNetworkStats: (callback: (stats: { rxBytes: number; txBytes: number }) => void) => void;
      onUpdaterEvent: (callback: (event: { type: string; info?: any }) => void) => void;
      installUpdate: () => void;
    };
  }
}

export function useDesktopIntegration() {
  const { isTracking, updateStats, dailyStats, stats } = useTelemetryStore();
  const [updaterState, setUpdaterState] = useState<{ status: string; progress?: number; version?: string } | null>(null);
  
  useEffect(() => {
    // Only run in Electron environment
    if (!window.electronAPI) return;

    // 1. Sync React State -> Electron Tray
    window.electronAPI.updateTrayStats({
      gbTracked: dailyStats.total_bytes / (1024 * 1024 * 1024),
      nrtEarned: stats.total_nrt_earned,
      isActive: isTracking
    });

  }, [dailyStats.total_bytes, stats.total_nrt_earned, isTracking]);

  useEffect(() => {
    if (!window.electronAPI) return;

    // 2. Listen for network stats from OS (Electron Main process via systeminformation)
    window.electronAPI.onNetworkStats((netStats) => {
      if (!isTracking) return;
      
      const totalBytes = netStats.rxBytes + netStats.txBytes;
      if (totalBytes > 0) {
        // Feed OS-level data into our telemetry store!
        updateStats(totalBytes);
      }
    });

    // 3. Listen for Auto-Updater events
    window.electronAPI.onUpdaterEvent((event) => {
      switch (event.type) {
        case 'checking':
          setUpdaterState({ status: 'checking' });
          break;
        case 'available':
          setUpdaterState({ status: 'downloading', version: event.info?.version });
          break;
        case 'progress':
          setUpdaterState({ status: 'downloading', progress: event.info?.percent });
          break;
        case 'downloaded':
          setUpdaterState({ status: 'ready', version: event.info?.version });
          window.electronAPI?.showNotification(
            'Update Ready',
            `NetReward v${event.info?.version || ''} is ready to install.`
          );
          break;
        case 'error':
          setUpdaterState({ status: 'error' });
          setTimeout(() => setUpdaterState(null), 5000);
          break;
        default:
          break;
      }
    });

  }, [isTracking, updateStats]);

  const installUpdate = () => {
    window.electronAPI?.installUpdate();
  };

  return {
    isElectron: !!window.electronAPI,
    updaterState,
    installUpdate
  };
}
