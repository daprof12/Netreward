# NetReward — iOS Development Plan

## Overview

iOS shares the same React Native + Expo codebase as Android. This document covers **iOS-specific** considerations, entitlements, and Apple ecosystem requirements.

---

## iOS-Specific Project Configuration

### app.json (iOS section)

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.netreward.app",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "NetReward uses your camera for QR code scanning and KYC document verification",
        "NSFaceIDUsageDescription": "NetReward uses Face ID to secure your wallet",
        "NSLocalNetworkUsageDescription": "NetReward monitors network usage to track data for rewards",
        "UIBackgroundModes": ["fetch", "remote-notification", "network-authentication"]
      },
      "entitlements": {
        "com.apple.developer.networking.networkextension": [
          "packet-tunnel-provider"
        ]
      },
      "associatedDomains": [
        "applinks:netreward.online",
        "webcredentials:netreward.online"
      ],
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-notifications",
      "expo-local-authentication",
      "expo-camera",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "15.0"
          }
        }
      ]
    ]
  }
}
```

---

## Critical: iOS Safe Area Implementation

### Device Inset Map

```
iPhone SE (3rd gen)         iPhone 15                 iPhone 16 Pro
┌──────────────────┐       ┌──────────────────┐      ┌──────────────────┐
│ ▄▄▄ STATUS (20pt)│       │ ▄▄▄▄▄▄▄▄ (59pt)  │      │ ╔═══╗ DI  (59pt) │
│                  │       │  (notch area)     │      │ ║   ║            │
│                  │       │                   │      │ ╚═══╝            │
│                  │       │                   │      │                  │
│   SAFE CONTENT   │       │   SAFE CONTENT    │      │   SAFE CONTENT   │
│                  │       │                   │      │                  │
│                  │       │                   │      │                  │
│ ── HOME BTN ──── │       │ ─── (34pt) ───── │      │ ─── (34pt) ───── │
└──────────────────┘       └──────────────────┘      └──────────────────┘
  top: 20pt                  top: 59pt                 top: 59pt
  bottom: 0pt                bottom: 34pt              bottom: 34pt
```

### Dynamic Insets with Hook

```tsx
// Using insets dynamically for custom layouts
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomHeader() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ 
      paddingTop: insets.top + 8,  // Safe area + extra padding
      paddingHorizontal: 16,
      backgroundColor: '#0a0a0f',
    }}>
      <Text style={styles.title}>Dashboard</Text>
    </View>
  );
}
```

### Rules for iOS Safe Areas

1. **Always** wrap root screens in `<SafeAreaView edges={['top', 'bottom']}>`
2. **Tab bar screens**: Use `edges={['top']}` only (tab bar handles bottom)
3. **Modals**: Use `edges={['bottom']}` only (modal header handles top)
4. **Landscape**: Include `edges={['left', 'right']}` for notch devices in landscape
5. **ScrollView**: Don't apply safe area to ScrollView content — only to the container
6. **Keyboard**: Use `KeyboardAvoidingView` with `behavior="padding"` on iOS (not `"height"`)
7. **Never** hardcode inset values — they differ per device model

### Testing Devices (Required)

| Device | Why |
|--------|-----|
| iPhone SE 3rd gen | Small screen, no notch, home button |
| iPhone 14 | Standard notch |
| iPhone 15 | Dynamic Island |
| iPhone 16 Pro Max | Largest screen + Dynamic Island |
| iPad Pro 12.9" | Tablet layout testing |

---

## Network Extension for Telemetry

### Apple's Restrictions

Unlike Android's VpnService, Apple's NetworkExtension requires:
1. **Paid Apple Developer Account** ($99/year)
2. **Explicit entitlement request** — you must request `com.apple.developer.networking.networkextension` from Apple
3. **Apple review approval** — Apple manually reviews apps using Network Extension
4. **Valid business justification** — "data metering for user rewards" is acceptable

### NEPacketTunnelProvider (Swift)

```swift
// PacketTunnelProvider.swift
import NetworkExtension

class PacketTunnelProvider: NEPacketTunnelProvider {
    var totalBytesUp: UInt64 = 0
    var totalBytesDown: UInt64 = 0
    
    override func startTunnel(options: [String: NSObject]?, 
                               completionHandler: @escaping (Error?) -> Void) {
        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "10.0.0.1")
        settings.ipv4Settings = NEIPv4Settings(addresses: ["10.0.0.2"], 
                                                subnetMasks: ["255.255.255.0"])
        settings.ipv4Settings?.includedRoutes = [NEIPv4Route.default()]
        settings.mtu = 1500
        
        setTunnelNetworkSettings(settings) { error in
            if error == nil {
                self.readPackets()
            }
            completionHandler(error)
        }
    }
    
    private func readPackets() {
        packetFlow.readPackets { packets, protocols in
            for packet in packets {
                self.totalBytesUp += UInt64(packet.count)
                // Forward packet
                self.packetFlow.writePackets([packet], withProtocols: protocols)
            }
            self.readPackets() // Continue reading
        }
    }
    
    override func stopTunnel(with reason: NEProviderStopReason, 
                              completionHandler: @escaping () -> Void) {
        // Report final telemetry
        reportTelemetry()
        completionHandler()
    }
}
```

### Alternative: NWPathMonitor (Simpler, Less Accurate)

If Apple rejects the Network Extension, use `NWPathMonitor` for basic connectivity tracking:

```swift
import Network

let monitor = NWPathMonitor()
monitor.pathUpdateHandler = { path in
    if path.status == .satisfied {
        // Track connection type, not bytes
        let isExpensive = path.isExpensive // cellular
        let isConstrained = path.isConstrained // low data mode
    }
}
monitor.start(queue: DispatchQueue.global())
```

This is less accurate (no byte-level metering) but doesn't require special entitlements.

---

## App Tracking Transparency (ATT)

Apple **requires** the ATT dialog before any tracking:

```tsx
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

async function requestTracking() {
  const { status } = await requestTrackingPermissionsAsync();
  
  if (status === 'granted') {
    // Enable telemetry
    startTelemetry();
  } else {
    // Tracking denied — explain to user why it matters
    showTrackingExplanationModal();
  }
}
```

### Best Practice
Show a **pre-permission screen** before the ATT dialog explaining:
- "NetReward measures your network data usage to reward you with NRT tokens"
- "We never track your browsing history or personal data"
- "You can disable tracking anytime in Settings"

Then trigger the ATT dialog. This significantly increases opt-in rates.

---

## Apple Sign-In

**Required** if you offer any third-party login (Google, etc.):

```tsx
import * as AppleAuthentication from 'expo-apple-authentication';

async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
  });
  
  // Use credential.identityToken with Supabase
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken!,
  });
}
```

---

## Keychain Storage

Store sensitive data in iOS Keychain (NOT AsyncStorage):

```tsx
import * as SecureStore from 'expo-secure-store';

// Store wallet private key
await SecureStore.setItemAsync('wallet_private_key', encryptedKey, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: true, // Requires biometric to read
});

// Retrieve
const key = await SecureStore.getItemAsync('wallet_private_key');
```

---

## In-App Purchase Considerations

> **Warning**: If you sell NRT tokens directly in-app, Apple takes a 30% commission.

### Recommended Strategy
- **Free to download** — all earning features are free
- **NRT purchases**: Direct users to the web app (like Spotify/Netflix do)
- **P2P trading**: Happens on-chain, not subject to Apple's IAP rules
- **Withdrawals**: Process via Supabase Edge Functions, not Apple

---

## Background Modes

```xml
<!-- Info.plist background modes -->
UIBackgroundModes:
  - fetch              ← Background fetch for syncing telemetry
  - remote-notification ← Push notification wake-up
  - network-authentication ← Network Extension (if approved)
```

### Background Fetch

```tsx
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const TELEMETRY_TASK = 'TELEMETRY_SYNC';

TaskManager.defineTask(TELEMETRY_TASK, async () => {
  // Sync queued telemetry data
  await syncTelemetryQueue();
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// Register (minimum interval: 15 minutes on iOS)
await BackgroundFetch.registerTaskAsync(TELEMETRY_TASK, {
  minimumInterval: 15 * 60,
  stopOnTerminate: false,
  startOnBoot: true,
});
```

---

## Estimated Timeline (After Android)

Since the codebase is shared with Android, iOS-specific work is minimal:

| Task | Duration |
|------|----------|
| iOS-specific config (app.json, entitlements) | 1 day |
| Apple Sign-In integration | 1 day |
| ATT dialog implementation | 0.5 days |
| Keychain (SecureStore) migration | 1 day |
| Network Extension (if pursuing) | 3–5 days |
| Safe area testing on all device sizes | 2 days |
| App Store screenshots + metadata | 1 day |
| TestFlight submission + review | 1 day |
| **Total** | **~2–3 weeks** |

---

## App Store Submission Checklist

- [ ] Apple Developer account ($99/year)
- [ ] App Store Connect listing created
- [ ] Privacy nutrition labels completed
- [ ] ATT purpose string in Info.plist
- [ ] Apple Sign-In implemented (if other providers exist)
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max), 6.1" (iPhone 15), 5.5" (iPhone 8 Plus)
- [ ] iPad screenshots (if universal)
- [ ] App preview video (optional but recommended)
- [ ] Export compliance (encryption questionnaire)
- [ ] Content rating
- [ ] Network Extension entitlement (if using)
- [ ] TestFlight beta testing (minimum 1 week recommended)
