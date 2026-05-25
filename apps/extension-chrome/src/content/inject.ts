// This script injects into partner domains and listens for Scan2Pay events
// Once a Scan2Pay event occurs, it forwards it to the background script.

window.addEventListener('message', (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  if (event.data.type && event.data.type === 'NETREWARD_SCAN2PAY_INIT') {
    console.log('NetReward Extension: Received Scan2Pay trigger from page', event.data.payload);
    
    // Send message to background script to open the extension popup
    chrome.runtime.sendMessage({
      type: 'OPEN_SCAN2PAY',
      payload: event.data.payload
    }, (response) => {
      // Send response back to the web page
      if (response && response.success) {
        window.postMessage({ type: 'NETREWARD_SCAN2PAY_ACK', payload: { status: 'opened' } }, '*');
      }
    });
  }
});

// Let the web page know the extension is installed and ready
document.documentElement.setAttribute('data-nrt-extension', 'true');
window.postMessage({ type: 'NETREWARD_EXTENSION_READY' }, '*');
