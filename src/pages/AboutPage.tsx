import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Globe, Zap, Database, Lock, Gift, Star, Activity, Link as LinkIcon, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AboutPage() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "The Ecosystem",
      icon: <Globe className="text-blue-500" size={24} />,
      content: "NetReward NRT creates a revolutionary cyclical economy where Standard Users, Service Providers (SPs), and Internet Service Providers (ISPs) interact in a transparent, rewarding loop. Users earn for their data, SPs acquire highly targeted engagement, and ISPs monetize their network quality—all governed by smart contracts on the blockchain."
    },
    {
      title: "Trust & Security First",
      icon: <ShieldCheck className="text-green-500" size={24} />,
      content: "Security is built into our core. All biometric and PIN data is encrypted and stored locally on your device. We use industry-standard decentralized protocols ensuring your data remains private and your wallet assets are fully under your control."
    },
    {
      title: "Zero-Loss Payment for SPs",
      icon: <Lock className="text-orange-500" size={24} />,
      content: "Service Providers never lose payments due to privacy concerns. Our Web3 payment infrastructure guarantees swift, secure, and verifiable transactions, ensuring that SP platforms receive exact settlements without the risk of traditional chargebacks."
    },
    {
      title: "Innovation & Technology",
      icon: <Cpu className="text-purple-500" size={24} />,
      content: "Powered by edge computing and real-time telemetry pipelines, NetReward accurately measures data consumption and engagement. This innovative tracking guarantees fair rewards while maintaining an incredibly low latency footprint across all networks."
    },
    {
      title: "A Rewarding Data Experience",
      icon: <Gift className="text-accent-primary" size={24} />,
      content: "You are the owner of your data. The NetReward ecosystem directly rewards you with NRT tokens for your active participation. Trade, hold, or utilize NRT for premium services within the platform."
    }
  ];

  return (
    <motion.div 
      className="min-h-screen bg-bg-primary pb-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-lg border-b border-glass-border px-4 py-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">About NetReward NRT</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-6 mt-4">
        {/* Header Hero */}
        <div className="glass rounded-[2rem] p-8 text-center border border-accent-primary/20 relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent-primary/20 blur-[60px] pointer-events-none rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[60px] pointer-events-none rounded-full" />
          
          <div className="w-20 h-20 mx-auto bg-bg-secondary rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-glass-border relative z-10">
            <Zap className="text-accent-primary" size={40} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-text-primary mb-3 relative z-10">NetReward</h2>
          <p className="text-sm text-text-secondary leading-relaxed font-medium relative z-10">
            Empowering the next generation of data monetization through transparent, secure, and rewarding web3 technology.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          {sections.map((section, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass p-6 rounded-2xl border border-glass-border"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center shadow-inner">
                  {section.icon}
                </div>
                <h3 className="text-lg font-bold text-text-primary">{section.title}</h3>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-8 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-full border border-glass-border text-xs text-text-secondary font-medium mb-4">
            <Star size={14} className="text-amber-500" /> Version 1.0.0
          </div>
          <p className="text-[10px] text-text-secondary opacity-60 uppercase tracking-widest font-bold">
            © 2026 NetReward. All rights reserved.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
