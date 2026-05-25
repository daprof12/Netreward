import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface SystemSettings {
  spCashbackPercentage: number;
  ispCashbackPercentage: number;
  gbPerNrt: number;
  nrtUsdValue: number;
  targetReachCostUsd: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

interface SystemStore {
  settings: SystemSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateNotificationSettings: (updates: Partial<Pick<SystemSettings, 'notificationsEnabled' | 'soundEnabled' | 'vibrationEnabled'>>) => void;
}

export const useSystemStore = create<SystemStore>((set) => ({
  settings: {
    spCashbackPercentage: 10,
    ispCashbackPercentage: 5,
    gbPerNrt: 2250, // Default fallback
    nrtUsdValue: 450, // Default fallback
    targetReachCostUsd: 0.10, // Default fallback
    notificationsEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  },
  isLoading: false,
  updateNotificationSettings: (updates) => set((state) => ({
    settings: { ...state.settings, ...updates }
  })),
  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('kv_settings')
        .select('key, value')
        .in('key', ['system_config', 'reward_config']);
      
      if (error) {
        console.error('Error fetching system settings:', error);
      } else if (data && data.length > 0) {
        const config = data.find(s => s.key === 'system_config')?.value || {};
        const rewardConfig = data.find(s => s.key === 'reward_config')?.value || {};
        
        set({
          settings: {
            spCashbackPercentage: Number(config.spCashbackPercentage || 10),
            ispCashbackPercentage: Number(config.ispCashbackPercentage || 5),
            gbPerNrt: Number(rewardConfig.gbPerNrt || 2250),
            nrtUsdValue: Number(rewardConfig.nrtUsdValue || 450),
            targetReachCostUsd: Number(rewardConfig.targetReachCostUsd || 0.10),
            notificationsEnabled: config.notificationsEnabled ?? true,
            soundEnabled: config.soundEnabled ?? true,
            vibrationEnabled: config.vibrationEnabled ?? true,
          }
        });
      }
    } catch (err) {
      console.error('SystemStore fetch error:', err);
    } finally {
      set({ isLoading: false });
    }
  }
}));
