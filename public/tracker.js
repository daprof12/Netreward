(function() {
  const currentScript = document.currentScript;
  if (!currentScript) return;

  const apiKey = currentScript.getAttribute('data-api-key');
  const endpoint = currentScript.getAttribute('data-endpoint') || 'https://pmpeyfkbqipfnhokfksl.supabase.co/functions/v1/tracking';

  if (!apiKey) {
    console.warn('[NetReward Tracker] Missing data-api-key. Tracker disabled.');
    return;
  }

  // Generate or get stable device ID
  let deviceId = localStorage.getItem('nrt_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : 'dev_' + Math.random().toString(36).substring(2);
    localStorage.setItem('nrt_device_id', deviceId);
  }

  class Tracker {
    constructor() {
      this.queue = [];
      this.currentSessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Math.random().toString(36).substring(2);
      this.sessionStart = Date.now();
      this.bytesUp = 0;
      this.bytesDown = 0;
      
      setInterval(() => this.flush(), 60000); // Flush every 60s
      window.addEventListener('beforeunload', () => this.flush(true));
    }

    report(up, down) {
      this.bytesUp += up;
      this.bytesDown += down;
    }

    async flush(isUnload = false) {
      if (this.bytesUp === 0 && this.bytesDown === 0) return;
      
      const event = {
        device_id: deviceId,
        session_id: this.currentSessionId,
        bytes_up: Math.floor(this.bytesUp),
        bytes_down: Math.floor(this.bytesDown),
        duration_seconds: Math.max(1, Math.floor((Date.now() - this.sessionStart) / 1000)),
        session_start: new Date(this.sessionStart).toISOString(),
        session_end: new Date().toISOString()
      };

      // Reset for next batch
      this.bytesUp = 0;
      this.bytesDown = 0;
      this.sessionStart = Date.now();

      const payload = JSON.stringify({ events: [event] });

      if (isUnload && navigator.sendBeacon) {
        // use sendBeacon for unload
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      } else {
        try {
          await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-sp-api-key': apiKey
            },
            body: payload,
            keepalive: isUnload
          });
        } catch (e) {
          console.debug('[NetReward Tracker] Flush failed', e);
        }
      }
    }
  }

  const tracker = new Tracker();
  window.NetRewardTracker = tracker;

  // --- Fetch Configuration & Auto-Detection Logic ---
  
  async function initSDK() {
    let category = 'other';
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'x-sp-api-key': apiKey }
      });
      if (res.ok) {
        const config = await res.json();
        if (config.category) category = config.category;
      }
    } catch (e) {
      console.warn('[NetReward Tracker] Failed to fetch config, defaulting to "other".', e);
    }

    if (category === 'streaming') {
    // Monitor audio/video
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

    // Find existing
    document.querySelectorAll('audio, video').forEach(trackMedia);
    
    // Watch for new
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') trackMedia(node);
          else if (node.querySelectorAll) node.querySelectorAll('audio, video').forEach(trackMedia);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

  } else if (category === 'ai-service' || category === 'other') {
    // Monkey-patch fetch and XHR
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

  } else if (category === 'gaming') {
    // Monkey-patch WebSocket
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

  } else if (category === 'browsing' || category === 'ecommerce') {
    // Use Performance API
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
