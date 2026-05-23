# NetReward — Android Development Plan

## Overview

A full-featured React Native (Expo) mobile app for Android with background VPN-based telemetry, push notifications, biometric auth, and all user/SP/ISP functionality.

---

## Project Setup

```bash
mkdir -p apps/mobile
cd apps/mobile
npx -y create-expo-app@latest ./ --template tabs
npx expo install expo-router expo-secure-store expo-notifications expo-local-authentication expo-camera expo-barcode-scanner
npm install @supabase/supabase-js zustand @react-navigation/native react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated lucide-react-native
```

---

## Directory Structure

```
apps/mobile/
├── app/                          ← Expo Router (file-based)
│   ├── _layout.tsx               ← Root layout (SafeAreaProvider, theme)
│   ├── index.tsx                 ← Splash/redirect
│   ├── (auth)/
│   │   ├── _layout.tsx           ← Auth layout (no tabs)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx           ← Tab bar layout
│   │   ├── home.tsx              ← Main dashboard
│   │   ├── campaigns.tsx         ← Browse/join campaigns
│   │   ├── wallet.tsx            ← Balance, send, receive, history
│   │   ├── devices.tsx           ← Device & gaming account management
│   │   └── settings.tsx          ← Profile, security, preferences
│   ├── campaign/
│   │   └── [id].tsx              ← Campaign detail + analytics
│   ├── device/
│   │   └── [id].tsx              ← Device detail
│   ├── p2p/
│   │   ├── marketplace.tsx
│   │   ├── create-offer.tsx
│   │   └── order/[id].tsx
│   ├── sp/
│   │   ├── dashboard.tsx
│   │   ├── campaigns.tsx
│   │   ├── create-campaign.tsx
│   │   ├── services.tsx
│   │   └── create-service.tsx
│   ├── isp/
│   │   ├── dashboard.tsx
│   │   ├── campaigns.tsx
│   │   ├── networks.tsx
│   │   └── create-network.tsx
│   ├── scan2pay.tsx
│   ├── kyc.tsx
│   ├── referral.tsx
│   ├── support.tsx
│   ├── transaction-history.tsx
│   └── gaming-accounts.tsx
├── components/
│   ├── ui/
│   │   ├── GlassCard.tsx         ← Glassmorphism card (BlurView)
│   │   ├── NrtAmount.tsx         ← NRT formatter with subscript zeros
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Toast.tsx
│   │   ├── BottomSheet.tsx       ← Modal replacement for mobile
│   │   ├── StatCard.tsx
│   │   └── Skeleton.tsx          ← Loading skeleton
│   ├── layouts/
│   │   ├── SafeScreen.tsx        ← SafeAreaView wrapper
│   │   ├── ScrollScreen.tsx      ← SafeArea + ScrollView
│   │   └── Header.tsx            ← Screen header with back button
│   └── charts/
│       ├── MiniLineChart.tsx     ← SVG-based (react-native-svg)
│       └── PieChart.tsx
├── services/
│   ├── TelemetryService.ts      ← Background telemetry manager
│   ├── NotificationService.ts   ← Push notification handler
│   └── BiometricService.ts      ← Fingerprint/face auth
├── native-modules/
│   └── VpnTelemetry/            ← Native Android VPN module (Kotlin)
│       ├── VpnTelemetryModule.kt
│       └── VpnTelemetryService.kt
├── shared/                       ← Symlink → packages/shared
├── assets/
│   ├── adaptive-icon.png         ← Android adaptive icon (432×432)
│   ├── splash.png                ← Splash screen
│   └── fonts/
│       └── Inter-*.ttf
├── app.json                      ← Expo config
└── eas.json                      ← EAS Build config
```

---

## Critical: Safe Area Implementation

### The SafeScreen Wrapper

Every screen MUST use this wrapper:

```tsx
// components/layouts/SafeScreen.tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

interface SafeScreenProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
}

export default function SafeScreen({ 
  children, 
  edges = ['top', 'bottom'],
  backgroundColor = '#0a0a0f' 
}: SafeScreenProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={edges}>
      <StatusBar style="light" backgroundColor={backgroundColor} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

### Android-Specific Safe Area Concerns

```
┌──────────────────────────────┐
│        STATUS BAR (24dp)     │  ← Translucent, content behind it
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │    CAMERA PUNCH-HOLE    │ │  ← Some devices (Samsung S21+)
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                              │
│                              │
│       YOUR CONTENT HERE      │  ← Safe zone
│                              │
│                              │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │   GESTURE NAV BAR       │ │  ← Android 10+ gesture navigation
│  │   (varies 0–48dp)       │ │     Translucent on many OEMs
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
└──────────────────────────────┘
```

**Rules:**
1. Use `react-native-safe-area-context` (NOT the deprecated `SafeAreaView` from `react-native`)
2. NEVER hardcode top/bottom padding — use `useSafeAreaInsets()`
3. Set `android:windowSoftInputMode="adjustResize"` in `AndroidManifest.xml` for keyboards
4. Test on: Pixel (stock Android), Samsung Galaxy (One UI), Xiaomi (MIUI)
5. For modals/bottom sheets: only apply `edges={['bottom']}` (modal handles top itself)

---

## VPN-Based Telemetry (Android)

### Why VPN?
Android doesn't allow apps to monitor network traffic of other apps unless using `VpnService`. This creates a local VPN tunnel that all traffic passes through, allowing accurate byte-level metering.

### Native Module (Kotlin)

```kotlin
// VpnTelemetryService.kt
class VpnTelemetryService : VpnService() {
    private var totalBytesUp: Long = 0
    private var totalBytesDown: Long = 0
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Create VPN interface
        val builder = Builder()
            .addAddress("10.0.0.2", 32)
            .addRoute("0.0.0.0", 0)
            .setSession("NetReward")
            .setMtu(1500)
        
        val vpnInterface = builder.establish() ?: return START_STICKY
        
        // Start packet forwarding thread
        Thread { forwardPackets(vpnInterface) }.start()
        
        // Show foreground notification (required for Android 8+)
        startForeground(NOTIFICATION_ID, createNotification())
        
        return START_STICKY
    }
    
    private fun forwardPackets(vpnInterface: ParcelFileDescriptor) {
        val input = FileInputStream(vpnInterface.fileDescriptor)
        val output = FileOutputStream(vpnInterface.fileDescriptor)
        val buffer = ByteArray(32767)
        
        while (true) {
            val length = input.read(buffer)
            if (length > 0) {
                totalBytesUp += length
                // Forward packet to real network
                // ... (actual forwarding logic)
            }
        }
    }
}
```

### Foreground Notification

Android 8+ requires a foreground notification for persistent services:

```
┌────────────────────────────────────┐
│ 🟢 NetReward                       │
│ Tracking active · 2.4 GB today     │
│ 45.32 NRT earned                   │
└────────────────────────────────────┘
```

### Permissions Required

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.CAMERA" /> <!-- For QR/Scan2Pay -->

<service
    android:name=".VpnTelemetryService"
    android:permission="android.permission.BIND_VPN_SERVICE"
    android:exported="false">
    <intent-filter>
        <action android:name="android.net.VpnService" />
    </intent-filter>
</service>
```

---

## Push Notifications

```typescript
// services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import { supabase } from '@shared/lib/supabase';

export async function registerPushToken(userId: string) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Store token in Supabase for server-side push
  await supabase.from('push_tokens').upsert({
    user_id: userId,
    token,
    platform: 'android',
    updated_at: new Date().toISOString()
  });
}
```

---

## Biometric Authentication

```typescript
// services/BiometricService.ts
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  if (!hasHardware || !isEnrolled) return false;
  
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access your wallet',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false, // Allow PIN fallback
  });
  
  return result.success;
}
```

---

## Deep Linking

```json
// app.json
{
  "expo": {
    "scheme": "netreward",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            { "scheme": "netreward" },
            { "scheme": "https", "host": "netreward.online", "pathPrefix": "/campaign" },
            { "scheme": "https", "host": "netreward.online", "pathPrefix": "/referral" }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

Supported deep links:
- `netreward://campaign/UUID` → Open campaign detail
- `netreward://referral/CODE` → Apply referral code on signup
- `netreward://wallet` → Open wallet
- `https://netreward.online/campaign/UUID` → App link (Universal Links)

---

## Screen Mapping (Web → Mobile)

| Web Page | Mobile Screen | Notes |
|----------|---------------|-------|
| UserHome | `(tabs)/home` | Simplified cards layout |
| Campaigns | `(tabs)/campaigns` | FlatList with pull-to-refresh |
| WalletPage | `(tabs)/wallet` | Bottom sheet for send/receive |
| Devices | `(tabs)/devices` | Includes gaming accounts tab |
| Settings | `(tabs)/settings` | Nested navigation stack |
| TransactionHistory | `transaction-history` | Full-screen stack |
| P2PMarketplace | `p2p/marketplace` | Full-screen stack |
| ScanToPay | `scan2pay` | Native camera for QR scanning |
| KYCVerification | `kyc` | Camera for document capture |
| SpDashboard | `sp/dashboard` | Role-switched view |
| IspDashboard | `isp/dashboard` | Role-switched view |

---

## Estimated Timeline

| Task | Duration |
|------|----------|
| Expo project setup + navigation | 2 days |
| Shared package integration | 2 days |
| Auth screens (login, register, onboarding) | 3 days |
| Home dashboard + stat cards | 3 days |
| Campaigns (browse, detail, join) | 4 days |
| Wallet (balance, send, receive, history) | 4 days |
| Devices + Gaming accounts | 3 days |
| Settings + Profile + Security | 2 days |
| P2P marketplace | 4 days |
| Scan2Pay (QR camera) | 2 days |
| KYC (camera document upload) | 2 days |
| SP/ISP dashboards | 5 days |
| VPN telemetry native module | 5 days |
| Push notifications | 1 day |
| Biometric auth | 1 day |
| Deep linking | 1 day |
| Testing + safe area fixes | 3 days |
| Play Store submission | 1 day |
| **Total** | **~7–8 weeks** |

---

## Play Store Submission Checklist

- [ ] Google Play Developer account ($25 one-time)
- [ ] App signing key enrolled in Play App Signing
- [ ] Privacy policy URL
- [ ] Data safety form completed
- [ ] Target API level 34+ (Android 14)
- [ ] Screenshots: Phone (1080×1920) + 7" tablet + 10" tablet
- [ ] Feature graphic (1024×500)
- [ ] VPN permission justification (required review)
- [ ] Content rating questionnaire
- [ ] App reviewed for ads/in-app purchases disclosure
