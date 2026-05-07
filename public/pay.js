(function() {
  const currentScript = document.currentScript;
  if (!currentScript) return;

  const apiKey = currentScript.getAttribute('data-api-key');
  const amount = currentScript.getAttribute('data-amount');
  const currency = currentScript.getAttribute('data-currency') || 'USD';
  const orderId = currentScript.getAttribute('data-order-id');
  const successUrl = currentScript.getAttribute('data-success-url');
  const cancelUrl = currentScript.getAttribute('data-cancel-url');
  const attachTo = currentScript.getAttribute('data-attach-to');
  const containerId = currentScript.getAttribute('data-container');
  
  if (!apiKey || (!amount && amount !== "dynamic")) {
    console.error('[NetReward Pay] Missing data-api-key or data-amount on script tag.');
    return;
  }

  let targetBtn;

  if (attachTo) {
    targetBtn = document.querySelector(attachTo);
    if (!targetBtn) {
      console.warn(`[NetReward Pay] Could not find element matching data-attach-to="${attachTo}"`);
      return;
    }
  } else {
    targetBtn = document.createElement('button');
    targetBtn.type = 'button';
    targetBtn.className = 'netreward-pay-btn';
    targetBtn.style.cssText = 'background: #2D2D2D; color: #FFF; border: 1px solid #444; border-radius: 8px; padding: 12px 24px; font-size: 16px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 300px; font-family: system-ui, -apple-system, sans-serif;';
    
    targetBtn.onmouseover = () => targetBtn.style.background = '#3D3D3D';
    targetBtn.onmouseout = () => targetBtn.style.background = '#2D2D2D';

    targetBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#F59E0B"/>
        <path d="M2 17L12 22L22 17" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Pay with NetReward</span>
    `;

    if (containerId) {
      const container = document.querySelector(containerId);
      if (container) container.appendChild(targetBtn);
      else currentScript.parentNode.insertBefore(targetBtn, currentScript);
    } else {
      currentScript.parentNode.insertBefore(targetBtn, currentScript);
    }
  }

  targetBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // For dynamic amounts (e.g. reading from a form)
    let finalAmount = amount;
    if (amount === "dynamic") {
      const amountInput = document.querySelector('[name="amount"], #amount');
      if (amountInput && amountInput.value) {
        finalAmount = amountInput.value;
      } else {
        alert("Please enter an amount");
        return;
      }
    }

    const originalText = targetBtn.innerHTML;
    targetBtn.innerHTML = `<span style="display:inline-block; width:16px; height:16px; border:2px solid #fff; border-radius:50%; border-top-color:transparent; animation: nrt-spin 1s linear infinite;"></span> Processing...`;
    targetBtn.disabled = true;

    try {
      const res = await fetch('https://pmpeyfkbqipfnhokfksl.supabase.co/functions/v1/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sp-api-key': apiKey
        },
        body: JSON.stringify({
          amount: parseFloat(finalAmount),
          currency: currency,
          order_id: orderId,
          success_url: successUrl,
          cancel_url: cancelUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create session');

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error('[NetReward Pay] Error:', err);
      alert('Payment failed to initialize: ' + err.message);
      targetBtn.innerHTML = originalText;
      targetBtn.disabled = false;
    }
  });

  if (!attachTo && !document.getElementById('nrt-pay-styles')) {
    const style = document.createElement('style');
    style.id = 'nrt-pay-styles';
    style.textContent = `@keyframes nrt-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
})();
