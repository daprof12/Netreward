import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

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

// ── Device & OS detection ───────────────────────────────────────────────────

function detectDeviceType(): DeviceInfo['type'] {
  const ua = navigator.userAgent;

  // Modern browsers: navigator.userAgentData (Chrome 90+, Edge 90+)
  const uaData = (navigator as any).userAgentData;
  if (uaData?.mobile === true) return 'phone';
  if (uaData?.mobile === false && !uaData?.platform?.toLowerCase().includes('mobile')) {
    // Could still be tablet — fall through to UA check
  }

  // iPad iOS 13+ reports as desktop — use pointer coarseness + screen ratio
  const isTouchDevice = navigator.maxTouchPoints > 1;
  const isLargeScreen = Math.min(window.screen.width, window.screen.height) >= 768;

  if (/ipad/i.test(ua)) return 'tablet';
  if (isTouchDevice && isLargeScreen && /macintosh/i.test(ua)) return 'tablet'; // iPad 13+
  if (/tablet|playbook|silk/i.test(ua)) return 'tablet';
  if (isTouchDevice && !isLargeScreen) return 'phone';
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua)) return 'phone';
  if (/android/i.test(ua) && !/tablet/i.test(ua)) {
    // Android without "tablet" in UA — check screen size
    return isLargeScreen ? 'tablet' : 'phone';
  }

  return 'laptop';
}

function detectOS(): string {
  const ua = navigator.userAgent;
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';

  if (/iPhone|iPad|iPod/.test(ua) || /^iP/.test(platform)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Win/.test(platform) || /Win/.test(ua)) return 'Windows';
  if (/Mac/.test(platform) || /Macintosh/.test(ua)) return 'macOS';
  if (/Linux/.test(platform) || /Linux/.test(ua)) return 'Linux';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  return 'Unknown OS';
}

function buildDeviceName(os: string, type: DeviceInfo['type']): string {
  const typeName = { phone: 'Phone', tablet: 'Tablet', laptop: 'Laptop', desktop: 'Desktop', other: 'Device' }[type];
  // Try to get brand from UA
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  const samsungMatch = ua.match(/SM-[A-Z0-9]+/);
  if (samsungMatch) return `Samsung ${samsungMatch[0]}`;
  const pixelMatch = ua.match(/Pixel [0-9a-zA-Z ]+/);
  if (pixelMatch) return pixelMatch[0].trim();
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
        let fingerprint = localStorage.getItem('nrt_device_fingerprint');
        if (!fingerprint) {
          fingerprint = crypto.randomUUID();
          localStorage.setItem('nrt_device_fingerprint', fingerprint);
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

  return { currentDevice, isLoading };
}
