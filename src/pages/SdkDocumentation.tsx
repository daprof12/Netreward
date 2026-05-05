import { motion } from 'framer-motion';
import { ChevronLeft, Code, Terminal, Key, FileJson, Layers, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function SdkDocumentation() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'installation' | 'configuration' | 'events'>('overview');

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

            <div className="bg-[#0f172a] rounded-xl p-4 border border-glass-border/30 overflow-x-auto">
              <pre className="text-xs font-mono text-gray-300 leading-relaxed">
{`import { NetRewardTracker } from '@netreward/tracker-sdk';

// Initialize the tracker singleton
NetRewardTracker.init({
  apiKey: 'sp_live_xxxxxxxxx', // Found in your Dashboard
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
              <p className="text-xs text-amber-500/80">Never expose your Secret Key on client-side applications. The `apiKey` provided above is meant for client telemetry only. For secure backend verification, utilize your Secret Key via the REST API.</p>
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
