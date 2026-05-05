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

export function useDeviceManager() {
  const { user } = useAuthStore();
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // If we already have cached device info for this user, restore it immediately
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
        // 1. Try to detect Geolocation & ISP via Edge Function
        let geoData: any = null;
        try {
          const { data, error: geoError } = await supabase.functions.invoke('get-location', {
            headers: { 'x-client-info': 'netreward-web' }
          });
          if (!geoError) geoData = data;
        } catch (e) {
          // Silently ignore CORS/Network errors for the edge function
        }

        // 2. Fallback to basic IP if Edge Function fails
        if (!geoData) {
          try {
            const fbResponse = await fetch('https://ipapi.co/json/');
            if (fbResponse.ok) {
              const fbData = await fbResponse.json();
              geoData = { 
                ip: fbData.ip, 
                country: fbData.country_name || 'Unknown', 
                isp: fbData.org || fbData.asn || 'Unknown ISP' 
              };
            }
          } catch (e) {
            geoData = { ip: '0.0.0.0', country: 'Unknown', isp: 'Unknown ISP' };
          }
        }

        // 3. Detect Device Info (Browser Side)
        const ua = navigator.userAgent;
        let deviceType: DeviceInfo['type'] = 'other';
        let os = 'Unknown OS';

        if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';
        else if (/mobile|iphone|android/i.test(ua)) deviceType = 'phone';
        else deviceType = 'laptop'; // Default for desktop/laptop

        if (ua.indexOf("Win") !== -1) os = "Windows";
        if (ua.indexOf("Mac") !== -1) os = "MacOS";
        if (ua.indexOf("X11") !== -1) os = "UNIX";
        if (ua.indexOf("Linux") !== -1) os = "Linux";
        if (/Android/.test(ua)) os = "Android";
        if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";

        const deviceInfo: DeviceInfo = {
          name: `${os} ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`,
          type: deviceType,
          os: os,
          ip: geoData?.ip || '0.0.0.0',
          country: geoData?.country_name || geoData?.country || 'Unknown',
          isp: geoData?.org || geoData?.isp || 'Unknown ISP',
        };

        setCurrentDevice(deviceInfo);

        // 4. Update User Country if empty (Ignore if fails due to RLS)
        try {
          const { data: userData } = await supabase.from('users').select('country').eq('id', user.id).maybeSingle();
          if (userData && !userData.country && deviceInfo.country !== 'Unknown') {
            await supabase.from('users').update({ country: deviceInfo.country }).eq('id', user.id);
          }
        } catch (e) {
          // Ignore RLS errors on user update
        }

        // 5. Persistent Hardware Fingerprint
        let fingerprint = localStorage.getItem('nrt_device_fingerprint');
        if (!fingerprint) {
          fingerprint = crypto.randomUUID();
          localStorage.setItem('nrt_device_fingerprint', fingerprint);
        }

        // 6. Check Device Linkage
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('id, user_id')
          .eq('fingerprint', fingerprint)
          .maybeSingle();

        const isLinkedToCurrentUser = existingDevice?.user_id === user.id;
        const isLinkedToOtherUser = existingDevice && existingDevice.user_id !== user.id;

        const finalDeviceInfo: DeviceInfo = {
          ...deviceInfo,
          fingerprint,
          isLinkedToCurrentUser: !!isLinkedToCurrentUser,
          isLinkedToOtherUser: !!isLinkedToOtherUser,
          deviceId: existingDevice?.id
        };

        setCurrentDevice(finalDeviceInfo);
        cachedDeviceInfo = finalDeviceInfo; // cache for future remounts

        if (isLinkedToCurrentUser) {
          // Update existing device info (keep it fresh)
          await supabase.from('devices').update({ 
            status: 'active', 
            ip_address: finalDeviceInfo.ip,
            country: finalDeviceInfo.country,
            isp_name: finalDeviceInfo.isp,
            updated_at: new Date().toISOString() 
          }).eq('id', existingDevice.id);
        }

        registeredUserId = user.id;
      } catch (error) {
        // Log critical errors but don't break the UI
        console.error('Device manager error:', error);
      } finally {
        isDeviceRegistrationRunning = false;
        setIsLoading(false);
      }
    };

    detectAndRegisterDevice();
  }, [user?.id]); // Use user.id to prevent unnecessary re-runs

  return { currentDevice, isLoading };
}
