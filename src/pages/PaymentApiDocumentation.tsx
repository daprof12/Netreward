import { motion } from 'framer-motion';
import { ChevronLeft, Code, CreditCard, Webhook, Key, ShieldCheck, CheckCircle2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function PaymentApiDocumentation() {
  usePageTitle('Payment API Docs');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'authentication' | 'endpoints' | 'webhooks'>('overview');

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
          { id: 'overview', label: 'Overview', icon: CreditCard },
          { id: 'authentication', label: 'Authentication', icon: Key },
          { id: 'endpoints', label: 'Core Endpoints', icon: Code },
          { id: 'webhooks', label: 'Webhooks', icon: Webhook },
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

      {/* Content Area */}
      <div className="glass rounded-2xl border border-glass-border p-6 min-h-[400px]">
        
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
              <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Instant Settlement</h3>
                <p className="text-xs text-text-secondary mt-1">Transactions bypass traditional waiting periods, settling instantly on the NetReward sub-ledger before batching to the mainnet.</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Multi-Currency</h3>
                <p className="text-xs text-text-secondary mt-1">Price items in USD, EUR, or GBP. The API handles real-time oracle conversions to NRT during checkout.</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Webhook Driven</h3>
                <p className="text-xs text-text-secondary mt-1">Zero polling required. Receive cryptographically signed POST requests immediately upon payment success.</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Idempotent Requests</h3>
                <p className="text-xs text-text-secondary mt-1">All state-changing endpoints support idempotent keys to safely retry failed network requests.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'authentication' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Authentication</h2>
            <p className="text-sm text-text-secondary mb-4">
              Authenticate requests using your <strong className="text-text-primary">Payment API Key</strong> as a Bearer token.
            </p>

            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`curl -X GET "https://api.netreward.online/v1/payments/balance" \\
  -H "Authorization: Bearer nrt_pay_xxxxxxxxxxxxxx"`}
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
{`{
  "amount": 49.99,
  "currency": "USD",
  "metadata": {
    "order_id": "ORD-12345",
    "customer_id": "CUST-987"
  },
  "success_url": "https://your-site.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://your-site.com/cancel"
}`}
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
  "status": "complete",
  "amount_nrt": 125.50,
  "payment_status": "paid",
  "customer": "usr_998877"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Webhook Events</h2>
            <p className="text-sm text-text-secondary mb-4">
              NetReward will send HTTP POST requests to your configured webhook URL when payment events occur. You must verify the webhook signature to prevent replay attacks.
            </p>

            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`// Node.js Express Example: Verifying the Webhook Signature
const crypto = require('crypto');

app.post('/webhooks/nrt', express.raw({type: 'application/json'}), (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-nrt-signature'];
  const webhookSecret = 'whsec_your_secret_key';

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
