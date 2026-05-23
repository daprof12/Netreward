# NetReward — Shared Architecture & Monorepo Guide

## Overview

This document defines the shared codebase strategy that powers all NetReward platforms. The goal is to write business logic **once** and share it across Web, Mobile (Android/iOS), Desktop (Windows/macOS/Linux), and Browser Extensions (Chrome/Edge).

---

## Monorepo Structure

```
netreward/
├── packages/
│   ├── shared/                   ← CORE: Shared across ALL platforms
│   │   ├── lib/
│   │   │   ├── supabase.ts       ← Supabase client (platform-agnostic)
│   │   │   ├── formatNrt.ts      ← NRT number formatting
│   │   │   ├── tax.ts            ← Tax calculation
│   │   │   ├── utils.ts          ← General utilities
│   │   │   ├── netreward-sdk.ts  ← SDK for SP/ISP integration
│   │   │   └── solana.ts         ← Solana/blockchain helpers
│   │   ├── stores/
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useWalletStore.ts
│   │   │   ├── useSpStore.ts
│   │   │   ├── useIspStore.ts
│   │   │   ├── useP2PStore.ts
│   │   │   ├── useNotificationStore.ts
│   │   │   ├── useSecurityStore.ts
│   │   │   ├── useCurrencyStore.ts
│   │   │   ├── useDisputeStore.ts
│   │   │   ├── useFormStore.ts
│   │   │   ├── useAnalyticsStore.ts
│   │   │   ├── useSystemStore.ts
│   │   │   ├── useThemeStore.ts
│   │   │   └── useToastStore.ts
│   │   ├── hooks/
│   │   │   ├── useProfile.ts
│   │   │   ├── useWallet.ts
│   │   │   ├── useTransactions.ts
│   │   │   ├── useCampaigns.ts
│   │   │   ├── useDevices.ts
│   │   │   ├── useDeviceManager.ts
│   │   │   ├── useDeviceAnalytics.ts
│   │   │   ├── useCampaignAnalytics.ts
│   │   │   ├── useReferrals.ts
│   │   │   ├── useWithdrawals.ts
│   │   │   ├── useDisputes.ts
│   │   │   ├── useSupportTickets.ts
│   │   │   ├── useGamingAccounts.ts
│   │   │   ├── usePaymentGateways.ts
│   │   │   ├── useRewardEngine.ts
│   │   │   ├── useTelemetry.ts
│   │   │   ├── useTokenPrice.ts
│   │   │   ├── useNetworkStatus.ts
│   │   │   └── useWalletAutomation.ts
│   │   ├── types/
│   │   │   ├── user.ts
│   │   │   ├── campaign.ts
│   │   │   ├── transaction.ts
│   │   │   ├── device.ts
│   │   │   ├── wallet.ts
│   │   │   └── p2p.ts
│   │   └── theme.ts              ← Shared design tokens
│   │
│   ├── tracker-core/             ← Platform-agnostic telemetry logic
│   │   ├── queue.ts              ← Offline queue (works with any storage)
│   │   ├── reporter.ts           ← Report builder (bytes → API payload)
│   │   └── types.ts
│   │
│   ├── ui-web/                   ← React DOM components
│   │   └── (current src/components)
│   │
│   └── ui-native/                ← React Native components
│       ├── GlassCard.tsx
│       ├── NrtAmount.tsx
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Toast.tsx
│       └── StatCard.tsx
│
├── apps/
│   ├── web/                      ← Current Vite app
│   ├── mobile/                   ← React Native / Expo
│   ├── desktop/                  ← Electron
│   ├── extension-chrome/         ← Chrome Extension
│   └── extension-edge/           ← Edge Extension (symlinked from Chrome)
│
├── supabase/                     ← Shared backend (migrations, functions)
└── docs/                         ← Platform-specific docs
```

---

## Extracting the Shared Package

### Step 1: Create packages/shared

```bash
mkdir -p packages/shared/{lib,stores,hooks,types}

# Move files (keep originals as re-exports for backward compatibility)
cp src/lib/supabase.ts packages/shared/lib/
cp src/lib/formatNrt.ts packages/shared/lib/
cp src/lib/tax.ts packages/shared/lib/
cp src/lib/utils.ts packages/shared/lib/

cp src/stores/*.ts packages/shared/stores/
cp src/hooks/*.ts packages/shared/hooks/
```

### Step 2: Platform-Agnostic Supabase Client

The current `supabase.ts` uses browser-specific `localStorage`. Make it platform-agnostic:

```typescript
// packages/shared/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pmpeyfkbqipfnhokfksl.supabase.co';
const SUPABASE_ANON_KEY = '...'; // From env or config

// Storage adapter interface — each platform provides its own
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Default: browser localStorage
const browserStorage: StorageAdapter = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
};

let storageAdapter: StorageAdapter = browserStorage;

export function setStorageAdapter(adapter: StorageAdapter) {
  storageAdapter = adapter;
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

Each platform initializes with its own storage:
- **Web**: `localStorage` (default)
- **Mobile**: `expo-secure-store`
- **Desktop**: `electron-store`
- **Extension**: `chrome.storage.local`

### Step 3: Platform-Agnostic Auth Store

```typescript
// packages/shared/stores/useAuthStore.ts
// Remove the localStorage.getItem('hasOnboarded') call
// Replace with a platform-injected storage adapter

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Platform provides this at boot time
let platformStorage = {
  get: (key: string) => localStorage.getItem(key),
  set: (key: string, value: string) => localStorage.setItem(key, value),
};

export function setPlatformStorage(adapter: typeof platformStorage) {
  platformStorage = adapter;
}

export const useAuthStore = create((set, get) => ({
  // ... same logic, but use platformStorage instead of localStorage
  isOnboarded: platformStorage.get('hasOnboarded') === 'true',
  setHasOnboarded: (status: boolean) => {
    platformStorage.set('hasOnboarded', String(status));
    set({ isOnboarded: status });
  },
  // ... rest of the store
}));
```

---

## Shared Design Tokens

```typescript
// packages/shared/theme.ts
export const colors = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgCard: '#16161f',
  accentPrimary: '#6366f1',
  accentSecondary: '#8b5cf6',
  accentTertiary: '#a78bfa',
  textPrimary: '#ffffff',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassBg: 'rgba(255,255,255,0.04)',
  destructive: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 48,
} as const;

export const borderRadius = {
  sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32,
} as const;

export const typography = {
  fontFamily: {
    default: 'Inter',
    mono: 'JetBrains Mono',
  },
  sizes: {
    xs: 10, sm: 12, md: 14, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 48,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
} as const;

// Shadow presets
export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
  accent: { shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
};
```

---

## Cross-Platform Component Mapping

| Web Component | Native Component | Notes |
|---------------|-----------------|-------|
| `<div>` | `<View>` | Direct replacement |
| `<span>`, `<p>`, `<h1>` | `<Text>` | All text must be in `<Text>` on RN |
| `<img>` | `<Image>` | Use `source={{ uri }}` |
| `<input>` | `<TextInput>` | Different event names |
| `<button>` | `<Pressable>` | Use Pressable, not TouchableOpacity |
| `<a href>` | `<Link>` (expo-router) | File-based routing |
| `framer-motion` | `react-native-reanimated` | Different API |
| `lucide-react` | `lucide-react-native` | Same icon names |
| `recharts` | `react-native-svg` + custom | No Recharts for RN |
| `react-router-dom` | `expo-router` | File-based routing |
| CSS `backdrop-filter: blur()` | `expo-blur` BlurView | Platform-specific |
| `localStorage` | `AsyncStorage` / `SecureStore` | Injected via adapter |

---

## Admin Cross-Platform Sync (Detailed)

### How Admin Changes Propagate

```
Admin Dashboard (Web Only)
         │
         ▼
    ┌─────────┐
    │ Supabase │ ← Single source of truth
    │    DB    │
    └────┬────┘
         │
    Realtime subscriptions
         │
    ┌────┴────────────────────────────┐
    │                                  │
    ▼          ▼          ▼           ▼
  Web App   Mobile App  Desktop   Extension
  (CF)      (RN/Expo)   (Electron) (Chrome)
```

### Tables That Admin Controls & All Platforms Read

| Table | Admin Action | Platform Effect |
|-------|-------------|-----------------|
| `kv_settings` (maintenance_mode) | Toggle maintenance | All apps show MaintenanceScreen |
| `kv_settings` (token_frozen) | Freeze token | All apps disable send/withdraw |
| `kv_settings` (reward_config) | Update reward rates | Next session uses new rate |
| `campaigns` | Change status | Campaign appears/disappears |
| `users` (status) | Suspend user | User logged out everywhere |
| `feature_flags` | Toggle feature | Feature on/off across all |
| `processing_fees` | Update fees | All apps show new fees |

### Realtime Subscription (Shared Hook)

```typescript
// packages/shared/hooks/useSystemConfig.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useSystemConfig() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [tokenFrozen, setTokenFrozen] = useState(false);

  useEffect(() => {
    // Fetch initial state
    supabase.from('kv_settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'token_frozen'])
      .then(({ data }) => {
        data?.forEach(({ key, value }) => {
          if (key === 'maintenance_mode') setMaintenanceMode(value === 'true');
          if (key === 'token_frozen') setTokenFrozen(value === 'true');
        });
      });

    // Subscribe to changes — works on ALL platforms
    const channel = supabase.channel('system-config')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kv_settings',
        filter: 'key=in.(maintenance_mode,token_frozen)',
      }, (payload) => {
        const { key, value } = payload.new as any;
        if (key === 'maintenance_mode') setMaintenanceMode(value === 'true');
        if (key === 'token_frozen') setTokenFrozen(value === 'true');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { maintenanceMode, tokenFrozen };
}
```

---

## Offline-First Strategy

All non-web platforms must handle offline scenarios:

```typescript
// packages/shared/lib/offline-queue.ts
interface QueuedAction {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'upsert';
  data: Record<string, any>;
  timestamp: number;
}

export class OfflineQueue {
  private queue: QueuedAction[] = [];
  private storageKey = 'nrt_offline_queue';

  constructor(private storage: StorageAdapter) {}

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp'>) {
    const item: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    this.queue.push(item);
    await this.persist();
  }

  async flush() {
    const pending = [...this.queue];
    for (const action of pending) {
      try {
        const { error } = await supabase
          .from(action.table)
          [action.operation](action.data);
        
        if (!error) {
          this.queue = this.queue.filter(q => q.id !== action.id);
        }
      } catch (e) {
        // Still offline — keep in queue
        break;
      }
    }
    await this.persist();
  }

  private async persist() {
    await this.storage.setItem(this.storageKey, JSON.stringify(this.queue));
  }

  async restore() {
    const raw = await this.storage.getItem(this.storageKey);
    if (raw) this.queue = JSON.parse(raw);
  }
}
```

---

## Migration Path

### Phase 1: Extract Shared Package (1 week)
1. Create `packages/shared/` directory
2. Move stores, hooks, lib, and types
3. Update web app imports to use `@shared/` alias
4. Verify web app still builds and works

### Phase 2: Build Platform Apps (concurrent)
- Each platform app imports from `@shared/` 
- Platform-specific UI components are in their own packages
- Telemetry SDKs are platform-specific but share the same API contract

### Phase 3: Admin Enhancements (ongoing)
- Any new admin feature or setting automatically works across all platforms
- New hooks/stores added to `packages/shared/` are immediately available everywhere
