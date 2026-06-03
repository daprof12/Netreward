import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState<{
    type?: string;
    signalPercentage?: number;
  }>({ signalPercentage: 100 });

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true);
      
      let signalPct = 100;
      if (state.type === 'wifi' && state.details && 'strength' in state.details) {
        signalPct = (state.details as any).strength ?? 100;
      } else if (state.type === 'cellular' && state.details && 'cellularGeneration' in state.details) {
        const gen = (state.details as any).cellularGeneration;
        if (gen === '2g') signalPct = 25;
        else if (gen === '3g') signalPct = 50;
        else if (gen === '4g') signalPct = 75;
        else if (gen === '5g') signalPct = 100;
        else signalPct = 75;
      }

      setConnectionInfo({
        type: state.type.toUpperCase(),
        signalPercentage: signalPct
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOnline, ...connectionInfo };
}
