import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const DEFAULT_PRICE = 0.005;

/**
 * Shared hook for reading the live NRT token price from kv_settings.
 * Falls back to DEFAULT_PRICE if the setting doesn't exist.
 */
export function useTokenPrice() {
  const [price, setPrice] = useState(DEFAULT_PRICE);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('kv_settings')
          .select('value')
          .eq('key', 'token_config')
          .maybeSingle();
        if (data?.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (parsed?.currentValue) setPrice(Number(parsed.currentValue));
        }
      } catch (e) {
        console.warn('useTokenPrice: failed to fetch, using default', e);
      }
    })();
  }, []);

  return price;
}

/**
 * Non-hook version for use in Zustand stores or outside React components.
 * Returns a promise resolving to the current NRT price.
 */
export async function getTokenPrice(): Promise<number> {
  try {
    const { data } = await supabase
      .from('kv_settings')
      .select('value')
      .eq('key', 'token_config')
      .maybeSingle();
    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (parsed?.currentValue) return Number(parsed.currentValue);
    }
  } catch (e) {
    console.warn('getTokenPrice: failed to fetch, using default', e);
  }
  return DEFAULT_PRICE;
}
