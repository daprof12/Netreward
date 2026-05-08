# NetReward SDK & Payment Checkout — Developer Documentation

**Version 2.1.0** | Last updated: May 2026

> One API key. Full platform coverage. Tracker + Payments in a single integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Platform Support Matrix](#platform-support-matrix)
4. [Quick Start (5 minutes)](#quick-start)
5. [Web Integration](#web-integration)
6. [Android Integration](#android-integration)
7. [iOS Integration](#ios-integration)
8. [Linux / Server Integration](#linux-server-integration)
9. [Cross-Platform (Flutter / React Native)](#cross-platform)
10. [Payment Checkout API](#payment-checkout-api)
11. [Backend Server-to-Server](#backend-server-to-server)
12. [Webhook Events](#webhook-events)
13. [Error Codes](#error-codes)
14. [Security Best Practices](#security-best-practices)
15. [Testing & Verification](#testing-verification)
16. [Support & Resources](#support-resources)

---

## 1. Overview

The **NetReward SDK** is a unified integration layer for Service Providers (SP) and Internet Service Providers (ISP) to:

- **Track** — Monitor user engagement, data consumption, and session activity across connected platforms.
- **Reward** — Distribute NRT tokens to users based on verifiable activity data.
- **Collect** — Accept NRT payments via Scan2Pay QR codes, deep-links, or checkout sessions.

**Architecture:**

```
Your Platform ──► NRT SDK (client) ──► api.netreward.online ──► Supabase Ledger
                                                              ──► Solana Mainnet
```

**Single API Key Model:**
Each service/network you create on the NRT dashboard receives a unique API key (`nr_live_*`). This key authorizes both SDK tracking and payment operations — no separate payment keys, webhook secrets, or additional setup required.

---

## 2. Prerequisites

| Requirement | Details |
|:---|:---|
| NRT Account | SP or ISP account at [app.netreward.online](https://app.netreward.online) |
| Service / Network | At least one service (SP) or network (ISP) created in your dashboard |
| API Key | Retrieved from **Settings → Payment API → [Select Service]** |
| Platform | Web (any framework), Android 6+, iOS 14+, Linux (any distro) |

### API Base URL

| Environment | URL |
|:---|:---|
| Production | `https://api.netreward.online/v1` |
| Sandbox | `https://sandbox.netreward.online/v1` |

### Authentication

All requests use Bearer token authentication:

```
Authorization: Bearer nr_live_xxxxxxxxxxxxxxxxxxxx
```

---

## 3. Platform Support Matrix

| Platform | Package / Method | Min Version | Tracker | Payments |
|:---|:---|:---|:---:|:---:|
| **Web (JS/TS)** | `@netreward/sdk` via NPM/Yarn | ES2017+ | ✅ | ✅ |
| **Web (CDN)** | `<script>` tag | Any browser | ✅ | ✅ |
| **Android** | `io.netreward:sdk` via Maven | API 23+ | ✅ | ✅ |
| **iOS** | `NetRewardSDK` via SPM/CocoaPods | iOS 14+ | ✅ | ✅ |
| **Flutter** | `netreward_sdk` via pub.dev | Dart 3.0+ | ✅ | ✅ |
| **React Native** | `@netreward/react-native` via NPM | RN 0.72+ | ✅ | ✅ |
| **Linux/Server** | REST API + cURL/Python/Go/Node | Any | ✅ | ✅ |

---

## 4. Quick Start

### Step 1 — Create a Service

Navigate to your SP Dashboard → **Create Service** → fill in name, category, and at least one platform URL. Your API key is generated automatically.

### Step 2 — Install the SDK

```bash
# Web (NPM)
npm install @netreward/sdk

# Web (CDN) — zero dependencies
<script src="https://cdn.netreward.online/sdk/v2/nrt.min.js"></script>
```

### Step 3 — Initialize

```javascript
import { NetReward } from '@netreward/sdk';

const nrt = NetReward.init({
  apiKey: 'nr_live_xxxxxxxxxxxxxxxxxxxx',
});
```

### Step 4 — Track a Session

```javascript
nrt.track({
  userId: 'user_abc123',
  event: 'page_view',
  metadata: { page: '/dashboard', duration: 45 }
});
```

### Step 5 — Create a Checkout (optional)

```javascript
const session = await nrt.checkout.create({
  amount: 25.00,
  currency: 'USD',
  description: 'Premium Subscription',
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel'
});

window.location.href = session.checkoutUrl;
```

That's it. Five lines of code for tracking, five more for payments.

---

## 5. Web Integration

### NPM / Yarn

```bash
npm install @netreward/sdk
# or
yarn add @netreward/sdk
```

```typescript
import { NetReward } from '@netreward/sdk';

const nrt = NetReward.init({
  apiKey: 'nr_live_xxxxxxxxxxxxxxxxxxxx',
  environment: 'production',     // 'sandbox' for testing
  debug: false,                  // Enable console logging
});

// ── Tracker ─────────────────────────────────────────────

// Track page views automatically
nrt.tracker.autoTrack();

// Track custom events
nrt.tracker.track({
  userId: 'user_123',
  event: 'video_play',
  metadata: {
    videoId: 'vid_001',
    duration: 120,
    quality: '1080p'
  }
});

// Track data consumption (ISP use case)
nrt.tracker.reportUsage({
  userId: 'user_123',
  bytesUp: 1024 * 1024 * 10,     // 10 MB
  bytesDown: 1024 * 1024 * 150,   // 150 MB
  sessionDuration: 3600            // seconds
});

// ── Payment Checkout ────────────────────────────────────

const session = await nrt.checkout.create({
  amount: 49.99,
  currency: 'USD',
  description: 'Annual Plan',
  metadata: { orderId: 'ORD-2026-001', customerId: 'cust_42' },
  successUrl: 'https://example.com/success?session={SESSION_ID}',
  cancelUrl: 'https://example.com/cancel'
});

// Redirect user to hosted checkout
window.location.href = session.checkoutUrl;

// Or embed inline checkout
nrt.checkout.embed('#checkout-container', session.id);
```

### CDN (Script Tag) — Zero Build Step

```html
<script src="https://cdn.netreward.online/sdk/v2/nrt.min.js"></script>
<script>
  const nrt = NRT.init({ apiKey: 'nr_live_xxxxxxxxxxxxxxxxxxxx' });

  // Track
  nrt.tracker.track({
    userId: 'user_123',
    event: 'purchase',
    metadata: { item: 'Premium Plan', value: 29.99 }
  });

  // Checkout
  nrt.checkout.create({
    amount: 29.99,
    currency: 'USD',
    description: 'Premium Plan'
  }).then(session => {
    window.location.href = session.checkoutUrl;
  });
</script>
```

### Framework-Specific Setup

**Next.js / Nuxt.js** — Initialize in `_app.tsx` or plugin:

```typescript
// pages/_app.tsx
import { NetReward } from '@netreward/sdk';

if (typeof window !== 'undefined') {
  NetReward.init({ apiKey: process.env.NEXT_PUBLIC_NRT_API_KEY! });
}
```

**Vue.js** — Plugin pattern:

```typescript
// plugins/netreward.ts
import { NetReward } from '@netreward/sdk';

export default defineNuxtPlugin(() => {
  const nrt = NetReward.init({
    apiKey: useRuntimeConfig().public.nrtApiKey
  });
  return { provide: { nrt } };
});
```

---

## 6. Android Integration

### Gradle Setup

```groovy
// build.gradle (app)
dependencies {
    implementation 'io.netreward:sdk:2.1.0'
}
```

```groovy
// settings.gradle — add Maven repository
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://maven.netreward.online/releases' }
    }
}
```

### Kotlin Integration

```kotlin
import io.netreward.sdk.NetReward
import io.netreward.sdk.NrtConfig

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        
        NetReward.init(
            this,
            NrtConfig.Builder()
                .apiKey("nr_live_xxxxxxxxxxxxxxxxxxxx")
                .environment(NrtConfig.Environment.PRODUCTION)
                .build()
        )
    }
}
```

```kotlin
// Track events
NetReward.tracker.track(
    userId = "user_123",
    event = "app_open",
    metadata = mapOf("screen" to "home", "version" to "3.2.1")
)

// Track data usage
NetReward.tracker.reportUsage(
    userId = "user_123",
    bytesUp = 10_485_760L,    // 10 MB
    bytesDown = 157_286_400L, // 150 MB
    durationSeconds = 3600
)

// Create checkout
val session = NetReward.checkout.create(
    amount = 25.00,
    currency = "USD",
    description = "In-App Purchase",
    metadata = mapOf("orderId" to "AND_001")
)
// Launch checkout activity
NetReward.checkout.launch(this, session.id)
```

### Java Integration

```java
import io.netreward.sdk.NetReward;
import io.netreward.sdk.NrtConfig;

NetReward.init(context, new NrtConfig.Builder()
    .apiKey("nr_live_xxxxxxxxxxxxxxxxxxxx")
    .environment(NrtConfig.Environment.PRODUCTION)
    .build());

NetReward.getTracker().track("user_123", "purchase", Map.of("item", "coins_500"));
```

### Android Permissions

```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## 7. iOS Integration

### Swift Package Manager (Recommended)

In Xcode: **File → Add Package Dependencies**

```
https://github.com/netreward/sdk-ios.git
```

Branch: `main` | Version: `2.1.0+`

### CocoaPods

```ruby
# Podfile
pod 'NetRewardSDK', '~> 2.1'
```

```bash
pod install
```

### Swift Integration

```swift
import NetRewardSDK

// AppDelegate or @main App
@main
struct MyApp: App {
    init() {
        NetReward.configure(apiKey: "nr_live_xxxxxxxxxxxxxxxxxxxx")
    }
    
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
```

```swift
// Track events
NetReward.tracker.track(
    userId: "user_123",
    event: "content_view",
    metadata: ["contentId": "article_42", "category": "tech"]
)

// Track data usage
NetReward.tracker.reportUsage(
    userId: "user_123",
    bytesUp: 10_485_760,
    bytesDown: 157_286_400,
    duration: 3600
)

// Checkout
let session = try await NetReward.checkout.create(
    amount: 9.99,
    currency: "USD",
    description: "Weekly Pass"
)

// Present checkout sheet
NetReward.checkout.present(from: self, sessionId: session.id)
```

### Objective-C

```objc
@import NetRewardSDK;

[NetReward configureWithApiKey:@"nr_live_xxxxxxxxxxxxxxxxxxxx"];

[NetReward.tracker trackWithUserId:@"user_123"
                            event:@"app_launch"
                         metadata:@{@"version": @"2.0"}];
```

---

## 8. Linux / Server Integration

For headless environments, ISP gateway nodes, or server-side tracking.

### cURL

```bash
# Track event
curl -X POST https://api.netreward.online/v1/track \
  -H "Authorization: Bearer nr_live_xxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "event": "data_session",
    "metadata": {
      "bytes_up": 10485760,
      "bytes_down": 157286400,
      "duration_seconds": 3600,
      "node_id": "node_eu_west_1"
    }
  }'

# ISP Heartbeat (Network Health)
curl -X POST https://api.netreward.online/v1/network/heartbeat \
  -H "Authorization: Bearer nr_live_xxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "node_eu_west_1",
    "uptime_pct": 99.98,
    "latency_ms": 12,
    "active_users": 4200
  }'
```

### Python

```bash
pip install netreward-sdk
```

```python
from netreward import NetReward

nrt = NetReward(api_key="nr_live_xxxxxxxxxxxxxxxxxxxx")

# Track
nrt.track(
    user_id="user_123",
    event="data_session",
    metadata={
        "bytes_up": 10_485_760,
        "bytes_down": 157_286_400,
        "duration_seconds": 3600
    }
)

# Create checkout
session = nrt.checkout.create(
    amount=50.00,
    currency="USD",
    description="API Credits Bundle",
    metadata={"order_id": "PY_001"}
)
print(session.checkout_url)
```

### Node.js

```bash
npm install @netreward/node
```

```javascript
const { NetReward } = require('@netreward/node');

const nrt = new NetReward({ apiKey: 'nr_live_xxxxxxxxxxxxxxxxxxxx' });

// Track
await nrt.track({
  userId: 'user_123',
  event: 'subscription_renewed',
  metadata: { plan: 'pro', billingCycle: 'annual' }
});

// Create checkout session (server-side)
const session = await nrt.checkout.create({
  amount: 99.00,
  currency: 'USD',
  description: 'Pro Annual Plan',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel'
});

res.redirect(session.checkoutUrl);
```

### Go

```bash
go get github.com/netreward/sdk-go
```

```go
package main

import (
    "github.com/netreward/sdk-go"
)

func main() {
    nrt := netreward.New("nr_live_xxxxxxxxxxxxxxxxxxxx")

    // Track
    nrt.Track(netreward.TrackParams{
        UserID: "user_123",
        Event:  "heartbeat",
        Metadata: map[string]interface{}{
            "node_id":    "node_us_east_1",
            "uptime_pct": 99.99,
            "latency_ms": 8,
        },
    })

    // Checkout
    session, _ := nrt.Checkout.Create(netreward.CheckoutParams{
        Amount:      25.00,
        Currency:    "USD",
        Description: "API Access",
    })
    fmt.Println(session.CheckoutURL)
}
```

### PHP

```bash
composer require netreward/sdk-php
```

```php
use NetReward\NetReward;

$nrt = new NetReward('nr_live_xxxxxxxxxxxxxxxxxxxx');

// Track
$nrt->track([
    'user_id' => 'user_123',
    'event' => 'page_view',
    'metadata' => ['page' => '/pricing', 'referrer' => 'google']
]);

// Checkout
$session = $nrt->checkout->create([
    'amount' => 15.00,
    'currency' => 'USD',
    'description' => 'Starter Plan'
]);

return redirect($session->checkout_url);
```

### C# / .NET

```bash
dotnet add package NetReward.SDK
```

```csharp
using NetReward;

var nrt = new NetRewardClient("nr_live_xxxxxxxxxxxxxxxxxxxx");

// Track
await nrt.TrackAsync(new TrackEvent {
    UserId = "user_123",
    Event = "file_download",
    Metadata = new { fileId = "doc_42", sizeMb = 15.5 }
});

// Checkout
var session = await nrt.Checkout.CreateAsync(new CheckoutRequest {
    Amount = 29.99m,
    Currency = "USD",
    Description = "Enterprise License"
});

return Redirect(session.CheckoutUrl);
```

---

## 9. Cross-Platform

### Flutter

```yaml
# pubspec.yaml
dependencies:
  netreward_sdk: ^2.1.0
```

```dart
import 'package:netreward_sdk/netreward_sdk.dart';

void main() {
  NetReward.init(apiKey: 'nr_live_xxxxxxxxxxxxxxxxxxxx');
  runApp(MyApp());
}

// Track
NetReward.tracker.track(
  userId: 'user_123',
  event: 'screen_view',
  metadata: {'screen': 'home', 'theme': 'dark'},
);

// Checkout
final session = await NetReward.checkout.create(
  amount: 4.99,
  currency: 'USD',
  description: 'Remove Ads',
);
// Launch in-app browser
NetReward.checkout.launch(session.id);
```

### React Native

```bash
npm install @netreward/react-native
npx pod-install  # iOS only
```

```tsx
import { NetReward } from '@netreward/react-native';

// Initialize (once, in App.tsx)
NetReward.init({ apiKey: 'nr_live_xxxxxxxxxxxxxxxxxxxx' });

// Track
NetReward.tracker.track({
  userId: 'user_123',
  event: 'item_purchased',
  metadata: { itemId: 'sword_99', price: 2.99 }
});

// Checkout
const session = await NetReward.checkout.create({
  amount: 2.99,
  currency: 'USD',
  description: 'Legendary Sword'
});
NetReward.checkout.present(session.id);
```

---

## 10. Payment Checkout API

### Create Checkout Session

```
POST /v1/checkout/sessions
```

**Headers:**

```
Authorization: Bearer nr_live_xxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

**Request Body:**

```json
{
  "amount": 49.99,
  "currency": "USD",
  "description": "Premium Plan — Monthly",
  "metadata": {
    "order_id": "ORD-2026-042",
    "customer_id": "cust_abc123"
  },
  "success_url": "https://yoursite.com/success?session={SESSION_ID}",
  "cancel_url": "https://yoursite.com/cancel"
}
```

**Response:**

```json
{
  "id": "cs_2026_a1b2c3d4e5f6",
  "checkout_url": "https://pay.netreward.online/cs_2026_a1b2c3d4e5f6",
  "amount_nrt": 125.50,
  "exchange_rate": 0.3984,
  "status": "pending",
  "expires_at": "2026-05-08T10:15:00Z"
}
```

### Retrieve Session

```
GET /v1/checkout/sessions/:id
```

### Supported Currencies

| Code | Currency | Oracle |
|:---|:---|:---|
| `USD` | US Dollar | Live NRT/USD |
| `EUR` | Euro | Live NRT/EUR |
| `GBP` | British Pound | Live NRT/GBP |
| `NGN` | Nigerian Naira | Live NRT/NGN |
| `NRT` | NetReward Token | 1:1 (native) |

---

## 11. Backend Server-to-Server

For platforms that need backend-only integration without client SDKs.

### Tracking API

```
POST /v1/track
Authorization: Bearer nr_live_xxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "user_id": "user_123",
  "event": "data_session",
  "timestamp": "2026-05-08T09:30:00Z",
  "metadata": {
    "bytes_up": 10485760,
    "bytes_down": 157286400,
    "duration_seconds": 3600,
    "device_type": "phone",
    "country": "NG"
  }
}
```

**Response:**

```json
{
  "status": "accepted",
  "session_id": "sess_a1b2c3d4",
  "nrt_awarded": 0.045200000
}
```

### ISP Network Health

```
POST /v1/network/heartbeat
Authorization: Bearer nr_live_xxxxxxxxxxxxxxxxxxxx

{
  "node_id": "node_lag_01",
  "uptime_pct": 99.98,
  "latency_ms": 12,
  "packet_loss_pct": 0.001,
  "active_users": 4200,
  "bandwidth_mbps": 950
}
```

---

## 12. Webhook Events

Configure webhook endpoints per service in your NRT dashboard to receive real-time event notifications.

### Event Types

| Event | Trigger |
|:---|:---|
| `payment.success` | Checkout completed successfully |
| `payment.failed` | Payment attempt failed |
| `payment.expired` | Checkout session expired |
| `track.milestone` | User reached a tracking milestone |
| `service.verified` | Your service passed verification |

### Payload Structure

```json
{
  "id": "evt_a1b2c3d4",
  "type": "payment.success",
  "created": "2026-05-08T09:30:00Z",
  "data": {
    "session_id": "cs_2026_a1b2c3d4e5f6",
    "amount_nrt": 125.50,
    "metadata": {
      "order_id": "ORD-2026-042"
    }
  }
}
```

### Signature Verification

Verify the `X-NRT-Signature` header to ensure requests are authentic:

```javascript
// Node.js
const crypto = require('crypto');

app.post('/webhooks/nrt', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-nrt-signature'];
  const expected = crypto
    .createHmac('sha256', API_KEY)
    .update(req.body, 'utf8')
    .digest('hex');

  if (signature !== expected) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  // Handle event.type
  res.status(200).send('OK');
});
```

```python
# Python
import hmac, hashlib

def verify_webhook(payload: bytes, signature: str, api_key: str) -> bool:
    expected = hmac.new(
        api_key.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

```php
// PHP
$signature = $_SERVER['HTTP_X_NRT_SIGNATURE'];
$payload = file_get_contents('php://input');
$expected = hash_hmac('sha256', $payload, $API_KEY);
if (hash_equals($expected, $signature)) { /* Valid */ }
```

---

## 13. Error Codes

| HTTP Code | Error | Description |
|:---|:---|:---|
| `400` | `invalid_request` | Missing or malformed parameters |
| `401` | `unauthorized` | Invalid or expired API key |
| `403` | `forbidden` | API key lacks required permissions |
| `404` | `not_found` | Resource does not exist |
| `409` | `duplicate` | Idempotency conflict (duplicate request) |
| `422` | `validation_error` | Request body failed validation |
| `429` | `rate_limited` | Too many requests (see `Retry-After` header) |
| `500` | `internal_error` | Server-side error (retry with backoff) |

### Rate Limits

| Endpoint | Limit |
|:---|:---|
| `/v1/track` | 1,000 req/min |
| `/v1/checkout/*` | 100 req/min |
| `/v1/network/*` | 500 req/min |

---

## 14. Security Best Practices

1. **Never expose API keys client-side in production.** Use server-side proxies for checkout creation.
2. **Validate webhook signatures** on every incoming request before processing.
3. **Use HTTPS only.** HTTP requests will be rejected.
4. **Rotate keys** periodically via the NRT dashboard.
5. **Use idempotency keys** for checkout creation to prevent duplicate charges:

```
POST /v1/checkout/sessions
Idempotency-Key: unique-request-id-here
```

6. **Store metadata** in checkout sessions (e.g., `order_id`) to reconcile transactions.

---

## 15. Testing & Verification

### Sandbox Mode

Use `environment: 'sandbox'` or the sandbox base URL to test without real transactions:

```javascript
const nrt = NetReward.init({
  apiKey: 'nr_test_xxxxxxxxxxxxxxxxxxxx',
  environment: 'sandbox'
});
```

### Verification Checklist

After integrating, complete these steps to activate your service:

| Step | Action | Expected Result |
|:---|:---|:---|
| 1 | Send a test tracking event | Event appears in Dashboard → Analytics |
| 2 | Create a test checkout session | QR code / checkout URL generated |
| 3 | Complete a sandbox payment | `payment.success` webhook received |
| 4 | Verify webhook signature | Signature matches in your server logs |
| 5 | Submit for review | Admin verifies and activates service |

### Test Cards (Sandbox)

| Card Number | Behavior |
|:---|:---|
| `4242 4242 4242 4242` | Always succeeds |
| `4000 0000 0000 0002` | Always declines |
| `4000 0000 0000 3220` | Triggers 3D Secure |

---

## 16. Support & Resources

| Resource | Link |
|:---|:---|
| Dashboard | [app.netreward.online](https://app.netreward.online) |
| API Status | [status.netreward.online](https://status.netreward.online) |
| SDK Source (Web) | [github.com/netreward/sdk-js](https://github.com/netreward/sdk-js) |
| SDK Source (Android) | [github.com/netreward/sdk-android](https://github.com/netreward/sdk-android) |
| SDK Source (iOS) | [github.com/netreward/sdk-ios](https://github.com/netreward/sdk-ios) |
| Developer Support | [dev@netreward.online](mailto:dev@netreward.online) |
| Discord Community | [discord.gg/netreward](https://discord.gg/netreward) |

---

© 2026 NetReward. All rights reserved.
