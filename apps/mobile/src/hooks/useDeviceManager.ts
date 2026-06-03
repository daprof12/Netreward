import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

interface DeviceInfo {
  name: string;
  type: 'phone' | 'laptop' | 'tablet' | 'desktop' | 'other';
  os: string;
  ip: string;
  country: string;
  isp: string;
  fingerprint: string;
  isLinkedToCurrentUser: boolean;
  isLinkedToOtherUser: boolean;
  deviceId?: string;
}

let isDeviceRegistrationRunning = false;
let registeredUserId: string | null = null;
let cachedDeviceInfo: DeviceInfo | null = null; // persist across remounts

// Bridge so Devices.tsx can update the cache immediately after linking
// without needing a full hook remount.
if (typeof window !== 'undefined') {
  (window as any).__nrtPatchDeviceCache = (patch: Partial<DeviceInfo>) => {
    if (cachedDeviceInfo) {
      cachedDeviceInfo = { ...cachedDeviceInfo, ...patch };
    }
  };
}

// ── Device & OS detection ───────────────────────────────────────────────────

function detectDeviceType(): DeviceInfo['type'] {
  if (Platform.OS === 'ios') return 'phone';
  if (Platform.OS === 'android') return 'phone';
  return 'phone'; // simple fallback for mobile
}

function detectOS(): string {
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'android') return 'Android';
  return 'Unknown OS';
}

function buildDeviceName(os: string, type: DeviceInfo['type']): string {
  const typeName = { phone: 'Phone', tablet: 'Tablet', laptop: 'Laptop', desktop: 'Desktop', other: 'Device' }[type];
  return `${os} ${typeName}`;
}

// ── Geo / ISP detection with fallback chain ─────────────────────────────────

async function getGeoData(): Promise<{ ip: string; country: string; isp: string }> {
  // 1. Try Supabase Edge Function (most accurate, uses server-side IP)
  try {
    const { data, error } = await supabase.functions.invoke('get-location', {
      headers: { 'x-client-info': 'netreward-web' },
    });
    if (!error && data?.country) {
      return {
        ip: data.ip || '0.0.0.0',
        country: data.country_name || data.country || 'Unknown',
        isp: data.org || data.isp || 'Unknown ISP',
      };
    }
  } catch { /* ignore */ }

  // 2. ipapi.co — works on most networks
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const d = await res.json();
      if (d.ip && !d.error) {
        return {
          ip: d.ip,
          country: d.country_name || 'Unknown',
          isp: d.org || d.asn || 'Unknown ISP',
        };
      }
    }
  } catch { /* ignore */ }

  // 3. ip-api.com — free, works well on mobile (HTTP, but we use HTTPS proxy)
  try {
    const res = await fetch('https://ip-api.com/json/?fields=status,message,country,org,query', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.status === 'success') {
        return {
          ip: d.query || '0.0.0.0',
          country: d.country || 'Unknown',
          isp: d.org || 'Unknown ISP',
        };
      }
    }
  } catch { /* ignore */ }

  // 4. ipinfo.io — fallback
  try {
    const res = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const d = await res.json();
      return {
        ip: d.ip || '0.0.0.0',
        country: d.country || 'Unknown',
        isp: d.org || 'Unknown ISP',
      };
    }
  } catch { /* ignore */ }

  // 5. Last resort — just get the IP
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const d = await res.json();
      return { ip: d.ip || '0.0.0.0', country: 'Unknown', isp: 'Unknown ISP' };
    }
  } catch { /* ignore */ }

  return { ip: '0.0.0.0', country: 'Unknown', isp: 'Unknown ISP' };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDeviceManager() {
  const { user } = useAuthStore();
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Restore from cache immediately (avoids blank state on remount)
    if (registeredUserId === user.id && cachedDeviceInfo) {
      setCurrentDevice(cachedDeviceInfo);
      return;
    }

    // Prevent duplicate concurrent executions
    if (isDeviceRegistrationRunning) return;

    const detectAndRegisterDevice = async () => {
      isDeviceRegistrationRunning = true;
      setIsLoading(true);

      try {
        // 1. Detect device type & OS (synchronous — always works)
        const deviceType = detectDeviceType();
        const os = detectOS();
        const name = buildDeviceName(os, deviceType);

        // 2. Get geo / ISP data (async with fallback chain)
        const geoData = await getGeoData();

        const deviceInfo = { name, type: deviceType, os, ...geoData };

        // Show basic info immediately while we check linkage
        setCurrentDevice({
          ...deviceInfo,
          fingerprint: '',
          isLinkedToCurrentUser: false,
          isLinkedToOtherUser: false,
        });

        // 3. Update user country if not set
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('country')
            .eq('id', user.id)
            .maybeSingle();
          if (userData && !userData.country && geoData.country !== 'Unknown') {
            await supabase.from('users').update({ country: geoData.country }).eq('id', user.id);
          }
        } catch { /* ignore RLS errors */ }

        // 4. Persistent hardware fingerprint
        let fingerprint = await SecureStore.getItemAsync('nrt_device_fingerprint');
        if (!fingerprint) {
          fingerprint = Crypto.randomUUID();
          await SecureStore.setItemAsync('nrt_device_fingerprint', fingerprint);
        }

        // 5. Check device linkage in DB
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('id, user_id')
          .eq('fingerprint', fingerprint)
          .maybeSingle();

        const isLinkedToCurrentUser = existingDevice?.user_id === user.id;
        const isLinkedToOtherUser = !!(existingDevice && existingDevice.user_id !== user.id);

        const finalDeviceInfo: DeviceInfo = {
          ...deviceInfo,
          fingerprint,
          isLinkedToCurrentUser: !!isLinkedToCurrentUser,
          isLinkedToOtherUser,
          deviceId: existingDevice?.id,
        };

        setCurrentDevice(finalDeviceInfo);
        cachedDeviceInfo = finalDeviceInfo; // cache for future remounts

        // 6. Keep existing linked device fresh
        if (isLinkedToCurrentUser && existingDevice) {
          await supabase.from('devices').update({
            status: 'active',
            ip_address: geoData.ip,
            country: geoData.country,
            isp_name: geoData.isp,
            updated_at: new Date().toISOString(),
          }).eq('id', existingDevice.id);
        }

        registeredUserId = user.id;
      } catch (error) {
        console.error('Device manager error:', error);
      } finally {
        isDeviceRegistrationRunning = false;
        setIsLoading(false);
      }
    };

    detectAndRegisterDevice();
  }, [user?.id]);

  useEffect(() => {
    if (!currentDevice?.deviceId || !currentDevice?.isLinkedToCurrentUser) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        supabase.from('devices').update({ status: 'offline' }).eq('id', currentDevice.deviceId).then();
      } else if (nextState === 'active') {
        supabase.from('devices').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', currentDevice.deviceId).then();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [currentDevice?.deviceId, currentDevice?.isLinkedToCurrentUser]);

  return { currentDevice, isLoading };
}
