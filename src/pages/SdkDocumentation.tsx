import { motion } from 'framer-motion';
import { ChevronLeft, Code, Terminal, Key, FileJson, Layers, ExternalLink, CheckCircle2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';
import { useAuthStore } from '@/stores/useAuthStore';

function useDashboardKeys() {
  const { role } = useAuthStore();
  const { services } = useSpStore();
  const { networks } = useIspStore();

  if (role === 'sp' && services.length > 0) {
    const s = services[0];
    return {
      apiKey: s.apiKey || null,
      secretKey: s.secretKey || null,
      webhookSecret: s.webhookSecret || null,
    };
  }
  if (role === 'isp' && networks.length > 0) {
    const n = networks[0];
    return {
      apiKey: n.apiKey || null,
      secretKey: n.apiSecret || null,
      webhookSecret: null,
    };
  }
  return { apiKey: null, secretKey: null, webhookSecret: null };
}

function KeyDisplay({ label, value, masked = true }: { label: string; value: string | null; masked?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const display = value
    ? (masked && !visible ? value.slice(0, 12) + '••••••••••••••••' : value)
    : 'Not generated yet — create a service/network first';

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

export default function SdkDocumentation() {
  usePageTitle('SDK Docs');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'installation' | 'configuration' | 'events'>('overview');
  const { apiKey, secretKey } = useDashboardKeys();

  // Use real key in code samples, fall back to placeholder
  const displayApiKey = apiKey ?? 'YOUR_API_KEY';

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
          <h1 className="text-xl font-bold">NetReward Tracker SDK</h1>
          <p className="text-xs text-text-secondary">v2.1.0 • Developer Documentation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-secondary p-1 rounded-xl overflow-x-auto scrollbar-hide border border-glass-border">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'installation', label: 'Installation', icon: Terminal },
          { id: 'configuration', label: 'Configuration', icon: Key },
          { id: 'events', label: 'Event Tracking', icon: FileJson },
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
                <Code size={24} className="text-accent-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Introduction</h2>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  The NetReward Tracker SDK is an industrial-grade telemetry client designed for Mobile Applications (iOS/Android), Web Applications, and backend services. It securely records data consumption, user sessions, and custom application events to calculate and distribute NRT rewards with cryptographic verifiable accuracy.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> BGP IP Validation</h3>
                <p className="text-xs text-text-secondary mt-1">Automatically resolves device IP against global BGP routing tables to verify ISP authenticity and prevent VPN abuse.</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Off-Chain Batching</h3>
                <p className="text-xs text-text-secondary mt-1">Aggregates micro-transactions locally and flushes to the NetReward rollup periodically to save network bandwidth.</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> End-to-End Encryption</h3>
                <p className="text-xs text-text-secondary mt-1">All telemetry data is signed using an ed25519 payload signature ensuring tamper-proof reward claims.</p>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Multi-Platform</h3>
                <p className="text-xs text-text-secondary mt-1">Available via NPM, CocoaPods, Gradle, and direct REST API for backend-to-backend integrations.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'installation' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Installation</h2>
            <p className="text-sm text-text-secondary">Install the core tracking library into your application.</p>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold mb-2">Web / React Native (NPM)</h3>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 relative group">
                  <code className="text-xs font-mono text-accent-primary">npm install @netreward/tracker-sdk</code>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-2">iOS (CocoaPods)</h3>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 relative group">
                  <code className="text-xs font-mono text-accent-primary">pod 'NetRewardTracker', '~&gt; 2.1.0'</code>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-2">Android (Gradle)</h3>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 relative group">
                  <code className="text-xs font-mono text-accent-primary">implementation 'com.netreward.sdk:tracker:2.1.0'</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Initialization & Configuration</h2>
            <p className="text-sm text-text-secondary mb-4">You must initialize the SDK as early as possible in your application lifecycle (e.g., inside App.tsx or AppDelegate).</p>

            {/* ── Your Keys ── */}
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Key size={14} className="text-accent-primary" /> Your Credentials
              </h3>
              <KeyDisplay label="SDK / Tracker API Key" value={apiKey} />
              <KeyDisplay label="Secret Key (backend only)" value={secretKey} />
            </div>

            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`import { NetRewardTracker } from '@netreward/tracker-sdk';

// Initialize the tracker singleton
NetRewardTracker.init({
  apiKey: '${displayApiKey}',
  environment: 'production',   // 'sandbox' | 'production'

  // Optional: Advanced configuration
  config: {
    batchIntervalMs: 60000,    // Flush data every 60s
    maxRetries: 3,             // Retry failed uploads
    logLevel: 'warn',          // 'debug' | 'info' | 'warn' | 'error'
    captureBackground: true    // Track data while app is backgrounded
  }
});`}
              </pre>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-4">
              <h4 className="text-sm font-bold text-amber-500 mb-1">Security Warning</h4>
              <p className="text-xs text-amber-500/80">Never expose your Secret Key on client-side applications. The <code>apiKey</code> above is for client telemetry only. For secure backend verification, use your Secret Key via the REST API.</p>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Tracking Data & Events</h2>
            <p className="text-sm text-text-secondary">Track standard data consumption or custom conversion events.</p>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold mb-2 border-b border-glass-border pb-1">1. User Identification</h3>
                <p className="text-xs text-text-secondary mb-2">Link the telemetry to a specific user to ensure they receive NRT rewards.</p>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
                  <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`NetRewardTracker.identify('user_12345', {
  nrtWalletAddress: 'NRTx8p9b...', // If the user has a linked wallet
  deviceType: 'ios'
});`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-2 border-b border-glass-border pb-1">2. Tracking Data Usage (Automated)</h3>
                <p className="text-xs text-text-secondary mb-2">Once initialized, the SDK automatically tracks network requests made via standard fetch/XHR interfaces. To manually log bulk data (e.g., video streaming buffers):</p>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
                  <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`// Log 50MB of downloaded streaming data
NetRewardTracker.logDataConsumption({
  bytesReceived: 52428800, // 50MB in bytes
  contentType: 'video/mp4',
  source: 'cdn-east-1'
});`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-2 border-b border-glass-border pb-1">3. Custom Events</h3>
                <p className="text-xs text-text-secondary mb-2">Track user interactions that may trigger specific campaign bonuses.</p>
                <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
                  <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`NetRewardTracker.track('Checkout_Completed', {
  orderValue: 125.50,
  currency: 'USD',
  items: ['Premium_Subscription']
});`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <a href="#" className="flex items-center gap-2 text-sm font-bold text-accent-primary hover:underline">
          View full API Reference <ExternalLink size={14} />
        </a>
      </div>
    </motion.div>
  );
}
