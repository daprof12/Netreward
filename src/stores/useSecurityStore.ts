import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SecurityState {
  biometricsEnabled: boolean;
  isBiometricSetup: boolean;
  pin: string | null;
  isLocked: boolean;
  setBiometricsEnabled: (enabled: boolean) => void;
  setBiometricSetup: (setup: boolean) => void;
  setPin: (pin: string | null) => void;
  setIsLocked: (locked: boolean) => void;
  unlock: (pinAttempt?: string) => boolean;
}

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      biometricsEnabled: false,
      isBiometricSetup: false,
      pin: null,
      isLocked: false,
      setBiometricsEnabled: (enabled) => set({ biometricsEnabled: enabled }),
      setBiometricSetup: (setup) => set({ isBiometricSetup: setup }),
      setPin: (pin) => set({ pin }),
      setIsLocked: (locked) => set({ isLocked: locked }),
      unlock: (pinAttempt) => {
        const state = get();
        if (pinAttempt && state.pin === pinAttempt) {
          set({ isLocked: false });
          return true;
        } else if (!pinAttempt && state.biometricsEnabled && state.isBiometricSetup) {
          // Biometric unlock
          set({ isLocked: false });
          return true;
        }
        return false;
      }
    }),
    {
      name: 'netreward-security-storage',
      partialize: (state) => ({ 
        biometricsEnabled: state.biometricsEnabled, 
        isBiometricSetup: state.isBiometricSetup, 
        pin: state.pin 
        // DO NOT persist isLocked to avoid getting stuck if they close the app?
        // Wait, normally apps lock on restart. Let's persist isLocked, or just set it to true on init if pin or biometrics is enabled.
      })
    }
  )
);
