// NetReward Background Service Worker
// Handles: telemetry metering, badge updates, alarm-based flushing

const SUPABASE_URL = 'https://pmpeyfkbqipfnhokfksl.supabase.co';
const TRACKING_ENDPOINT = `${SUPABASE_URL}/functions/v1/tracking`;

// ── State ──────────────────────────────────────────────────────────────────
let isTracking = true;
let bytesUp = 0;
let bytesDown = 0;
let sessionId = crypto.randomUUID();
let sessionStart = Date.now();
let deviceFingerprint = '';

// ── Initialization ─────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[NetReward] Extension installed');
  
  // Create flush alarm (every 15 seconds = 0.25 minutes)
  chrome.alarms.create('flush-telemetry', { periodInMinutes: 0.25 });
  
  // Create badge update alarm (every 5 seconds)
  chrome.alarms.create('update-badge', { periodInMinutes: 0.083 });
  
  // Initialize device fingerprint
  chrome.storage.local.get('nrt_device_fingerprint', (result) => {
    if (result.nrt_device_fingerprint) {
      deviceFingerprint = result.nrt_device_fingerprint;
    } else {
      deviceFingerprint = crypto.randomUUID();
      chrome.storage.local.set({ nrt_device_fingerprint: deviceFingerprint });
    }
  });

  // Load tracking state
  chrome.storage.local.get('nrt_tracking_enabled', (result) => {
    isTracking = result.nrt_tracking_enabled !== false;
  });
});

// ── Startup (when browser opens) ────────────────────────────────────────────
chrome.runtime.onStartup.addListener(() => {
  sessionId = crypto.randomUUID();
  sessionStart = Date.now();
  bytesUp = 0;
  bytesDown = 0;

  chrome.storage.local.get('nrt_device_fingerprint', (result) => {
    deviceFingerprint = result.nrt_device_fingerprint || '';
  });
  chrome.storage.local.get('nrt_tracking_enabled', (result) => {
    isTracking = result.nrt_tracking_enabled !== false;
  });
});

// ── Bandwidth Metering ──────────────────────────────────────────────────────
// Track outgoing request sizes (upload estimation)
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!isTracking) return;
    const contentLength = details.requestHeaders?.find(
      h => h.name.toLowerCase() === 'content-length'
    );
    bytesUp += parseInt(contentLength?.value || '200', 10);
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

// Track incoming response sizes (download estimation)
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!isTracking) return;
    const contentLength = details.responseHeaders?.find(
      h => h.name.toLowerCase() === 'content-length'
    );
    bytesDown += parseInt(contentLength?.value || '500', 10);
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// ── Alarm Handlers ──────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flush-telemetry') {
    flushTelemetry();
  }
  if (alarm.name === 'update-badge') {
    updateBadge();
  }
});

// ── Flush Telemetry ─────────────────────────────────────────────────────────

async function flushTelemetry() {
  const result = await chrome.storage.local.get('nrt_offline_queue');
  let queue = result.nrt_offline_queue || [];

  if (isTracking && (bytesUp > 0 || bytesDown > 0)) {
    queue.push({
      device_id: deviceFingerprint,
      session_id: sessionId,
      bytes_up: bytesUp,
      bytes_down: bytesDown,
      session_start: new Date(sessionStart).toISOString(),
      session_end: new Date().toISOString(),
      gaming_platform: 'web',
    });
  }

  if (queue.length === 0) return;

  // Max 100 events per batch (enforced by backend)
  const batch = queue.slice(0, 100);
  const remainingQueue = queue.slice(100);
  const bodyText = JSON.stringify({ events: batch });

  try {
    // Read Supabase auth token from storage
    const storageKeys = await chrome.storage.local.get(null);
    const authKey = Object.keys(storageKeys).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    
    let jwtToken = null;
    if (authKey && storageKeys[authKey]) {
      const sessionData = typeof storageKeys[authKey] === 'string' 
        ? JSON.parse(storageKeys[authKey]) 
        : storageKeys[authKey];
      jwtToken = sessionData?.access_token;
    }

    if (!jwtToken) {
      console.log('[NetReward] User not logged in, queueing telemetry locally');
      // Keep queue at max 100
      if (queue.length > 100) queue = queue.slice(queue.length - 100);
      await chrome.storage.local.set({ nrt_offline_queue: queue });
      return;
    }

    const response = await fetch(TRACKING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: bodyText,
    });

    if (response.ok) {
      console.log(`[NetReward] Flushed ${batch.length} events. ↑${bytesUp} ↓${bytesDown}`);
      bytesUp = 0;
      bytesDown = 0;
      await chrome.storage.local.set({ nrt_offline_queue: remainingQueue });
    } else {
      console.warn('[NetReward] Flush failed:', response.status);
      // Keep queue at max 100 to prevent memory leaks
      if (queue.length > 100) queue = queue.slice(queue.length - 100);
      await chrome.storage.local.set({ nrt_offline_queue: queue });
    }
  } catch (e) {
    console.warn('[NetReward] Flush error (offline?):', e);
    if (queue.length > 100) queue = queue.slice(queue.length - 100);
    await chrome.storage.local.set({ nrt_offline_queue: queue });
  }
}

// ── Badge Update ────────────────────────────────────────────────────────────
function updateBadge() {
  if (!isTracking) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
    return;
  }

  const totalMB = (bytesUp + bytesDown) / (1024 * 1024);
  let text = '';
  if (totalMB >= 1000) {
    text = `${(totalMB / 1024).toFixed(1)}G`;
  } else if (totalMB >= 1) {
    text = `${Math.round(totalMB)}M`;
  } else if (totalMB > 0) {
    text = `${Math.round(totalMB * 1024)}K`;
  }

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
}

// ── Message Handlers (from popup) ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_TRACKING') {
    isTracking = message.enabled;
    chrome.storage.local.set({ nrt_tracking_enabled: isTracking });
    updateBadge();
    sendResponse({ success: true });
  }

  if (message.type === 'GET_STATS') {
    sendResponse({
      bytesUp,
      bytesDown,
      isTracking,
      sessionId,
    });
  }

  if (message.type === 'SET_API_KEY') {
    chrome.storage.local.set({ nrt_sp_api_key: message.apiKey });
    sendResponse({ success: true });
  }

  if (message.type === 'OPEN_SCAN2PAY') {
    // Store pending transaction payload in storage so popup can retrieve it
    chrome.storage.local.set({ pendingScan2Pay: message.payload }, () => {
      // Open the extension popup in a new window/popup
      chrome.windows.create({
        url: 'index.html?scan2pay=true',
        type: 'popup',
        width: 380,
        height: 520,
        focused: true
      });
      sendResponse({ success: true });
    });
    return true; // async
  }

  return true; // Keep message channel open for async response
});
