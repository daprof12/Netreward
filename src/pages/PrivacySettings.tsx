import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Activity, Database, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function PrivacySettings() {
  usePageTitle('Privacy');
  const navigate = useNavigate();
  const [dataTrackingEnabled, setDataTrackingEnabled] = useState(true);

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
        <h1 className="text-xl font-bold">Privacy Policy</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-6">
        <div className="flex flex-col items-center mt-4 mb-6 text-center">
          <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mb-4 border border-accent-primary/20">
            <ShieldCheck size={32} className="text-accent-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Data & Privacy</h2>
          <p className="text-text-secondary text-sm mt-2 max-w-xs mx-auto">
            Review our terms and manage how your data is tracked for campaign rewards.
          </p>
        </div>

        <div className="glass rounded-2xl border border-glass-border p-5 space-y-4">
          <h3 className="font-bold text-lg border-b border-glass-border pb-3">Data Tracking Consent</h3>
          
          <div className="flex items-start gap-3">
            <Activity size={20} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Foreground & Background Tracking</p>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                By default, our app tracks and monitors background and foreground data usage using the system's inbuilt data consumption reports and our own intelligent tracker to accurately calculate your NRT rewards.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-glass-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-text-primary">Allow Data Tracking</p>
              {!dataTrackingEnabled && (
                <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> Earnings paused while disabled
                </p>
              )}
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={dataTrackingEnabled}
                onChange={() => setDataTrackingEnabled(!dataTrackingEnabled)}
              />
              <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <Link to="/settings/privacy/terms" className="w-full flex items-center justify-between p-4 glass rounded-xl border border-glass-border hover:bg-glass-bg transition-colors">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-text-secondary" />
              <span className="font-medium">Terms of Service</span>
            </div>
            <ChevronLeft size={18} className="text-text-secondary opacity-50 rotate-180" />
          </Link>
          
          <Link to="/settings/privacy/full" className="w-full flex items-center justify-between p-4 glass rounded-xl border border-glass-border hover:bg-glass-bg transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-text-secondary" />
              <span className="font-medium">Full Privacy Policy</span>
            </div>
            <ChevronLeft size={18} className="text-text-secondary opacity-50 rotate-180" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
