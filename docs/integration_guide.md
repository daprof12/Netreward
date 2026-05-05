# NRT Integration Guide: Payment API & SDK

This guide provides sample implementations for Service Providers (SP) and Internet Service Providers (ISP) to integrate the NetReward (NRT) ecosystem into their platforms.

---

## 1. Credentials Setup

Before integrating, ensure you have retrieved your credentials from the **Settings > Integrated Platforms** section of your dashboard:
- `API_KEY`: Frontend SDK initialization.
- `SECRET_KEY`: Server-side API authentication.
- `WEBHOOK_SECRET`: HMAC-SHA256 signature verification.

---

## 2. SDK & Package Locations

Developers can include the NRT SDKs via the following package managers:

| Platform | Package Manager | Package Name / Repository |
| :--- | :--- | :--- |
| **Web** | NPM / Yarn | `@daprof12/tracker` |
| **iOS** | SPM / CocoaPods | `github.com/daprof12/sdk-ios` |
| **Android** | Maven / JitPack | `io.netreward:sdk-android` |
| **Flutter** | Pub.dev | `net_reward_sdk` |
| **React Native** | NPM | `react-native-netreward-sdk` |

---

## 3. Web & Cross-Platform Integration

### React / JavaScript
```javascript
import { NrtTracker } from '@daprof12/tracker';

const nrt = new NrtTracker({
  apiKey: 'YOUR_API_KEY',
  environment: 'production' // defaults to api.netreward.online
});
```

### Flutter (Dart)
```dart
import 'package:net_reward_sdk/net_reward_sdk.dart';

void main() {
  NrtTracker.init(apiKey: "YOUR_API_KEY");
}

// Track Data Usage
NrtTracker.instance.track(
  userId: "user_123",
  mBytes: 150.5,
  category: "browsing"
);
```

### React Native
```typescript
import NrtTracker from 'react-native-netreward-sdk';

NrtTracker.setup("YOUR_API_KEY");

// Tracking session
NrtTracker.trackSession("user_123", 1024 * 1024 * 50); // 50MB
```

---

## 4. Native Mobile Integration

### iOS (Swift)
```swift
import NetRewardSDK

let nrt = NetRewardTracker(apiKey: "YOUR_API_KEY")

nrt.trackActivity(userId: "user_123", bytes: 500000, type: .video)
```

### Android (Kotlin)
```kotlin
import io.netreward.sdk.NrtTracker

val nrt = NrtTracker.Builder()
    .setApiKey("YOUR_API_KEY")
    .build(context)

nrt.trackSession(userId = "user_123", bytes = 1000000L)
```

---

## 5. Backend Integration (Server-to-Server)

Use these for payment creation, volume reporting, or status synchronization.

### Python (Django / FastAPI)
```python
import requests

def create_checkout(amount, order_id):
    headers = {"Authorization": f"Bearer {SECRET_KEY}"}
    payload = {"amount": amount, "order_id": order_id}
    response = requests.post("https://api.netreward.online/v1/checkout", json=payload, headers=headers)
    return response.json()["checkout_url"]
```

### PHP (Laravel / Plain)
```php
$response = Http::withToken($SECRET_KEY)->post('https://api.netreward.online/v1/checkout', [
    'amount' => 50.00,
    'order_id' => 'PHP_ORD_1'
]);
return redirect($response->json()['checkout_url']);
```

### Go
```go
func ReportHeartbeat(nodeID string) {
    client := &http.Client{}
    data := url.Values{}
    data.Set("node_id", nodeID)
    req, _ := http.NewRequest("POST", "https://api.netreward.online/v1/network/heartbeat", strings.NewReader(data.Encode()))
    req.Header.Add("Authorization", "Bearer "+SecretKey)
    client.Do(req)
}
```

### C# (.NET)
```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", SecretKey);
var payload = new { amount = 20.0, order_id = "NET_123" };
var response = await client.PostAsJsonAsync("https://api.netreward.online/v1/checkout", payload);
```

### C++ (libcurl)
```cpp
CURL *curl = curl_easy_init();
if(curl) {
    curl_easy_setopt(curl, CURLOPT_URL, "https://api.netreward.online/v1/network/heartbeat");
    struct curl_slist *headers = curl_slist_append(NULL, "Authorization: Bearer YOUR_SECRET");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_perform(curl);
}
```

---

## 6. Webhook Verification (Universal)

Verify the `X-NRT-Signature` header to ensure requests are from NetReward.

**Node.js:**
```javascript
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
// Verify: req.headers['x-nrt-signature'] === `hmac-sha256=${digest}`
```

**PHP:**
```php
$signature = $_SERVER['HTTP_X_NRT_SIGNATURE'];
$payload = file_get_contents('php://input');
$expected = 'hmac-sha256=' . hash_hmac('sha256', $payload, $WEBHOOK_SECRET);
if (hash_equals($expected, $signature)) { /* Valid */ }
```

**Python:**
```python
import hmac, hashlib
expected = 'hmac-sha256=' + hmac.new(WEBHOOK_SECRET.encode(), request.data, hashlib.sha256).hexdigest()
```

---

## 7. Post-Approval Technical Checklist

Once approved (Status: `test_pending`):
1. **API Key**: Retrieve from your Dashboard.
2. **First Signal**: Send a test track/heartbeat from your integration.
3. **Webhook Ping**: Respond with `200 OK` to the NRT test webhook.
4. **Verified**: Admin will toggle status to `verified` once signals are confirmed.

---

## 8. Data Auditing Requirements

| Data Point | Purpose | Frequency |
| :--- | :--- | :--- |
| **Traffic Metadata** | Fraud Detection | Real-time |
| **Resource Usage** | Reward Allocation | 5-min intervals |
| **Health Status** | Node Reliability | Hourly |

---

## 9. Resources
- **Integration Guide**: [integration_guide.md](file:///Users/apple/Documents/NetReward/docs/integration_guide.md)
- **SDK Hosting Guide**: [SDK_HOSTING_GUIDE.md](file:///Users/apple/Documents/NetReward/docs/SDK_HOSTING_GUIDE.md)
- **Docs**: [docs.netreward.online](https://docs.netreward.online)
- **Dashboard**: [app.netreward.online](https://app.netreward.online)
- **Dev Support**: [dev@netreward.online](mailto:dev@netreward.online)
