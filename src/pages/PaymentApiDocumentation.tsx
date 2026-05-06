import { motion } from 'framer-motion';
import { ChevronLeft, Code, CreditCard, Webhook, Key, ShieldCheck, CheckCircle2, ExternalLink, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';
import { useAuthStore } from '@/stores/useAuthStore';

// ── Shared key reader ────────────────────────────────────────────────────────

function useDashboardKeys() {
  const { role } = useAuthStore();
  const { services, paymentIntegration } = useSpStore();
  const { networks } = useIspStore();

  if (role === 'sp') {
    // Payment API key lives on the service or paymentIntegration object
    const apiKey = paymentIntegration?.apiKey || services[0]?.apiKey || null;
    const secretKey = services[0]?.secretKey || null;
    const webhookSecret = paymentIntegration?.webhookSecret || services[0]?.webhookSecret || null;
    const webhookUrl = paymentIntegration?.webhookUrl || services[0]?.webhookUrl || null;
    return { apiKey, secretKey, webhookSecret, webhookUrl };
  }
  if (role === 'isp' && networks.length > 0) {
    const n = networks[0];
    return {
      apiKey: n.apiKey || null,
      secretKey: n.apiSecret || null,
      webhookSecret: null,
      webhookUrl: n.webhookUrl || null,
    };
  }
  return { apiKey: null, secretKey: null, webhookSecret: null, webhookUrl: null };
}

// ── Reusable key display component ───────────────────────────────────────────

function KeyDisplay({ label, value, masked = true }: { label: string; value: string | null; masked?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const display = value
    ? (masked && !visible ? value.slice(0, 12) + '••••••••••••••••' : value)
    : 'Not set — complete service setup first';

  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-bg-secondary border border-glass-border rounded-xl p-3">
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className={`flex-1 text-xs font-mono break-all ${value ? 'text-accent-primary' : 'text-text-secondary italic'}`}>
          {display}
        </code>
        {value && (
          <div className="flex items-center gap-1 shrink-0">
            {masked && (
              <button
                onClick={() => setVisible(v => !v)}
                className="p-1.5 rounded-lg hover:bg-glass-border transition-colors text-text-secondary"
                title={visible ? 'Hide' : 'Reveal'}
              >
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            )}
            <button
              onClick={copy}
              className="p-1.5 rounded-lg hover:bg-glass-border transition-colors text-text-secondary"
              title="Copy"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PaymentApiDocumentation() {
  usePageTitle('Payment API Docs');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'authentication' | 'endpoints' | 'webhooks'>('overview');
  const { apiKey, secretKey, webhookSecret, webhookUrl } = useDashboardKeys();

  // Values to inject into code samples — fall back to readable placeholder
  const displayApiKey     = apiKey        ?? 'YOUR_PAYMENT_API_KEY';
  const displaySecretKey  = secretKey     ?? 'YOUR_SECRET_KEY';
  const displayWhSecret   = webhookSecret ?? 'YOUR_WEBHOOK_SECRET';
  const displayWhUrl      = webhookUrl    ?? 'https://your-server.com/webhooks/nrt';

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8 max-w-4xl mx-auto"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full hover:bg-glass-bg transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Payment API Reference</h1>
          <p className="text-xs text-text-secondary">v1.4.0 • Service Provider Integration</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-secondary p-1 rounded-xl overflow-x-auto scrollbar-hide border border-glass-border">
        {[
          { id: 'overview',        label: 'Overview',        icon: CreditCard },
          { id: 'authentication',  label: 'Authentication',  icon: Key },
          { id: 'endpoints',       label: 'Core Endpoints',  icon: Code },
          { id: 'webhooks',        label: 'Webhooks',        icon: Webhook },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="glass rounded-2xl border border-glass-border p-6 min-h-[400px]">

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center shrink-0">
                <CreditCard size={24} className="text-accent-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Introduction</h2>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  The NetReward Payment API enables Service Providers to accept NRT (NetReward Token) payments directly within their platforms. Built on robust REST principles, the API facilitates checkout session creation, immediate payment verification, and automated refund management.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-6">
              {[
                { title: 'Instant Settlement', desc: 'Transactions bypass traditional waiting periods, settling instantly on the NetReward sub-ledger before batching to the mainnet.' },
                { title: 'Multi-Currency', desc: 'Price items in USD, EUR, or GBP. The API handles real-time oracle conversions to NRT during checkout.' },
                { title: 'Webhook Driven', desc: 'Zero polling required. Receive cryptographically signed POST requests immediately upon payment success.' },
                { title: 'Idempotent Requests', desc: 'All state-changing endpoints support idempotent keys to safely retry failed network requests.' },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                  <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> {title}</h3>
                  <p className="text-xs text-text-secondary mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Authentication ── */}
        {activeTab === 'authentication' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Authentication</h2>
            <p className="text-sm text-text-secondary mb-4">
              Authenticate requests using your <strong className="text-text-primary">Payment API Key</strong> as a Bearer token.
            </p>

            {/* Real credentials panel */}
            <div className="space-y-2 mb-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Key size={14} className="text-accent-primary" /> Your Credentials
              </h3>
              <KeyDisplay label="Payment API Key" value={apiKey} />
              <KeyDisplay label="Secret Key (backend only — never expose client-side)" value={secretKey} />
            </div>

            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`curl -X GET "https://api.netreward.online/v1/payments/balance" \\
  -H "Authorization: Bearer ${displayApiKey}"`}
              </pre>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-4 flex gap-3">
              <ShieldCheck size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-500 mb-1">Key Security</h4>
                <p className="text-xs text-amber-500/80">
                  Your Payment API key carries high privileges and can authorize refunds and payouts. Never expose this key in client-side code (browsers or mobile apps). All API calls must originate from your secure backend servers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Endpoints ── */}
        {activeTab === 'endpoints' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Core Endpoints</h2>

            <div className="space-y-6">
              {/* Create Checkout */}
              <div>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider">POST</span>
                  /v1/checkout/sessions
                </h3>
                <p className="text-xs text-text-secondary mb-3">Creates a new checkout session and returns a payment URL for the user.</p>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
                  <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`curl -X POST "https://api.netreward.online/v1/checkout/sessions" \\
  -H "Authorization: Bearer ${displayApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 49.99,
    "currency": "USD",
    "metadata": {
      "order_id": "ORD-12345",
      "customer_id": "CUST-987"
    },
    "success_url": "https://your-site.com/success?session_id={CHECKOUT_SESSION_ID}",
    "cancel_url": "https://your-site.com/cancel"
  }'`}
                  </pre>
                </div>
              </div>

              {/* Get Session */}
              <div>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider">GET</span>
                  /v1/checkout/sessions/:id
                </h3>
                <p className="text-xs text-text-secondary mb-3">Retrieve the status of a specific checkout session.</p>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
                  <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`{
  "id": "cs_test_a1b2c3d4",
  "checkout_url": "https://netreward.online/pay?session=cs_test_a1b2c3d4",
  "status": "pending",
  "amount_nrt": 125.50
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Webhooks ── */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Webhook Events</h2>
            <p className="text-sm text-text-secondary mb-4">
              NetReward will send HTTP POST requests to your configured webhook URL when payment events occur. You must verify the webhook signature to prevent replay attacks.
            </p>

            {/* Real webhook credentials */}
            <div className="space-y-2 mb-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Webhook size={14} className="text-accent-primary" /> Your Webhook Credentials
              </h3>
              <KeyDisplay label="Webhook Secret (for signature verification)" value={webhookSecret} />
              <KeyDisplay label="Configured Webhook URL" value={webhookUrl} masked={false} />
            </div>

            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`// Node.js Express: Verifying the Webhook Signature
const crypto = require('crypto');

app.post('/webhooks/nrt', express.raw({type: 'application/json'}), (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-nrt-signature'];
  const webhookSecret = '${displayWhSecret}';

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload, 'utf8')
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(payload);

  if (event.type === 'payment.success') {
    fulfillOrder(event.data.metadata.order_id);
  }

  res.status(200).send();
});`}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <a href="#" className="flex items-center gap-2 text-sm font-bold text-accent-primary hover:underline">
          View Interactive API Explorer <ExternalLink size={14} />
        </a>
      </div>
    </motion.div>
  );
}
