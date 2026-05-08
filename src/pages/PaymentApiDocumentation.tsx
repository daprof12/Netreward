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
  const { services } = useSpStore();
  const { networks } = useIspStore();

  if (role === 'sp' && services.length > 0) {
    // Single API key per service — covers both SDK and payments
    const apiKey = services[0]?.apiKey || null;
    return { apiKey };
  }
  if (role === 'isp' && networks.length > 0) {
    const n = networks[0];
    return { apiKey: n.apiKey || null };
  }
  return { apiKey: null };
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
  usePageTitle('Developer Docs');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'authentication' | 'endpoints' | 'platforms' | 'webhooks'>('overview');
  const { apiKey } = useDashboardKeys();

  // Values to inject into code samples — fall back to readable placeholder
  const displayApiKey = apiKey ?? 'YOUR_SERVICE_API_KEY';

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
          <h1 className="text-xl font-bold">NetReward Tracker SDK & Payment Checkout</h1>
          <p className="text-xs text-text-secondary">v2.1.0 • Developer Documentation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-secondary p-1 rounded-xl overflow-x-auto scrollbar-hide border border-glass-border">
        {[
          { id: 'overview',        label: 'Overview',        icon: CreditCard },
          { id: 'authentication',  label: 'Auth & Keys',     icon: Key },
          { id: 'endpoints',       label: 'API Reference',   icon: Code },
          { id: 'platforms',       label: 'Platforms',        icon: Code },
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
                <h2 className="text-xl font-bold">One API Key. Full Coverage.</h2>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  The NetReward SDK is a unified integration for Service Providers and ISPs. Track user engagement, distribute NRT rewards, and accept payments — all with a single API key per service. Supports Web, Android, iOS, Linux, Flutter, and React Native.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {[
                { title: 'Unified API Key', desc: 'One key covers SDK tracking and payment checkout. No separate secrets or webhook configuration required.' },
                { title: 'Multi-Platform', desc: 'Native SDKs for Web (NPM/CDN), Android (Maven), iOS (SPM/CocoaPods), Flutter, React Native, and REST for Linux/servers.' },
                { title: 'Instant Settlement', desc: 'NRT payments settle instantly on the sub-ledger before batching to Solana mainnet. Multi-currency support (USD, EUR, GBP, NGN).' },
                { title: 'Idempotent & Secure', desc: 'All endpoints support idempotency keys. Webhook signatures use HMAC-SHA256 for tamper-proof event delivery.' },
              ].map(({ title, desc }) => (
                <div key={title} className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                  <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> {title}</h3>
                  <p className="text-xs text-text-secondary mt-1">{desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Quick Start — 5 Lines</p>
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`import { NetReward } from '@netreward/sdk';

const nrt = NetReward.init({ apiKey: '${displayApiKey}' });

nrt.tracker.track({ userId: 'user_123', event: 'page_view' });`}
              </pre>
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
              <KeyDisplay label="Service API Key (covers SDK & Payments)" value={apiKey} />
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

        {/* ── Platforms ── */}
        {activeTab === 'platforms' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Platform SDKs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-glass-border">
                    <th className="text-left py-2 px-3 text-text-secondary font-bold uppercase text-[10px]">Platform</th>
                    <th className="text-left py-2 px-3 text-text-secondary font-bold uppercase text-[10px]">Package</th>
                    <th className="text-left py-2 px-3 text-text-secondary font-bold uppercase text-[10px]">Install</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {[
                    { platform: 'Web (NPM)', pkg: '@netreward/sdk', install: 'npm install @netreward/sdk' },
                    { platform: 'Web (CDN)', pkg: 'nrt.min.js', install: '<script src="https://cdn.netreward.online/sdk/v2/nrt.min.js">' },
                    { platform: 'Android', pkg: 'io.netreward:sdk', install: "implementation 'io.netreward:sdk:2.1.0'" },
                    { platform: 'iOS (SPM)', pkg: 'NetRewardSDK', install: 'https://github.com/netreward/sdk-ios.git' },
                    { platform: 'Flutter', pkg: 'netreward_sdk', install: 'flutter pub add netreward_sdk' },
                    { platform: 'React Native', pkg: '@netreward/react-native', install: 'npm install @netreward/react-native' },
                    { platform: 'Python', pkg: 'netreward-sdk', install: 'pip install netreward-sdk' },
                    { platform: 'Go', pkg: 'sdk-go', install: 'go get github.com/netreward/sdk-go' },
                    { platform: 'PHP', pkg: 'netreward/sdk-php', install: 'composer require netreward/sdk-php' },
                    { platform: '.NET', pkg: 'NetReward.SDK', install: 'dotnet add package NetReward.SDK' },
                  ].map(r => (
                    <tr key={r.platform}>
                      <td className="py-2.5 px-3 font-bold text-text-primary">{r.platform}</td>
                      <td className="py-2.5 px-3 font-mono text-accent-primary">{r.pkg}</td>
                      <td className="py-2.5 px-3 font-mono text-text-secondary text-[10px]">{r.install}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-bold mt-4">Android (Kotlin)</h3>
            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`NetReward.init(this, NrtConfig.Builder()
    .apiKey("${displayApiKey}")
    .build())

NetReward.tracker.track(
    userId = "user_123", event = "app_open",
    metadata = mapOf("screen" to "home")
)`}
              </pre>
            </div>

            <h3 className="text-sm font-bold">iOS (Swift)</h3>
            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`NetReward.configure(apiKey: "${displayApiKey}")

NetReward.tracker.track(
    userId: "user_123",
    event: "content_view",
    metadata: ["contentId": "article_42"]
)`}
              </pre>
            </div>

            <h3 className="text-sm font-bold">Linux / Server (cURL)</h3>
            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`curl -X POST https://api.netreward.online/v1/track \\
  -H "Authorization: Bearer ${displayApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id":"user_123","event":"data_session",
       "metadata":{"bytes_down":157286400,"duration_seconds":3600}}'`}
              </pre>
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

            {/* Info about webhook setup */}
            <div className="space-y-2 mb-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Webhook size={14} className="text-accent-primary" /> Configuration
              </h3>
              <p className="text-xs text-text-secondary">Webhook endpoints can be configured per service in the NRT dashboard. Use your service API key to verify incoming events.</p>
            </div>

            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`// Node.js Express: Verifying the Webhook Signature
const crypto = require('crypto');

app.post('/webhooks/nrt', express.raw({type: 'application/json'}), (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-nrt-signature'];
  const apiKey = '${displayApiKey}';

  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
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
