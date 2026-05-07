# NetReward Integration: Quickstart

Welcome to NetReward! The fastest way to integrate is using our zero-code CDN scripts.

## For Service Providers (SPs)

If you are building an app (Streaming, AI, E-Commerce, Browsing), use these drop-in scripts. You do **not** need to install any npm packages or write backend code.

### 1. Add Payment Checkout (pay.js)
Drop this script tag anywhere on your checkout page. It will automatically render a "Pay with NetReward" button that handles the entire payment flow.

```html
<!-- Automatically renders the NetReward Checkout button -->
<script
  src="https://cdn.netreward.online/pay.js"
  data-api-key="nr_live_YOUR_API_KEY"
  data-amount="29.99"
  data-currency="USD"
  data-order-id="ORD_12345"
  data-success-url="https://yoursite.com/success"
  data-cancel-url="https://yoursite.com/cancel"
  defer
></script>
```

*(Advanced: If you set `data-amount="dynamic"`, it will automatically look for an `<input name="amount">` on your page when clicked).*

### 2. Add Tracking (tracker.js)
Drop this script in the `<head>` of your website. It automatically detects user data consumption based on your category and reports it, earning you and your users NRT tokens.

```html
<!-- Automatically tracks data consumption for Streaming/Video -->
<script
  src="https://cdn.netreward.online/tracker.js"
  data-api-key="nr_live_YOUR_API_KEY"
  data-category="streaming"
  defer
></script>
```

*Available Categories: `streaming`, `ai-service`, `gaming`, `social`, `browsing`, `cloud`, `ecommerce`, `other`.*

## For Internet Service Providers (ISPs)

ISPs integrate at the network level (routers, ground stations, RADIUS servers). You do not use browser scripts.

### Heartbeat Daemon

The simplest way is to run our Python Heartbeat Agent on your network server.

```bash
curl -o nrt_agent.py https://raw.githubusercontent.com/daprof12/Netreward/main/docs/isp/nrt_agent.py
python3 nrt_agent.py --isp-key="ni_live_YOUR_KEY" --secret="YOUR_SECRET" --node="NODE_01"
```

For full details, see the [ISP Integration Guide](isp/heartbeat-daemon.md).
