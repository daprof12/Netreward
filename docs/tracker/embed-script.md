# Tracker Embed Script (tracker.js)

The `tracker.js` script automatically monitors user data usage on your platform and reports it to the NetReward ecosystem. It dynamically detects the type of platform you operate (via `data-category`) and hooks into the correct browser APIs.

## Installation

Add this script to the `<head>` of your HTML document:

```html
<script
  src="https://cdn.netreward.online/tracker.js"
  data-api-key="nr_live_YOUR_API_KEY"
  data-category="streaming"
  data-campaign-id="your-campaign-id"
  defer
></script>
```

## Configuration Attributes

| Attribute | Required | Description |
|---|---|---|
| `data-api-key` | Yes | Your SP API key from the Dashboard. |
| `data-category` | Yes | The category of your service. Drives the auto-detection logic. |
| `data-campaign-id` | No | Optional. Will use 'default-campaign' if omitted. |

## Supported Categories

### `streaming`
Monitors all `<audio>` and `<video>` tags on the page. Tracks `play` and `pause` events. Calculates bytes consumed by multiplying `currentTime` by the bitrate.
**Tip:** Add `data-bitrate="320000"` to your audio tags to provide precise tracking instead of falling back to default estimates.

### `ai-service`
Monitors all `fetch` and `XMLHttpRequest` calls automatically. Perfect for ChatGPT-like applications. Accurately tracks prompt payload size (up) and generation response size (down).

### `ecommerce` & `browsing`
Hooks into the browser's `PerformanceResourceTiming` API to monitor all downloaded resources (images, JS, CSS, fonts, JSON) on every page load and SPA route change.

### `gaming`
Hooks into `WebSocket` connections to monitor binary frame payloads (`ArrayBuffer` / `Blob`) in real-time.

### `cloud`
Like `ai-service` but specifically tuned for large chunked streaming transfers.

### `social`
Monitors infinite scroll resource loads and media uploads.
