import { useDeviceManager } from '@/hooks/useDeviceManager';

/**
 * Background manager that automatically detects and registers
 * the current device and location information for the logged-in user.
 */
export function DeviceAutomationManager() {
  useDeviceManager();
  return null;
}
