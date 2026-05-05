import { useState, useEffect } from 'react';

interface CustomNavigator extends Navigator {
  connection?: any;
  mozConnection?: any;
  webkitConnection?: any;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = useState<{
    downlink?: number;
    effectiveType?: string;
    rtt?: number;
    signalPercentage?: number;
  }>({});

  useEffect(() => {
    const nav = navigator as CustomNavigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    const updateConnectionStatus = () => {
      if (connection) {
        let percentage = 100;
        
        // Calculate a rough percentage based on downlink (assuming 10 Mbps is 100%)
        if (typeof connection.downlink === 'number') {
          percentage = Math.min(Math.round((connection.downlink / 10) * 100), 100);
        } else if (connection.effectiveType) {
          switch (connection.effectiveType) {
            case 'slow-2g': percentage = 10; break;
            case '2g': percentage = 30; break;
            case '3g': percentage = 70; break;
            case '4g': percentage = 100; break;
            default: percentage = 100;
          }
        }

        setConnectionInfo({
          downlink: connection.downlink,
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
          signalPercentage: percentage,
        });
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (connection) {
      connection.addEventListener('change', updateConnectionStatus);
      updateConnectionStatus(); // Set initial values
    } else {
      // Fallback if Network Information API is not supported
      setConnectionInfo({ signalPercentage: 100 });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateConnectionStatus);
      }
    };
  }, []);

  return { isOnline, ...connectionInfo };
}
