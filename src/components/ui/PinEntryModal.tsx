import { motion, AnimatePresence } from 'framer-motion';
import { Delete, X, Shield, Loader2, AlertCircle, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PinEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  title?: string;
  description?: string;
  expectedPin?: string | null;
}

export default function PinEntryModal({ isOpen, onClose, onSuccess, title = 'Enter PIN', description = 'Enter your 4-digit security PIN', expectedPin }: PinEntryModalProps) {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (lockedUntil) {
      setIsLocked(true);
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockedUntil(null);
          setAttempts(0);
          setIsLocked(false);
          clearInterval(interval);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockedUntil]);

  const handleNumber = (num: string) => {
    if (isLocked || isLoading) return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        setIsLoading(true);
        setTimeout(() => {
          setIsLoading(false);
          if (expectedPin && newPin !== expectedPin) {
            setError(true);
            setPin('');
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= 3) {
              setLockedUntil(Date.now() + 60000); // Lock for 60 seconds
            }
          } else {
            onSuccess(newPin);
            setPin('');
            setAttempts(0);
            setError(false);
          }
        }, 800);
      }
    }
  };

  const handleDelete = () => {
    if (isLocked || isLoading) return;
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const shakeAnimation = {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 }
  };

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
                >
                  <X size={20} />
                </button>
              </div>

              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${error ? 'bg-red-500/10 text-red-500' : isLocked ? 'bg-orange-500/10 text-orange-500' : 'bg-accent-primary/10 text-accent-primary'}`}>
                {isLocked ? <Lock size={32} /> : error ? <AlertCircle size={32} /> : <Shield size={32} />}
              </div>

              <h2 className="text-xl font-bold text-text-primary mb-2">
                {isLocked ? 'Too Many Attempts' : title}
              </h2>
              
              <p className={`text-sm mb-8 ${error || isLocked ? 'text-red-500 font-medium' : 'text-text-secondary'}`}>
                {isLocked 
                  ? `Try again in ${timeLeft}s` 
                  : error 
                    ? `Incorrect PIN. ${3 - attempts} attempts left.` 
                    : description}
              </p>

              {/* PIN Dots */}
              <motion.div 
                className="flex gap-4 mb-12"
                animate={error ? shakeAnimation : {}}
              >
                {[1, 2, 3, 4].map((i) => {
                  const isActive = pin.length >= i;
                  return (
                    <motion.div
                      key={i}
                      animate={isActive && !error ? { scale: [1, 1.2, 1] } : {}}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                        error
                          ? 'bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                          : isActive 
                            ? 'bg-accent-primary border-accent-primary shadow-[0_0_10px_var(--accent-primary)]' 
                            : 'border-glass-border'
                      }`}
                    />
                  );
                })}
              </motion.div>

              {isLoading ? (
                <div className="h-[280px] flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-accent-primary" />
                  <p className="text-sm text-text-secondary">Verifying PIN...</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-x-12 gap-y-6 w-full max-w-[240px] opacity-100 transition-opacity">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((btn, i) => {
                    if (btn === '') return <div key={i} />;
                    if (btn === 'delete') {
                      return (
                        <button
                          key={i}
                          onClick={handleDelete}
                          disabled={isLocked}
                          className="w-12 h-12 flex items-center justify-center text-text-secondary hover:text-text-primary active:scale-90 transition-all disabled:opacity-30"
                        >
                          <Delete size={24} />
                        </button>
                      );
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleNumber(btn)}
                        disabled={isLocked}
                        className="w-12 h-12 flex items-center justify-center text-xl font-bold rounded-full hover:bg-bg-secondary active:scale-90 transition-all disabled:opacity-30"
                      >
                        {btn}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
