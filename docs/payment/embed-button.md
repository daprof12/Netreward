# Payment Embed Script (pay.js)

The `pay.js` script allows you to accept NetReward Tokens (NRT) on your website without writing any backend code. It renders a fully styled "Pay with NetReward" button and handles the checkout redirection.

## Basic Integration (Fixed Amount)

Drop this `<script>` tag exactly where you want the payment button to appear.

```html
<script
  src="https://cdn.netreward.online/pay.js"
  data-api-key="nr_live_YOUR_API_KEY"
  data-amount="29.99"
  data-currency="USD"
  data-order-id="ORD_12345"
  data-success-url="https://yoursite.com/success"
  data-cancel-url="https://yoursite.com/cancel"
  defer
></script>
```

### Attributes

| Attribute | Required | Description |
|---|---|---|
| `data-api-key` | Yes | Your SP API key from the Dashboard. |
| `data-amount` | Yes | The amount to charge (can be in NRT or fiat). Use `"dynamic"` if you want it to read from an input field. |
| `data-currency` | No | Default is `"USD"`. If set to USD/EUR, it will automatically convert to NRT at the current exchange rate. |
| `data-order-id` | No | Your internal system's order reference ID. |
| `data-success-url` | No | URL to redirect the user to upon successful payment. |
| `data-cancel-url`| No | URL to redirect the user to if they cancel the payment. |
| `data-attach-to`| No | CSS Selector (e.g. `#my-btn`) of an existing button to hijack instead of creating a new one. |
| `data-container`| No | CSS Selector of an existing `<div>` to render the button inside. |

## Dynamic Amount Integration (Read from Input)

If you are running a donation page, a shopping cart, or a pay-what-you-want system, you can set `data-amount="dynamic"`. 

The script will automatically look for an `<input>` field with `name="amount"` or `id="amount"` when the user clicks the button.

```html
<!-- The user enters the amount here -->
<input type="number" id="amount" name="amount" placeholder="Enter amount">

<!-- The script will read the input value when clicked -->
<script
  src="https://cdn.netreward.online/pay.js"
  data-api-key="nr_live_YOUR_API_KEY"
  data-amount="dynamic"
  data-currency="USD"
  defer
></script>
```

## Advanced: Integrating with Custom Checkout UIs

In many checkout scenarios (like WooCommerce or Shopify), you present multiple payment options (Credit Card, PayPal, NetReward) and only want the NetReward button to activate or appear when selected.

### Option A: Attach to an Existing Button (`data-attach-to`)
If your checkout already has a generic "Place Order" button that changes state based on the selected payment method, you can tell `pay.js` to attach its checkout logic to *your* button instead of creating a new one.

```html
<button id="my-custom-checkout-btn">Complete Purchase</button>

<script
  src="https://cdn.netreward.online/pay.js"
  data-api-key="nr_live_YOUR_API_KEY"
  data-amount="29.99"
  data-attach-to="#my-custom-checkout-btn"
  defer
></script>
```
*Note: This will not change the appearance of your button, but clicking it will trigger the NetReward checkout flow.*

### Option B: Render inside a Container (`data-container`)
If you want our styled "Pay with NetReward" button to render inside a specific `<div>` on your page (for example, inside a payment method accordion), use `data-container`.

```html
<div id="netreward-button-wrapper"></div>

<script
  src="https://cdn.netreward.online/pay.js"
  data-api-key="nr_live_YOUR_API_KEY"
  data-amount="29.99"
  data-container="#netreward-button-wrapper"
  defer
></script>
```

## Security Note

Since `pay.js` uses your public `API_KEY` (which is safe to expose in the browser), it can only *initiate* a payment session to your account. It cannot be used to read your transactions or withdraw funds. 

To verify that a payment actually succeeded, always use a **Webhook endpoint** on your backend to listen for the `payment.success` event. Do not rely solely on the `success-url` redirect, as users can manually visit the success URL.
