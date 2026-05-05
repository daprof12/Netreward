// NetReward Extension - Background Service Worker
let activeDomains = new Set(['netflix.com', 'spotify.com', 'youtube.com']);
let usageBuffer = [];

// Listen for network requests to tracked domains
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const url = new URL(details.url);
    const domain = url.hostname.replace('www.', '');
    
    if (activeDomains.has(domain)) {
      const bytes = details.responseHeaders.find(h => h.name.toLowerCase() === 'content-length')?.value || 0;
      
      usageBuffer.push({
        domain,
        bytes: parseInt(bytes),
        timestamp: Date.now()
      });
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Flush usage to NetReward API every 60 seconds
chrome.alarms.create('flushUsage', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flushUsage' && usageBuffer.length > 0) {
    flushToApi();
  }
});

async function flushToApi() {
  const data = [...usageBuffer];
  usageBuffer = [];

  try {
    const { token } = await chrome.storage.local.get('token');
    if (!token) return;

    await fetch('https://api.netreward.online/v1/tracking/extension', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ usage: data })
    });
  } catch (err) {
    console.error('Failed to flush usage:', err);
    usageBuffer = [...data, ...usageBuffer]; // Prepend back if failed
  }
}
