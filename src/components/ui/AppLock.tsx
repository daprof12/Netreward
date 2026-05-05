import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { Fingerprint, Lock, Loader2, KeyRound } from 'lucide-react';
import PinEntryModal from '@/components/ui/PinEntryModal';

export default function AppLock() {
  const { biometricsEnabled, isBiometricSetup, pin, unlock } = useSecurityStore();
  const { user } = useAuthStore();
  const [showPinModal, setShowPinModal] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  // Auto-trigger biometric if enabled
  useEffect(() => {
    if (biometricsEnabled && isBiometricSetup) {
      handleBiometricUnlock();
    }
  }, [biometricsEnabled, isBiometricSetup]);

  const handleBiometricUnlock = () => {
    setIsBiometricLoading(true);
    // Simulate biometric API call
    setTimeout(() => {
      unlock(); // Unlocks the app using biometric
      setIsBiometricLoading(false);
    }, 1500);
  };

  const handlePinSuccess = (enteredPin: string) => {
    const success = unlock(enteredPin);
    if (success) {
      setShowPinModal(false);
    } else {
      // PinEntryModal handles its own error state if we pass an error prop, 
      // but here we just rely on it returning. We can add toast if needed.
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent-primary/20 blur-[100px] pointer-events-none"></div>
      
      <motion.div
        className="w-full max-w-sm glass rounded-[24px] p-8 shadow-2xl shadow-accent-primary/5 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-glass-border">
          <Lock size={40} className="text-text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">App Locked</h2>
        <p className="text-text-secondary text-sm mb-8">
          Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}.<br/>
          Please unlock to continue.
        </p>

        <div className="space-y-4">
          {biometricsEnabled && isBiometricSetup && (
            <button
              onClick={handleBiometricUnlock}
              disabled={isBiometricLoading}
              className="w-full flex items-center justify-center gap-2 bg-accent-primary text-primary-foreground font-semibold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all"
            >
              {isBiometricLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Fingerprint size={20} />
                  <span>Unlock with Biometrics</span>
                </>
              )}
            </button>
          )}

          {pin && (
            <button
              onClick={() => setShowPinModal(true)}
              disabled={isBiometricLoading}
              className={`w-full flex items-center justify-center gap-2 bg-bg-secondary text-text-primary font-semibold py-4 rounded-xl border border-glass-border hover:bg-glass-bg transition-all active:scale-[0.98] ${(!biometricsEnabled || !isBiometricSetup) ? 'bg-accent-primary text-primary-foreground border-none' : ''}`}
            >
              <KeyRound size={20} className={(!biometricsEnabled || !isBiometricSetup) ? '' : 'text-orange-500'} />
              <span>Use PIN</span>
            </button>
          )}
        </div>
      </motion.div>

      <PinEntryModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
        title="Enter Security PIN"
        description="Enter your 4-digit PIN to unlock the app."
        expectedPin={pin}
      />
    </div>
  );
}
