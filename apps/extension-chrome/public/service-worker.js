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
  if (!isTracking || (bytesUp === 0 && bytesDown === 0)) return;

  const payload = {
    session_id: sessionId,
    device_fingerprint: deviceFingerprint,
    bytes_up: bytesUp,
    bytes_down: bytesDown,
    session_start: new Date(sessionStart).toISOString(),
    session_end: new Date().toISOString(),
    source: 'chrome-extension',
  };

  // Get the user's API key from storage
  const result = await chrome.storage.local.get(['nrt_sp_api_key', 'nrt_isp_api_key']);
  const apiKey = result.nrt_sp_api_key || result.nrt_isp_api_key;
  
  if (!apiKey) {
    // No API key configured — queue locally
    console.log('[NetReward] No API key, queueing telemetry locally');
    await queueTelemetry(payload);
    return;
  }

  try {
    const response = await fetch(TRACKING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`[NetReward] Flushed: ↑${bytesUp} ↓${bytesDown}`);
      // Reset counters after successful flush
      bytesUp = 0;
      bytesDown = 0;
    } else {
      console.warn('[NetReward] Flush failed:', response.status);
      await queueTelemetry(payload);
    }
  } catch (e) {
    console.warn('[NetReward] Flush error (offline?):', e);
    await queueTelemetry(payload);
  }
}

// ── Offline Queue ───────────────────────────────────────────────────────────
async function queueTelemetry(payload: any) {
  const result = await chrome.storage.local.get('nrt_offline_queue');
  const queue = result.nrt_offline_queue || [];
  queue.push(payload);
  // Keep max 100 queued items
  if (queue.length > 100) queue.shift();
  await chrome.storage.local.set({ nrt_offline_queue: queue });
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

  return true; // Keep message channel open for async response
});
