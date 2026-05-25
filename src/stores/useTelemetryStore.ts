import { create } from 'zustand';

interface TelemetryState {
  isTracking: boolean;
  dailyStats: {
    total_bytes: number;
  };
  stats: {
    total_nrt_earned: number;
  };
  toggleTracking: () => void;
  updateStats: (bytes: number) => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  isTracking: false,
  dailyStats: {
    total_bytes: 0,
  },
  stats: {
    total_nrt_earned: 0,
  },
  toggleTracking: () => set((state) => ({ isTracking: !state.isTracking })),
  updateStats: (bytes) =>
    set((state) => ({
      dailyStats: {
        ...state.dailyStats,
        total_bytes: state.dailyStats.total_bytes + bytes,
      },
    })),
}));
