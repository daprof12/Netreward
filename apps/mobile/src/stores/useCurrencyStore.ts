import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTokenPrice } from '@/hooks/useTokenPrice';

export type Currency = {
  code: string;
  symbol: string;
  rate: number; // Rate relative to USD (1 NRT = 1 USD)
};

export const CURRENCIES: Record<string, Currency> = {
  'USD': { code: 'USD', symbol: '$', rate: 0.005 },
  'EUR': { code: 'EUR', symbol: '€', rate: 0.0046 },
  'GBP': { code: 'GBP', symbol: '£', rate: 0.00395 },
  'NGN': { code: 'NGN', symbol: '₦', rate: 7.5 },
};

// Cache the token price so we don't query on every conversion
let cachedNrtPrice = 0.005;
getTokenPrice().then(p => { cachedNrtPrice = p; });

interface CurrencyStore {
  selectedCurrency: string; // e.g. "USD ($)"
  setCurrency: (currency: string) => void;
  getCurrencyDetails: () => Currency;
  convertNrt: (nrtAmount: number) => { amount: string; symbol: string };
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      selectedCurrency: 'USD ($)',
      setCurrency: (currency) => set({ selectedCurrency: currency }),
      getCurrencyDetails: () => {
        const code = get().selectedCurrency.split(' ')[0];
        return CURRENCIES[code] || CURRENCIES['USD'];
      },
      convertNrt: (nrtAmount) => {
        const { symbol, rate: currencyRate } = get().getCurrencyDetails();
        
        // nrtAmount * (USD / NRT) * (Fiat / USD) = Fiat
        // Here, the rate in CURRENCIES was originally based on USD=0.005
        const converted = nrtAmount * cachedNrtPrice * (currencyRate / 0.005); 
        return {
          amount: converted.toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 7 
          }),
          symbol
        };
      }
    }),
    {
      name: 'currency-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
