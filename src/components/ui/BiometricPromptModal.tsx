import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, X, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BiometricPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function BiometricPromptModal({ isOpen, onClose, onSuccess, title = 'Authentication Required', description = 'Verify your biometric identity to proceed' }: BiometricPromptModalProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success'>('idle');

  useEffect(() => {
    if (isOpen) {
      setStatus('scanning');
      // Simulate biometric scan
      const timer = setTimeout(() => {
        setStatus('success');
        setTimeout(() => {
          onSuccess();
          setStatus('idle');
        }, 1000); // Wait 1s after success before closing
      }, 2000); // 2s scan time

      return () => clearTimeout(timer);
    } else {
      setStatus('idle');
    }
  }, [isOpen, onSuccess]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-sm glass bg-bg-primary rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-glass-border overflow-hidden shadow-2xl"
          >
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-full flex justify-end mb-2">
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-glass-bg rounded-full transition-colors text-text-secondary"
                  disabled={status === 'success'}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative mb-8 mt-4">
                {/* Scanner line effect */}
                {status === 'scanning' && (
                  <motion.div
                    animate={{ y: [0, 64, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-0 left-[-10px] right-[-10px] h-[2px] bg-accent-primary shadow-[0_0_8px_var(--accent-primary)] z-10"
                  />
                )}
                
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-500 ${status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-accent-primary/10 text-accent-primary'}`}>
                  <AnimatePresence mode="wait">
                    {status === 'success' ? (
                      <motion.div
                        key="success"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-green-500"
                      >
                        <CheckCircle2 size={40} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="fingerprint"
                        animate={status === 'scanning' ? { scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Fingerprint size={48} strokeWidth={1.5} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <h2 className="text-xl font-bold text-text-primary mb-2">
                {status === 'success' ? 'Verified!' : title}
              </h2>
              <p className={`text-sm mb-6 ${status === 'success' ? 'text-green-500' : 'text-text-secondary'}`}>
                {status === 'success' ? 'Identity confirmed' : description}
              </p>
              
              {status === 'scanning' && (
                <div className="w-full max-w-[200px] h-1 bg-bg-secondary rounded-full overflow-hidden mt-4">
                  <motion.div 
                    className="h-full bg-accent-primary"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'linear' }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
