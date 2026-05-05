# @daprof12/tracker

The official NetReward tracking SDK for Web and JavaScript environments. This SDK allows Service Providers to report data consumption and activity sessions to the NetReward platform.

## Installation

```bash
npm install @daprof12/tracker
```

## Usage

```javascript
import { NrtTracker } from '@netreward/tracker';

const nrt = new NrtTracker({
  apiKey: 'YOUR_API_KEY',
  environment: 'production' // Defaults to api.netreward.online
});

// Track a session
await nrt.trackSession({
  userId: 'user_123',
  bytesConsumed: 1024 * 1024 * 500, // 500MB
  category: 'streaming'
});
```

## Configuration

| Option | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | Your platform's API key. |
| `environment` | `string` | `production` or a custom API URL. |

## License

MIT
