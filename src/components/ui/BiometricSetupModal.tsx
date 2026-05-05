import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, CheckCircle2, ShieldCheck, X, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSecurityStore } from '@/stores/useSecurityStore';

interface BiometricSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BiometricSetupModal({ isOpen, onClose, onSuccess }: BiometricSetupModalProps) {
  const [step, setStep] = useState<'intro' | 'scanning' | 'success'>('intro');
  const { setBiometricSetup, setBiometricsEnabled } = useSecurityStore();

  useEffect(() => {
    if (!isOpen) {
      setStep('intro');
    }
  }, [isOpen]);

  const handleStartSetup = () => {
    setStep('scanning');
    // Simulate biometric scanning
    setTimeout(() => {
      setBiometricSetup(true);
      setBiometricsEnabled(true);
      setStep('success');
    }, 2500);
  };

  const handleComplete = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm glass rounded-[2.5rem] border border-glass-border overflow-hidden shadow-2xl"
          >
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-full flex justify-end mb-2">
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-glass-bg rounded-full transition-colors text-text-secondary"
                >
                  <X size={20} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {step === 'intro' && (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mx-auto">
                      <Fingerprint size={40} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-text-primary mb-2">Setup Biometrics</h2>
                      <p className="text-sm text-text-secondary">
                        Enable Touch ID or Face ID for faster logins and secure payment confirmations.
                      </p>
                    </div>
                    <div className="space-y-3 pt-4">
                      <button
                        onClick={handleStartSetup}
                        className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-accent-primary/20 active:scale-[0.98] transition-all"
                      >
                        Setup Now
                      </button>
                      <button
                        onClick={onClose}
                        className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-2xl hover:bg-glass-bg transition-all"
                      >
                        Maybe Later
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'scanning' && (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="space-y-8 py-4"
                  >
                    <div className="relative w-24 h-24 mx-auto">
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 1, 0.5]
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full bg-accent-primary/20"
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-accent-primary">
                        <Fingerprint size={48} className="animate-pulse" />
                      </div>
                      <svg className="w-full h-full -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="44"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-glass-border"
                        />
                        <motion.circle
                          cx="48"
                          cy="48"
                          r="44"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeDasharray="276"
                          initial={{ strokeDashoffset: 276 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ duration: 2.5, ease: "easeInOut" }}
                          className="text-accent-primary"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-primary mb-2">Authenticating...</h2>
                      <p className="text-sm text-text-secondary">Please place your finger on the sensor</p>
                    </div>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mx-auto border-4 border-green-500/20">
                      <CheckCircle2 size={40} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-text-primary mb-2">Successfully Setup</h2>
                      <p className="text-sm text-text-secondary">
                        You can now use biometrics for quick access and secure transactions.
                      </p>
                    </div>
                    <div className="bg-bg-secondary/50 rounded-2xl p-4 flex items-center gap-3 text-left">
                      <ShieldCheck className="text-accent-primary shrink-0" size={24} />
                      <span className="text-xs text-text-secondary font-medium leading-tight">
                        Your biometric data is stored locally on your device and never leaves it.
                      </span>
                    </div>
                    <button
                      onClick={handleComplete}
                      className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-accent-primary/20 active:scale-[0.98] transition-all mt-4"
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
