# NRT Integration Guide: Payment API & SDK

This guide provides sample implementations for Service Providers (SP) and Internet Service Providers (ISP) to integrate the NetReward (NRT) ecosystem into their platforms.

---

## 1. Credentials Setup

Before integrating, ensure you have retrieved your credentials from the **Settings > Integrated Platforms** section of your dashboard:
- `API_KEY`: Frontend SDK initialization.
- `SECRET_KEY`: Server-side API authentication.
- `WEBHOOK_SECRET`: HMAC-SHA256 signature verification.

---

## 2. Web Integration (React / JavaScript)

### SDK Initialization
```javascript
import { NrtTracker } from '@daprof12/tracker';

const nrt = new NrtTracker({
  apiKey: 'YOUR_API_KEY',
  environment: 'production'
});
```

### Track Service Usage
```javascript
// Track a user session (e.g., after a video stream ends)
await nrt.trackSession({
  userId: 'user_123',
  bytesConsumed: 500 * 1024 * 1024, // 500MB
  category: 'streaming'
});
```

### Create Checkout Session (Backend)
```javascript
// Server-side (Node.js)
const response = await fetch('https://api.netreward.online/v1/checkout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SECRET_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 25.00,
    currency: 'USD',
    order_id: 'ORDER_999'
  })
});

const { checkout_url } = await response.json();
// Redirect user to checkout_url
```

---

## 3. iOS Integration (Swift)

### SDK Initialization
```swift
import NetRewardSDK

let nrt = NetRewardTracker(
    apiKey: "YOUR_API_KEY",
    bundleId: "com.yourcompany.app"
)
```

### Track Activity
```swift
func didFinishDataTask(bytes: Int64) {
    nrt.trackActivity(
        userId: "user_123",
        bytes: bytes,
        type: .browsing
    ) { result in
        switch result {
        case .success: print("Reward signal sent")
        case .failure(let error): print("Error: \(error)")
        }
    }
}
```

---

## 4. Android Integration (Kotlin)

### SDK Initialization
```kotlin
import io.netreward.sdk.NrtTracker

val nrt = NrtTracker.Builder()
    .setApiKey("YOUR_API_KEY")
    .setPackageName("com.yourcompany.app")
    .build(context)
```

### Track Activity
```kotlin
fun onDownloadComplete(totalBytes: Long) {
    nrt.trackSession(
        userId = "user_123",
        bytes = totalBytes,
        category = "download",
        callback = object : NrtCallback {
            override fun onSuccess() { /* Success logic */ }
            override fun onError(e: Exception) { /* Error logic */ }
        }
    )
}
```

---

## 5. ISP / Network Heartbeat (Global)

ISPs integrate at the network level to report node health and aggregate data flow.

```bash
# Example Heartbeat (Crontab or Systemd Service)
curl -X POST https://api.netreward.online/v1/network/heartbeat \
  -H "Authorization: Bearer $SECRET_KEY" \
  -d '{
    "node_id": "NYC_NODE_01",
    "asn": "AS6453",
    "active_users": 1420,
    "throughput_gbps": 12.5
  }'
```

---

## 6. Webhook Signature Verification (Node.js)

```javascript
const crypto = require('crypto');

app.post('/webhooks/nrt', (req, res) => {
  const signature = req.headers['x-nrt-signature'];
  const payload = JSON.stringify(req.body);
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature === `hmac-sha256=${expectedSignature}`) {
    // Process event: payment.success, campaign.low_budget, etc.
    res.status(200).send('OK');
  } else {
    res.status(401).send('Invalid Signature');
  }
});
```

---

## 7. Post-Approval Technical Checklist

Once the Admin approves your request, your status moves to `test_pending`. To reach `verified` and start receiving live traffic:

1. **Successful Heartbeat**: Send at least 1 successful SDK tracking signal or Heartbeat from your production IP.
2. **Webhook Verification**: Configure your Webhook URL in Settings and successfully respond with a `200 OK` to a test ping.
3. **Wallet Funding**: Your SP/ISP wallet must have a minimum balance of 100 NRT to activate campaigns.

---

## 8. Data Auditing (Admin Requirements)

To maintain ecosystem integrity, the NRT Admin automatically fetches or requires reporting of the following data:

| Data Point | Purpose | Frequency |
| :--- | :--- | :--- |
| **User Bytes** | Reward Calculation | Every 5-10 mins |
| **Node Latency** | Network Quality Audit | Hourly |
| **Session IP** | Geo-targeting Verification | Per Session |
| **Order Status** | Payment Reconciliation | Instant (via Webhook) |
| **Traffic Anomaly** | Fraud Prevention | Real-time |

---

## 9. Next Steps
1. **Join a Campaign**: Ensure your Service/Network is linked to an active campaign.
2. **Fund Budget**: Deposit NRT into your platform wallet to start rewarding users.
3. **Monitor**: Use the [SP/ISP Dashboard](https://app.netreward.online/dashboard) to track ROI in real-time.
