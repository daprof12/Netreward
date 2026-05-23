# NetReward — Chrome & Edge Extension Development Plan

## Overview

A Manifest V3 browser extension that provides background telemetry tracking and a compact popup dashboard for NetReward users. Chrome and Edge share an identical codebase — only store metadata differs.

---

## Project Setup

```bash
# Inside the NetReward monorepo
mkdir -p apps/extension-chrome
cd apps/extension-chrome
npx -y create-vite@latest ./ --template react-ts
npm install @supabase/supabase-js zustand lucide-react framer-motion
```

---

## Directory Structure

```
apps/extension-chrome/
├── manifest.json
├── vite.config.ts               ← Multi-entry build (popup + background + content)
├── src/
│   ├── popup/
│   │   ├── main.tsx             ← Popup entry
│   │   ├── App.tsx              ← Router for popup views
│   │   ├── pages/
│   │   │   ├── Login.tsx        ← Supabase email/password auth
│   │   │   ├── Dashboard.tsx    ← Balance, earnings, active campaign
│   │   │   ├── Campaigns.tsx    ← Toggle campaigns on/off
│   │   │   ├── Settings.tsx     ← Tracking toggle, logout
│   │   │   └── DeviceLink.tsx   ← Link this browser as a device
│   │   └── components/
│   │       ├── MiniCard.tsx     ← Compact stat card
│   │       ├── CampaignToggle.tsx
│   │       └── StatusBadge.tsx
│   ├── background/
│   │   └── service-worker.ts    ← Telemetry metering + alarm scheduler
│   ├── content/
│   │   └── inject.ts            ← Optional: page-level data hooks
│   ├── shared/                  ← Symlink to packages/shared
│   └── assets/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
├── popup.html                   ← Popup HTML entry
└── package.json
```

---

## manifest.json (Manifest V3)

```json
{
  "manifest_version": 3,
  "name": "NetReward",
  "version": "1.0.0",
  "description": "Earn NRT rewards by sharing anonymized network data",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "webRequest"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "dist/background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/content/inject.js"],
      "run_at": "document_start"
    }
  ],
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}
```

---

## Background Service Worker

The service worker is the core of the extension. It:
1. Measures network traffic via `chrome.webRequest`
2. Batches telemetry reports every 15 seconds
3. Sends reports to the Supabase Edge Function
4. Updates the badge with live stats

### Key Implementation Notes

```typescript
// service-worker.ts

// ❌ WRONG — service workers don't support setInterval reliably
// setInterval(() => flush(), 15000);

// ✅ CORRECT — use chrome.alarms for reliable scheduling
chrome.alarms.create('flush-telemetry', { periodInMinutes: 0.25 }); // Every 15s
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flush-telemetry') flushTelemetry();
});

// Auth token storage — use chrome.storage, NOT localStorage
// (service workers don't have access to localStorage)
async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('supabase_session');
  return result.supabase_session?.access_token || null;
}
```

### Bandwidth Metering

```typescript
let bytesUp = 0;
let bytesDown = 0;

// Track outgoing request sizes
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Estimate upload size from headers
    const contentLength = details.requestHeaders?.find(
      h => h.name.toLowerCase() === 'content-length'
    );
    bytesUp += parseInt(contentLength?.value || '500', 10);
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

// Track incoming response sizes
chrome.webRequest.onCompleted.addListener(
  (details) => {
    // responseHeaders contain content-length
    const contentLength = details.responseHeaders?.find(
      h => h.name.toLowerCase() === 'content-length'
    );
    bytesDown += parseInt(contentLength?.value || '1000', 10);
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);
```

---

## Popup UI Design

The popup is a compact 380×520px window with the existing NetReward dark theme.

### Screens

| Screen | Content |
|--------|---------|
| **Login** | Email + password fields, "Open Web App" link |
| **Dashboard** | NRT balance card, today's tracking stats (GB / NRT), active campaign badge |
| **Campaigns** | List of available campaigns with toggle switches |
| **Settings** | Tracking on/off, auto-start toggle, sign out |
| **Device Link** | Register this browser as a tracked device |

### Theme
Use the exact same glassmorphism theme from the web app:
- `#0a0a0f` background
- `rgba(255,255,255,0.08)` glass borders
- `#6366f1` accent (indigo)
- Inter font family

---

## Edge Extension

The Edge extension is **identical** to Chrome. Create a build script:

```bash
# build.sh
# Build once, package twice
npm run build

# Chrome package
cp -r dist/ chrome-dist/
cp manifest-chrome.json chrome-dist/manifest.json

# Edge package
cp -r dist/ edge-dist/
cp manifest-edge.json edge-dist/manifest.json
```

The only differences in `manifest-edge.json`:
- `"browser_specific_settings"` field for Edge
- Different `"description"` for the Edge Add-ons store

---

## Estimated Timeline

| Task | Duration |
|------|----------|
| Project setup + manifest | 1 day |
| Background service worker (telemetry) | 3 days |
| Popup UI (5 screens) | 4 days |
| Auth integration (chrome.storage) | 2 days |
| Badge + notifications | 1 day |
| Edge packaging | 0.5 days |
| Testing + polish | 2 days |
| Store submissions | 1 day |
| **Total** | **~2.5 weeks** |

---

## Store Submission Checklist

### Chrome Web Store
- [ ] Developer account ($5 one-time fee)
- [ ] Privacy policy URL
- [ ] Screenshots (1280×800 or 640×400)
- [ ] Justification for `webRequest` permission
- [ ] Data usage disclosure

### Edge Add-ons
- [ ] Microsoft Partner Center account (free)
- [ ] Privacy policy URL
- [ ] Screenshots
- [ ] Same justifications as Chrome
