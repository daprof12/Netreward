import { useEffect, useState } from 'react';
import { useTelemetryStore } from '../stores/useTelemetryStore';
import { useCampaigns } from './useCampaigns';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

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
  const { isTracking, updateStats } = useTelemetryStore();
  const { userEnrollments } = useCampaigns();
  const [updaterState, setUpdaterState] = useState<{ status: string; progress?: number; version?: string } | null>(null);
  
  const totalEarned = userEnrollments?.reduce((sum: number, en: any) => sum + (en.nrt_earned || 0) + (en.unclaimed_nrt || 0), 0) ?? 0;
  const totalDataConsumedGb = userEnrollments?.reduce((sum: number, en: any) => sum + (en.data_consumed_gb || 0), 0) ?? 0;
  
  const [activeService, setActiveService] = useState<string>('');
  const { user } = useAuthStore();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const fetchActiveSession = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase.from('device_data_sessions')
        .select('session_end, campaigns(title)')
        .order('session_end', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0) {
        const s = data[0];
        // Active if session ended within the last 15 minutes
        const isActive = (new Date().getTime() - new Date(s.session_end).getTime() < 15 * 60 * 1000);
        if (isActive && (s.campaigns as any)?.title) {
          setActiveService((s.campaigns as any).title);
        } else {
          setActiveService('');
        }
      }
    };

    fetchActiveSession();
    intervalId = setInterval(fetchActiveSession, 15000);

    return () => clearInterval(intervalId);
  }, [user?.id]);
  
  useEffect(() => {
    // Only run in Electron environment
    if (!window.electronAPI) return;

    // 1. Sync React State -> Electron Tray
    window.electronAPI.updateTrayStats({
      gbTracked: totalDataConsumedGb,
      nrtEarned: totalEarned,
      isActive: isTracking,
      activeService: activeService
    });

  }, [totalDataConsumedGb, totalEarned, isTracking, activeService]);

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
