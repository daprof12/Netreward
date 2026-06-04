# NetReward Gaming Integration Guide

This document outlines how game developers can integrate the NetReward ecosystem to track player bandwidth/usage, reward players with NRT tokens, and allow players to spend their NRT tokens on in-game purchases or subscriptions.

## 1. Single API Key Architecture

NetReward uses a **Single API Key** architecture for both **Data Tracking** and **Payments**.

1. **Obtain your API Key**: Register your game as a Service Provider (SP) on the NetReward Publisher Dashboard.
2. **Select "Gaming" Category**: Set your campaign category to "Gaming" to ensure you benefit from optimized bandwidth tracking rates and targeted rewards.
3. **Copy your SDK Key**: This key starts with `nr_live_...` or `nr_test_...` and is used to initialize the SDK.

---

## 2. Web Game Integration (HTML5 / React / WebGL)

For web-based games, integration requires zero custom tracking code. NetReward automatically intercepts WebSocket, Fetch, and XHR requests to accurately track bandwidth and time spent in-game.

### Step 1: Add the Script Tag
Add the NetReward tracker script to your `index.html` file, passing your API Key and category via data attributes:

```html
<script 
  src="https://cdn.netreward.online/sdk/v2/nrt.min.js" 
  data-api-key="nr_live_YOUR_API_KEY_HERE" 
  data-category="gaming" 
  data-gaming-platform="web"
  defer>
</script>
```

*(Note: During local development, point the `src` to your local tracker instance, e.g., `http://localhost:5173/tracker.js`)*

### Step 2: Let NetReward Do the Work
Once the script is loaded:
1. It automatically generates a secure device fingerprint.
2. It hooks into your game's WebSockets and Fetch requests.
3. It periodically flushes bandwidth reports to the NetReward Edge Functions.
4. Players automatically earn NRT based on their engagement and bandwidth usage without needing to manually link a console account.

---

## 3. Custom Event Tracking (Optional)

If you wish to log custom events (e.g., `game_start`, `level_up`), you can interface with the `NetRewardTracker` object if it supports your custom events layer. 

```javascript
if (window.NetRewardTracker && typeof window.NetRewardTracker.track === 'function') {
  window.NetRewardTracker.track({
    event: 'game_start',
    userId: 'player_123',
    timestamp: new Date().toISOString()
  });
}
```
*(Note: As of v2, the primary NetReward tracker focuses on passive bandwidth tracking. Custom event payloads will gracefully fall back to console logging if the backend doesn't require them).*

---

## 4. NRT Token Payments & Subscriptions

Since NetReward provides a centralized API key, you can use the same key on your backend to verify and process NRT Token payments.

### Processing a Purchase

1. **Player selects "Pay with NRT"**: Your game UI redirects the player to the NetReward Checkout URL, passing your Service ID and the payment amount.
2. **NetReward handles the transaction**: The player confirms the transaction on the NetReward dashboard.
3. **Webhook Verification**: NetReward sends a secure webhook to your backend. You verify the webhook using your `webhook_secret` (found next to your SDK key).

### Webhook Example (Node.js)

```javascript
const crypto = require('crypto');

app.post('/webhooks/netreward', (req, res) => {
  const signature = req.headers['x-hmac-sig'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.NETREWARD_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (signature === expectedSignature) {
    const { transactionId, userId, amount, status } = req.body;
    
    if (status === 'completed') {
      // Grant the in-game item or subscription to the user
      grantInGameItem(userId, 'premium_pass');
    }
    res.status(200).send('OK');
  } else {
    res.status(401).send('Invalid signature');
  }
});
```

By following this guide, players can seamlessly earn NRT while playing your game and spend it directly in your ecosystem!
