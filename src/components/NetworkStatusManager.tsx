import { useEffect, useRef } from 'react';
import { useToastStore } from '@/stores/useToastStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function NetworkStatusManager() {
  const { isOnline, signalPercentage } = useNetworkStatus();
  const { showToast } = useToastStore();
  
  const prevOnline = useRef(isOnline);
  const prevPoor = useRef(false);

  useEffect(() => {
    // 1. Notice user of no connection
    if (!isOnline && prevOnline.current) {
      showToast('No internet connection', 'danger');
    } 
    // 3. Notice when connection is restored
    else if (isOnline && !prevOnline.current) {
      showToast('Connection restored', 'success');
    }
    
    // 2. Poor connection with signal percentage
    // Consider poor if signal percentage is <= 30%
    const isPoor = isOnline && signalPercentage !== undefined && signalPercentage <= 30;
    
    if (isPoor && !prevPoor.current && isOnline) {
      showToast(`Poor connection detected (${signalPercentage}%)`, 'warning');
    } else if (!isPoor && prevPoor.current && isOnline && prevOnline.current) {
      // Optional: Inform if connection improved significantly, but keeping it simple for now
    }

    prevOnline.current = isOnline;
    prevPoor.current = isPoor;
  }, [isOnline, signalPercentage, showToast]);

  return null;
}
