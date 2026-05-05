import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSecurityStore } from '@/stores/useSecurityStore';
import BiometricSetupModal from '@/components/ui/BiometricSetupModal';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function SecuritySettings() {
  usePageTitle('Security');
  const navigate = useNavigate();
  const { 
    biometricsEnabled, 
    isBiometricSetup, 
    setBiometricsEnabled,
    pin
  } = useSecurityStore();

  const [showSetupModal, setShowSetupModal] = useState(false);

  const handleToggleBiometrics = () => {
    if (!biometricsEnabled && !isBiometricSetup) {
      setShowSetupModal(true);
    } else {
      setBiometricsEnabled(!biometricsEnabled);
    }
  };

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
        <h1 className="text-xl font-bold">Security & 2FA</h1>
        <div className="w-10" />
      </div>

      <div className="p-4 space-y-6">
        <div className="glass rounded-[2rem] border border-glass-border overflow-hidden">
          <div className="p-5 bg-bg-card border-b border-glass-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary shadow-inner">
                <Fingerprint size={24} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">Biometric Login</h3>
                <p className="text-xs text-text-secondary">Use Face ID or Touch ID</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer scale-110">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={biometricsEnabled}
                onChange={handleToggleBiometrics}
              />
              <div className="w-11 h-6 bg-bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary shadow-sm"></div>
            </label>
          </div>

          <div 
            onClick={() => navigate('/settings/security/pin')}
            className="p-5 bg-bg-card flex items-center justify-between cursor-pointer hover:bg-bg-secondary transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner">
                <KeyRound size={24} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">Transaction PIN</h3>
                <p className="text-xs text-text-secondary">{pin ? 'Change your 4-digit PIN' : 'Set a 4-digit PIN'}</p>
              </div>
            </div>
            <button className="text-xs font-bold text-accent-primary bg-accent-primary/10 px-4 py-2 rounded-xl group-hover:bg-accent-primary group-hover:text-primary-foreground transition-all">
              {pin ? 'Change' : 'Set PIN'}
            </button>
          </div>
        </div>

        <div className="glass rounded-[1.5rem] border border-green-500/20 p-5 flex gap-4 bg-green-500/[0.03]">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            <span className="font-bold text-text-primary">Account Secured.</span> We use industry standard encryption and on-device biometric storage to protect your assets and private keys.
          </p>
        </div>
      </div>

      <BiometricSetupModal 
        isOpen={showSetupModal} 
        onClose={() => setShowSetupModal(false)} 
      />
    </motion.div>
  );
}
