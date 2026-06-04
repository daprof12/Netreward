(function() {
  const currentScript = document.currentScript;
  if (!currentScript) return;

  const spApiKey = currentScript.getAttribute('data-api-key');
  const ispApiKey = currentScript.getAttribute('data-isp-api-key');
  const endpoint = currentScript.getAttribute('data-endpoint') || 'https://pmpeyfkbqipfnhokfksl.supabase.co/functions/v1/tracking';
  // Supabase Edge Functions require an Authorization header at the gateway.
  // The anon key is safe to embed client-side (it's already public in every Supabase app).
  const supabaseAnonKey = currentScript.getAttribute('data-supabase-key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcGV5ZmticWlwZm5ob2tma3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMDc4MDIsImV4cCI6MjA5Mjc4MzgwMn0.H_adIr_LDFTa497OCMWJjYTwKLwDkKMvU6hlwdjp3lY';
  // Optional: gaming platform identifier (e.g. 'steam', 'playstation', 'xbox')
  // Set this on the script tag if embedding on a gaming platform:
  //   <script data-gaming-platform="steam" ...></script>
  const explicitCategory = currentScript.getAttribute('data-category') || null;
  let gamingPlatform = currentScript.getAttribute('data-gaming-platform') || null;

  if (!spApiKey && !ispApiKey) {
    console.warn('[NetReward Tracker] Missing data-api-key or data-isp-api-key. Tracker disabled.');
    return;
  }

  // ── Device Identity ───────────────────────────────────────────────────────
  // Use nrt_device_fingerprint as the stable device identifier.
  // This MUST match the fingerprint stored in the DB devices table.
  // The edge function will resolve fingerprint → devices.id server-side.
  // NEVER use a locally-generated UUID that doesn't exist in the DB.
  let deviceFingerprint = localStorage.getItem('nrt_device_id') || localStorage.getItem('nrt_device_fingerprint');
  if (!deviceFingerprint) {
    deviceFingerprint = (crypto.randomUUID ? crypto.randomUUID() : 'fp_' + Math.random().toString(36).substring(2, 18));
    localStorage.setItem('nrt_device_fingerprint', deviceFingerprint);
  }

  class Tracker {
    constructor() {
      this.queue = [];
      this.currentSessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Math.random().toString(36).substring(2);
      this.sessionStart = Date.now();
      this.bytesUp = 0;
      this.bytesDown = 0;

      // Flush every 15s for better responsiveness during testing
      setInterval(() => this.flush(), 15000); 
      window.addEventListener('beforeunload', () => this.flush(true));
    }

    report(up, down) {
      this.bytesUp += up;
      this.bytesDown += down;
    }

    identify(id, metadata = {}) {
      const idChanged = id && id !== deviceFingerprint;
      const newPlatform = metadata.gamingPlatform ? (Array.isArray(metadata.gamingPlatform) ? metadata.gamingPlatform.join(',') : String(metadata.gamingPlatform)) : null;
      const platformChanged = newPlatform && newPlatform !== gamingPlatform;

      if (idChanged || platformChanged) {
        console.log(`[NetReward Tracker] Identity or platform changing. Flushing old session.`);
        this.flush();
        this.currentSessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Math.random().toString(36).substring(2);
        this.sessionStart = Date.now();
      }

      if (id) {
        deviceFingerprint = id;
        localStorage.setItem('nrt_device_fingerprint', id);
        console.log(`[NetReward Tracker] Device identified: ${id}`);
      }
      // Allow overriding the gaming platform dynamically at runtime
      if (newPlatform) {
        gamingPlatform = newPlatform;
        console.log(`[NetReward Tracker] Gaming platform set to: ${gamingPlatform}`);
      }
    }

    async flush(isUnload = false) {
      if (this.bytesUp === 0 && this.bytesDown === 0) return;

      const event = {
        // Send the fingerprint as device_id — the Edge Function resolves it
        // to the correct devices.id UUID via the fingerprint column.
        device_id: deviceFingerprint,
        session_id: this.currentSessionId,
        bytes_up: Math.floor(this.bytesUp),
        bytes_down: Math.floor(this.bytesDown),
        duration_seconds: Math.max(1, Math.floor((Date.now() - this.sessionStart) / 1000)),
        session_start: new Date(this.sessionStart).toISOString(),
        session_end: new Date().toISOString(),
        // Include gaming platform if this is a gaming integration
        ...(gamingPlatform ? { gaming_platform: gamingPlatform } : {})
      };

      // Reset for next batch
      this.bytesUp = 0;
      this.bytesDown = 0;
      this.currentSessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Math.random().toString(36).substring(2);
      this.sessionStart = Date.now();

      const payload = JSON.stringify({ events: [event] });

      if (isUnload && navigator.sendBeacon) {
        // sendBeacon cannot send custom headers, so pass auth + SP key as query params
        const beaconUrl = new URL(endpoint);
        if (spApiKey) beaconUrl.searchParams.set('sp_key', spApiKey);
        if (ispApiKey) beaconUrl.searchParams.set('isp_key', ispApiKey);
        beaconUrl.searchParams.set('apikey', supabaseAnonKey);
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(beaconUrl.toString(), blob);
      } else {
        try {
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey
          };
          if (spApiKey) headers['x-sp-api-key'] = spApiKey;
          if (ispApiKey) headers['x-isp-api-key'] = ispApiKey;

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: payload,
            keepalive: isUnload
          });

          if (res.ok) {
            const data = await res.json();
            if (data.errors > 0) {
              console.warn('[NetReward Tracker] Telemetry rejected by server:', data.results);
            } else {
              console.log(`[NetReward Tracker] Telemetry flushed successfully! Sent ${event.bytes_up} bytes up, ${event.bytes_down} bytes down.`);
            }
          } else {
            console.warn(`[NetReward Tracker] Failed to send telemetry. Status: ${res.status}`);
          }
        } catch (e) {
          console.warn('[NetReward Tracker] Flush failed network error', e);
        }
      }
    }
  }

  const tracker = new Tracker();
  window.NetRewardTracker = tracker;

  // --- Fetch Configuration & Auto-Detection Logic ---

  async function initSDK() {
    let category = explicitCategory || 'other';
    
    if (!explicitCategory) {
      try {
        // Use query params for the GET init request (avoids CORS preflight issues with custom headers)
        const initUrl = new URL(endpoint);
        if (spApiKey) initUrl.searchParams.set('sp_key', spApiKey);
        if (ispApiKey) initUrl.searchParams.set('isp_key', ispApiKey);

        const res = await fetch(initUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey
          }
        });
        if (res.ok) {
          const config = await res.json();
          if (config.category && config.category !== 'other') {
            category = config.category;
          }
        }
      } catch (e) {
        console.warn('[NetReward Tracker] Failed to fetch config, defaulting to "other".', e);
      }
    }

    // Always apply fetch and XHR monkey-patching as a baseline for all categories
    // This ensures we catch Web Audio API buffer fetches and API calls even in streaming apps.
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const reqSize = args[1] && args[1].body ? new Blob([args[1].body]).size : 0;
      try {
        const res = await originalFetch.apply(this, args);
        const clone = res.clone();
        clone.blob().then(blob => {
          tracker.report(reqSize, blob.size);
        }).catch(() => {});
        return res;
      } catch (e) {
        tracker.report(reqSize, 0);
        throw e;
      }
    };

    const originalXHR = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function(body) {
      const reqSize = body ? new Blob([body]).size : 0;
      this.addEventListener('load', function() {
        const resSize = this.responseText ? new Blob([this.responseText]).size : 0;
        tracker.report(reqSize, resSize);
      });
      return originalXHR.apply(this, arguments);
    };

    if (category === 'streaming') {
      // Monitor audio/video elements
      let activeMedia = new Map();

      const trackMedia = (media) => {
        if (activeMedia.has(media)) return;
        activeMedia.set(media, true);

        let lastTime = media.currentTime;
        media.addEventListener('timeupdate', () => {
          const diff = media.currentTime - lastTime;
          if (diff > 0 && !media.paused) {
            // Assume 320kbps for audio, 4Mbps for video if not specified
            let bitrate = parseInt(media.getAttribute('data-bitrate'));
            if (isNaN(bitrate)) {
              bitrate = media.tagName === 'VIDEO' ? 4000000 : 320000;
            }
            const bytes = (diff * bitrate) / 8;
            tracker.report(bytes * 0.05, bytes); // 5% up, 100% down
          }
          lastTime = media.currentTime;
        });
      };

      // Find existing media elements
      document.querySelectorAll('audio, video').forEach(trackMedia);

      // Watch for dynamically added media
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') trackMedia(node);
            else if (node.querySelectorAll) node.querySelectorAll('audio, video').forEach(trackMedia);
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });

    } else if (category === 'gaming') {
      // Monkey-patch WebSocket for game traffic measurement
      const OrigWebSocket = window.WebSocket;
      window.WebSocket = function(...args) {
        const ws = new OrigWebSocket(...args);
        const origSend = ws.send;
        ws.send = function(data) {
          const size = typeof data === 'string' ? data.length * 2 : (data.byteLength || data.size || 0);
          tracker.report(size, 0);
          return origSend.apply(this, arguments);
        };
        ws.addEventListener('message', (e) => {
          const size = typeof e.data === 'string' ? e.data.length * 2 : (e.data.byteLength || e.data.size || 0);
          tracker.report(0, size);
        });
        return ws;
      };

      // Passive activity tracking for games without WebSockets (or in addition to WebSockets)
      let lastActivityTime = Date.now();
      const recordActivity = () => {
        lastActivityTime = Date.now();
      };
      
      window.addEventListener('click', recordActivity, { passive: true });
      window.addEventListener('keydown', recordActivity, { passive: true });
      window.addEventListener('touchstart', recordActivity, { passive: true });
      
      // Throttle mousemove to avoid performance overhead
      let mouseMoveTimeout;
      window.addEventListener('mousemove', () => {
        if (!mouseMoveTimeout) {
          recordActivity();
          mouseMoveTimeout = setTimeout(() => { mouseMoveTimeout = null; }, 2000);
        }
      }, { passive: true });

      // Periodically report baseline gaming bandwidth if user is active and window has focus.
      // Enforce logical cap (250 KB/s). Let's use a safe 20 KB/s down, 2 KB/s up.
      const BASELINE_DOWN_BYTES_PER_SEC = 20 * 1024; // 20 KB/s
      const BASELINE_UP_BYTES_PER_SEC = 2 * 1024;   // 2 KB/s
      const REPORT_INTERVAL_MS = 5000;
      
      setInterval(() => {
        const isActive = (Date.now() - lastActivityTime) < 30000; // Active within last 30s
        const hasFocus = document.hasFocus();
        if (isActive && hasFocus) {
          const seconds = REPORT_INTERVAL_MS / 1000;
          tracker.report(
            BASELINE_UP_BYTES_PER_SEC * seconds,
            BASELINE_DOWN_BYTES_PER_SEC * seconds
          );
        }
      }, REPORT_INTERVAL_MS);

    } else if (category === 'browsing' || category === 'ecommerce') {
      // Use Performance Resource Timing API for browsing traffic
      let lastEntryIndex = 0;
      setInterval(() => {
        const entries = performance.getEntriesByType('resource');
        let down = 0;
        for (let i = lastEntryIndex; i < entries.length; i++) {
          down += entries[i].transferSize || entries[i].decodedBodySize || 0;
        }
        lastEntryIndex = entries.length;
        tracker.report(down * 0.1, down); // Estimate 10% up
      }, 5000);
    }

    console.log(`[NetReward Tracker] Initialized for category: ${category}`);
  }

  initSDK();
})();
