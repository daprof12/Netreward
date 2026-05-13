/**
 * paymentGateways.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central registry of all supported payment gateways.
 *
 * Each entry defines:
 *   - id          → kv_settings key prefix (e.g. "paystack" → "paystack_config")
 *   - name        → Display name
 *   - countries   → Which countries this gateway serves (for display & filtering)
 *   - currencies  → Accepted fiat currencies
 *   - flag        → Primary emoji flag
 *   - color       → Brand accent color
 *   - method      → How the checkout opens (popup | redirect | async)
 *   - docs        → Link to official developer documentation
 *   - fees        → Human-readable fee string
 *
 * Integration flow (all gateways follow this pattern):
 *   1. Admin configures credentials in AdminPayments.tsx → stored in kv_settings
 *   2. usePaymentGateways hook fetches enabled gateways + publicKey only
 *   3. InstantPurchase.tsx calls launchGateway(id, params) which:
 *        a. Calls Supabase Edge Function / RPC to create order (secret key stays server-side)
 *        b. Opens the checkout UI via popup or redirect
 *        c. On success → calls complete_{gateway}_payment RPC to credit wallet
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type GatewayId =
  | 'opay'
  | 'paystack'
  | 'flutterwave'
  | 'stripe'
  | 'paypal'
  | 'razorpay'
  | 'xendit'
  | 'mtn_momo'
  | 'checkout_com'
  | 'alipay'
  | 'toss'
  | 'paidy'
  | 'mercadopago'
  | 'interac';

export type CheckoutMethod = 'popup' | 'redirect' | 'async';

export interface GatewayDefinition {
  id: GatewayId;
  name: string;
  kvKey: string;              // kv_settings key for config blob
  countries: string[];        // Countries this gateway serves
  currencies: string[];       // Accepted fiat currencies
  flag: string;               // Primary emoji flag
  region: string;             // Display region label
  color: string;              // Brand hex color
  bgClass: string;            // Tailwind background tint class
  method: CheckoutMethod;     // How checkout opens
  fees: string;               // Human-readable fee estimate
  docs: string;               // Official developer documentation URL
  sdkUrl?: string;            // CDN script URL (for popup-based gateways)
  logoUrl?: string;           // URL to brand logo
}

export const GATEWAY_REGISTRY: GatewayDefinition[] = [
  // ── Nigeria ───────────────────────────────────────────────────────────────
  {
    id: 'opay',
    name: 'OPay',
    kvKey: 'opay_merchant_id', // legacy separate keys
    countries: ['Nigeria'],
    currencies: ['NGN'],
    flag: '🇳🇬',
    region: 'Nigeria',
    color: '#00c853',
    bgClass: 'bg-emerald-500/10',
    method: 'redirect',
    fees: '0% (platform absorbed)',
    docs: 'https://documentation.opayweb.com/',
    logoUrl: 'https://logo.clearbit.com/opayweb.com',
  },
  {
    id: 'paystack',
    name: 'Paystack',
    kvKey: 'paystack_config',
    countries: ['Nigeria', 'Ghana', 'South Africa', 'Kenya'],
    currencies: ['NGN', 'GHS', 'ZAR', 'KES'],
    flag: '🇳🇬',
    region: 'Nigeria · Ghana · SA · Kenya',
    color: '#00c3f7',
    bgClass: 'bg-cyan-500/10',
    method: 'popup',
    fees: '1.5% + ₦100 cap',
    docs: 'https://paystack.com/docs/payments/accept-payments/',
    sdkUrl: 'https://js.paystack.co/v2/inline.js',
    logoUrl: 'https://logo.clearbit.com/paystack.com',
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    kvKey: 'flutterwave_config',
    countries: ['Nigeria', 'Ghana', 'Kenya', 'Uganda', 'Tanzania', 'South Africa', 'Senegal', 'Cameroon'],
    currencies: ['NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR', 'XOF', 'XAF'],
    flag: '🌍',
    region: 'Africa (35+ countries)',
    color: '#f5a623',
    bgClass: 'bg-amber-500/10',
    method: 'redirect',
    fees: '1.4%',
    docs: 'https://developer.flutterwave.com/docs/collecting-payments/standard',
    logoUrl: 'https://logo.clearbit.com/flutterwave.com',
  },
  {
    id: 'mtn_momo',
    name: 'MTN MoMo',
    kvKey: 'mtn_momo_config',
    countries: ['Ghana', 'Uganda', 'Ivory Coast', 'Rwanda', 'Cameroon'],
    currencies: ['GHS', 'UGX', 'XOF', 'RWF', 'XAF'],
    flag: '🌍',
    region: 'Ghana · Uganda · West Africa',
    color: '#ffcc00',
    bgClass: 'bg-yellow-500/10',
    method: 'async',
    fees: '0.5%',
    docs: 'https://momodeveloper.mtn.com/',
    logoUrl: 'https://logo.clearbit.com/mtn.com',
  },

  // ── Global / USA / UK / Canada / EU ───────────────────────────────────────
  {
    id: 'stripe',
    name: 'Stripe',
    kvKey: 'stripe_config',
    countries: ['USA', 'UK', 'Canada', 'EU', 'Australia', 'Singapore', 'Japan', 'New Zealand', 'Switzerland', 'Norway', 'Sweden'],
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY', 'CHF', 'NOK', 'SEK', 'DKK'],
    flag: '🌐',
    region: 'USA · UK · Canada · EU · AU · Global',
    color: '#6772e5',
    bgClass: 'bg-indigo-500/10',
    method: 'redirect',
    fees: '2.9% + $0.30',
    docs: 'https://stripe.com/docs/payments/checkout',
    logoUrl: 'https://logo.clearbit.com/stripe.com',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    kvKey: 'paypal_config',
    countries: ['USA', 'UK', 'Canada', 'EU', 'Australia', 'Japan', 'Brazil', 'Mexico', 'Global'],
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BRL', 'MXN'],
    flag: '🌐',
    region: 'Global (200+ countries)',
    color: '#003087',
    bgClass: 'bg-blue-900/10',
    method: 'redirect',
    fees: '3.49% + fixed fee',
    docs: 'https://developer.paypal.com/docs/checkout/',
    logoUrl: 'https://logo.clearbit.com/paypal.com',
  },
  {
    id: 'interac',
    name: 'Interac e-Transfer',
    kvKey: 'interac_config',
    countries: ['Canada'],
    currencies: ['CAD'],
    flag: '🇨🇦',
    region: 'Canada',
    color: '#f4b223',
    bgClass: 'bg-yellow-400/10',
    method: 'redirect',
    fees: '$1.50 flat',
    docs: 'https://www.interac.ca/en/business/our-services/interac-e-transfer-for-business/',
    logoUrl: 'https://logo.clearbit.com/interac.ca',
  },

  // ── India ─────────────────────────────────────────────────────────────────
  {
    id: 'razorpay',
    name: 'Razorpay',
    kvKey: 'razorpay_config',
    countries: ['India'],
    currencies: ['INR'],
    flag: '🇮🇳',
    region: 'India',
    color: '#3395ff',
    bgClass: 'bg-blue-500/10',
    method: 'popup',
    fees: '2% (domestic cards)',
    docs: 'https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/',
    sdkUrl: 'https://checkout.razorpay.com/v1/checkout.js',
    logoUrl: 'https://logo.clearbit.com/razorpay.com',
  },

  // ── Southeast Asia ────────────────────────────────────────────────────────
  {
    id: 'xendit',
    name: 'Xendit',
    kvKey: 'xendit_config',
    countries: ['Indonesia', 'Philippines', 'Malaysia', 'Thailand', 'Vietnam'],
    currencies: ['IDR', 'PHP', 'MYR', 'THB', 'VND'],
    flag: '🇮🇩',
    region: 'Indonesia · Philippines · Malaysia',
    color: '#00a2e8',
    bgClass: 'bg-sky-500/10',
    method: 'redirect',
    fees: '2%',
    docs: 'https://docs.xendit.co/payments/payment-links',
    logoUrl: 'https://logo.clearbit.com/xendit.co',
  },

  // ── China ─────────────────────────────────────────────────────────────────
  {
    id: 'alipay',
    name: 'Alipay+',
    kvKey: 'alipay_config',
    countries: ['China', 'Hong Kong', 'Macau', 'Singapore', 'Cross-border'],
    currencies: ['CNY', 'HKD', 'USD', 'EUR', 'SGD'],
    flag: '🇨🇳',
    region: 'China · Hong Kong · Singapore',
    color: '#1677ff',
    bgClass: 'bg-blue-500/10',
    method: 'redirect',
    fees: '0.55% cross-border',
    docs: 'https://global.alipay.com/docs/ac/global/overview',
    logoUrl: 'https://logo.clearbit.com/alipay.com',
  },

  // ── South Korea ───────────────────────────────────────────────────────────
  {
    id: 'toss',
    name: 'Toss Payments',
    kvKey: 'toss_config',
    countries: ['South Korea'],
    currencies: ['KRW'],
    flag: '🇰🇷',
    region: 'South Korea',
    color: '#3182f6',
    bgClass: 'bg-blue-500/10',
    method: 'redirect',
    fees: '3.3%',
    docs: 'https://docs.tosspayments.com/sdk/javascript',
    logoUrl: 'https://logo.clearbit.com/toss.im',
  },

  // ── Japan ─────────────────────────────────────────────────────────────────
  {
    id: 'paidy',
    name: 'Paidy',
    kvKey: 'paidy_config',
    countries: ['Japan'],
    currencies: ['JPY'],
    flag: '🇯🇵',
    region: 'Japan',
    color: '#ff6600',
    bgClass: 'bg-orange-500/10',
    method: 'popup',
    fees: '3% merchant fee',
    docs: 'https://paidy.com/docs/api/',
    sdkUrl: 'https://widget.paidy.com/paidy.js',
    logoUrl: 'https://logo.clearbit.com/paidy.com',
  },

  // ── UAE / MENA ────────────────────────────────────────────────────────────
  {
    id: 'checkout_com',
    name: 'Checkout.com',
    kvKey: 'checkout_com_config',
    countries: ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Egypt', 'Jordan'],
    currencies: ['AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'JOD', 'USD'],
    flag: '🇦🇪',
    region: 'UAE · Saudi Arabia · MENA',
    color: '#17212b',
    bgClass: 'bg-slate-500/10',
    method: 'redirect',
    fees: '2.9%',
    docs: 'https://www.checkout.com/docs/payments/accept-payments',
    logoUrl: 'https://logo.clearbit.com/checkout.com',
  },

  // ── LATAM ─────────────────────────────────────────────────────────────────
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    kvKey: 'mercadopago_config',
    countries: ['Brazil', 'Argentina', 'Mexico', 'Colombia', 'Chile', 'Peru', 'Uruguay'],
    currencies: ['BRL', 'ARS', 'MXN', 'COP', 'CLP', 'PEN', 'UYU'],
    flag: '🇧🇷',
    region: 'Brazil · Argentina · LATAM',
    color: '#009ee3',
    bgClass: 'bg-sky-500/10',
    method: 'redirect',
    fees: '4.99% + fixed',
    docs: 'https://www.mercadopago.com.br/developers/en/docs/checkout-pro/landing',
    logoUrl: 'https://logo.clearbit.com/mercadopago.com',
  },
];

/** Quick lookup by gateway ID */
export const GATEWAY_MAP = Object.fromEntries(
  GATEWAY_REGISTRY.map(g => [g.id, g])
) as Record<GatewayId, GatewayDefinition>;

/** Country → best gateway IDs (priority order shown first) */
export const COUNTRY_GATEWAY_MAP: Record<string, GatewayId[]> = {
  Nigeria:         ['opay', 'paystack', 'flutterwave'],
  Ghana:           ['paystack', 'mtn_momo', 'flutterwave'],
  'South Africa':  ['paystack', 'flutterwave', 'stripe'],
  Kenya:           ['paystack', 'flutterwave'],
  Uganda:          ['mtn_momo', 'flutterwave'],
  'Ivory Coast':   ['mtn_momo', 'flutterwave'],
  Rwanda:          ['mtn_momo', 'flutterwave'],
  Cameroon:        ['mtn_momo', 'flutterwave'],
  Senegal:         ['flutterwave'],
  Tanzania:        ['flutterwave'],
  USA:             ['stripe', 'paypal'],
  UK:              ['stripe', 'paypal'],
  Canada:          ['stripe', 'paypal', 'interac'],
  EU:              ['stripe', 'paypal'],
  Australia:       ['stripe', 'paypal'],
  Switzerland:     ['stripe'],
  Norway:          ['stripe'],
  Sweden:          ['stripe'],
  Singapore:       ['stripe', 'xendit'],
  'New Zealand':   ['stripe'],
  India:           ['razorpay'],
  Indonesia:       ['xendit'],
  Philippines:     ['xendit'],
  Malaysia:        ['xendit'],
  Thailand:        ['xendit'],
  Vietnam:         ['xendit'],
  China:           ['alipay'],
  'Hong Kong':     ['alipay', 'stripe'],
  Macau:           ['alipay'],
  'South Korea':   ['toss'],
  Japan:           ['paidy', 'stripe'],
  UAE:             ['checkout_com'],
  'Saudi Arabia':  ['checkout_com'],
  Qatar:           ['checkout_com'],
  Kuwait:          ['checkout_com'],
  Bahrain:         ['checkout_com'],
  Oman:            ['checkout_com'],
  Egypt:           ['checkout_com', 'flutterwave'],
  Jordan:          ['checkout_com'],
  Brazil:          ['mercadopago', 'paypal'],
  Argentina:       ['mercadopago'],
  Mexico:          ['mercadopago', 'paypal'],
  Colombia:        ['mercadopago'],
  Chile:           ['mercadopago'],
  Peru:            ['mercadopago'],
  Uruguay:         ['mercadopago'],
};

/**
 * Returns ordered gateway IDs for a given country.
 * Falls back to Stripe + PayPal for unlisted countries.
 */
export function getGatewaysForCountry(country: string): GatewayId[] {
  return COUNTRY_GATEWAY_MAP[country] ?? ['stripe', 'paypal'];
}

/** Config field definitions per gateway (drives admin form rendering) */
export interface GatewayField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'url';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export const GATEWAY_FIELDS: Record<GatewayId, GatewayField[]> = {
  opay: [
    { key: 'opay_merchant_id', label: 'Merchant ID', type: 'text', placeholder: '256612345678901' },
    { key: 'opay_public_key',  label: 'Public Key',  type: 'text', placeholder: 'OPAYPUB...' },
    { key: 'opay_secret_key',  label: 'Secret Key',  type: 'password', placeholder: 'OPAYSEC...' },
    { key: 'opay_environment', label: 'Environment', type: 'select', options: [{ value: 'sandbox', label: '🟡 Sandbox' }, { value: 'production', label: '🟢 Production' }] },
    { key: 'opay_callback_url', label: 'Callback URL', type: 'url' },
  ],
  paystack: [
    { key: 'publicKey',    label: 'Public Key',     type: 'text',     placeholder: 'pk_test_...' },
    { key: 'secretKey',    label: 'Secret Key',     type: 'password', placeholder: 'sk_test_...' },
    { key: 'webhookSecret',label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' },
    { key: 'environment',  label: 'Environment',    type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'live', label: '🟢 Live' }] },
    { key: 'callbackUrl',  label: 'Callback URL',   type: 'url' },
  ],
  flutterwave: [
    { key: 'publicKey',    label: 'Public Key',     type: 'text',     placeholder: 'FLWPUBK_TEST-...' },
    { key: 'secretKey',    label: 'Secret Key',     type: 'password', placeholder: 'FLWSECK_TEST-...' },
    { key: 'webhookSecret',label: 'Webhook Secret (verif-hash)', type: 'password' },
    { key: 'environment',  label: 'Environment',    type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'live', label: '🟢 Live' }] },
    { key: 'callbackUrl',  label: 'Redirect URL',   type: 'url' },
  ],
  mtn_momo: [
    { key: 'subscriptionKey',  label: 'Primary Subscription Key', type: 'password' },
    { key: 'apiUser',          label: 'API User UUID',             type: 'text' },
    { key: 'apiKey',           label: 'API Key',                   type: 'password' },
    { key: 'targetEnvironment',label: 'Target Environment',        type: 'select', options: [
      { value: 'sandbox',     label: '🟡 Sandbox' },
      { value: 'mtnghana',    label: '🟢 MTN Ghana' },
      { value: 'mtnuganda',   label: '🟢 MTN Uganda' },
      { value: 'mtnivorycoast', label: '🟢 MTN Ivory Coast' },
      { value: 'mtnrwanda',   label: '🟢 MTN Rwanda' },
      { value: 'mtncameroon', label: '🟢 MTN Cameroon' },
    ]},
    { key: 'callbackUrl',      label: 'Callback URL',              type: 'url' },
  ],
  stripe: [
    { key: 'publicKey',    label: 'Publishable Key', type: 'text',     placeholder: 'pk_test_...' },
    { key: 'secretKey',    label: 'Secret Key',      type: 'password', placeholder: 'sk_test_...' },
    { key: 'webhookSecret',label: 'Webhook Secret',  type: 'password', placeholder: 'whsec_...' },
    { key: 'environment',  label: 'Environment',     type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'live', label: '🟢 Live' }] },
    { key: 'callbackUrl',  label: 'Success Return URL', type: 'url' },
  ],
  paypal: [
    { key: 'clientId',     label: 'Client ID',    type: 'text',     placeholder: 'AeA...' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
    { key: 'webhookId',    label: 'Webhook ID',    type: 'text' },
    { key: 'environment',  label: 'Environment',   type: 'select',   options: [{ value: 'sandbox', label: '🟡 Sandbox' }, { value: 'production', label: '🟢 Production' }] },
    { key: 'callbackUrl',  label: 'Return URL',    type: 'url' },
  ],
  razorpay: [
    { key: 'keyId',        label: 'Key ID',        type: 'text',     placeholder: 'rzp_test_...' },
    { key: 'keySecret',    label: 'Key Secret',    type: 'password' },
    { key: 'webhookSecret',label: 'Webhook Secret', type: 'password' },
    { key: 'environment',  label: 'Environment',   type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'live', label: '🟢 Live' }] },
    { key: 'callbackUrl',  label: 'Callback URL',  type: 'url' },
  ],
  xendit: [
    { key: 'publicKey',    label: 'Public API Key', type: 'text',     placeholder: 'xnd_public_...' },
    { key: 'secretKey',    label: 'Secret API Key', type: 'password', placeholder: 'xnd_development_...' },
    { key: 'webhookToken', label: 'Webhook Token',  type: 'password' },
    { key: 'environment',  label: 'Environment',    type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'production', label: '🟢 Production' }] },
    { key: 'callbackUrl',  label: 'Success URL',    type: 'url' },
  ],
  checkout_com: [
    { key: 'publicKey',    label: 'Public Key',     type: 'text',     placeholder: 'pk_sbox_...' },
    { key: 'secretKey',    label: 'Secret Key',     type: 'password', placeholder: 'sk_sbox_...' },
    { key: 'webhookSecret',label: 'Webhook Secret', type: 'password' },
    { key: 'environment',  label: 'Environment',    type: 'select',   options: [{ value: 'sandbox', label: '🟡 Sandbox' }, { value: 'production', label: '🟢 Production' }] },
    { key: 'callbackUrl',  label: 'Success URL',    type: 'url' },
  ],
  alipay: [
    { key: 'appId',       label: 'App ID',          type: 'text' },
    { key: 'privateKey',  label: 'Private Key',     type: 'password' },
    { key: 'publicKey',   label: 'Alipay Public Key', type: 'text' },
    { key: 'environment', label: 'Environment',     type: 'select', options: [{ value: 'sandbox', label: '🟡 Sandbox' }, { value: 'production', label: '🟢 Production' }] },
    { key: 'callbackUrl', label: 'Notify URL',      type: 'url' },
  ],
  toss: [
    { key: 'clientKey',   label: 'Client Key',      type: 'text',     placeholder: 'test_ck_...' },
    { key: 'secretKey',   label: 'Secret Key',      type: 'password', placeholder: 'test_sk_...' },
    { key: 'environment', label: 'Environment',     type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'live', label: '🟢 Live' }] },
    { key: 'callbackUrl', label: 'Success URL',     type: 'url' },
  ],
  paidy: [
    { key: 'publicKey',   label: 'API Key (Public)', type: 'text',     placeholder: 'pk_test_...' },
    { key: 'secretKey',   label: 'API Key (Secret)', type: 'password', placeholder: 'sk_test_...' },
    { key: 'environment', label: 'Environment',      type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'production', label: '🟢 Production' }] },
    { key: 'callbackUrl', label: 'Callback URL',     type: 'url' },
  ],
  mercadopago: [
    { key: 'accessToken', label: 'Access Token',    type: 'password', placeholder: 'TEST-...' },
    { key: 'publicKey',   label: 'Public Key',      type: 'text',     placeholder: 'TEST-...' },
    { key: 'webhookSecret', label: 'Webhook Secret', type: 'password' },
    { key: 'environment', label: 'Environment',     type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'production', label: '🟢 Production' }] },
    { key: 'callbackUrl', label: 'Back URL',         type: 'url' },
  ],
  interac: [
    { key: 'merchantId',  label: 'Merchant ID',     type: 'text' },
    { key: 'apiKey',      label: 'API Key',         type: 'password' },
    { key: 'environment', label: 'Environment',     type: 'select',   options: [{ value: 'test', label: '🟡 Test' }, { value: 'production', label: '🟢 Production' }] },
    { key: 'callbackUrl', label: 'Redirect URL',    type: 'url' },
  ],
};
