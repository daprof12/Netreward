import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Delete, CheckCircle2, Shield } from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

export default function PinSetupPage() {
  const navigate = useNavigate();
  const { setPin, pin: currentPin } = useSecurityStore();
  const [pin, setPinState] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm' | 'success'>('enter');
  const [error, setError] = useState('');

  const handleNumber = (num: string) => {
    setError('');
    if (step === 'enter') {
      if (pin.length < 4) {
        const newPin = pin + num;
        setPinState(newPin);
        if (newPin.length === 4) {
          setTimeout(() => setStep('confirm'), 300);
        }
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + num;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 4) {
          if (newConfirm === pin) {
            setStep('success');
            setPin(newConfirm);
          } else {
            setError('PINs do not match. Try again.');
            setTimeout(() => {
              setConfirmPin('');
              setStep('enter');
              setPinState('');
            }, 1000);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'enter') {
      setPinState(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-bg-primary flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="p-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{currentPin ? 'Change PIN' : 'Set PIN'}</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
        <AnimatePresence mode="wait">
          {step !== 'success' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full flex flex-col items-center space-y-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Shield size={32} />
              </div>
              
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                  {step === 'enter' ? 'Create a 4-Digit PIN' : 'Confirm your PIN'}
                </h2>
                <p className="text-sm text-text-secondary">
                  {step === 'enter' 
                    ? 'Enter a PIN to secure your transactions and login.' 
                    : 'Please re-enter your PIN to confirm.'}
                </p>
              </div>

              {/* PIN Dots */}
              <div className="flex gap-4">
                {[1, 2, 3, 4].map((i) => {
                  const val = step === 'enter' ? pin : confirmPin;
                  const isActive = val.length >= i;
                  return (
                    <motion.div
                      key={i}
                      animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                        isActive 
                          ? 'bg-accent-primary border-accent-primary shadow-[0_0_10px_var(--accent-primary)]' 
                          : 'border-glass-border'
                      }`}
                    />
                  );
                })}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm font-medium"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border-4 border-green-500/20">
                <CheckCircle2 size={40} />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">PIN Set Successfully!</h2>
                <p className="text-sm text-text-secondary mt-2">
                  Your PIN is now active and will be required for secure actions.
                </p>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-accent-primary/20 active:scale-[0.98] transition-all mt-4 px-12"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 'success' && (
          <div className="grid grid-cols-3 gap-8 w-full max-w-[280px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((btn, i) => {
              if (btn === '') return <div key={i} />;
              if (btn === 'delete') {
                return (
                  <button
                    key={i}
                    onClick={handleDelete}
                    className="w-16 h-16 flex items-center justify-center text-text-secondary hover:text-text-primary active:scale-90 transition-all"
                  >
                    <Delete size={24} />
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => handleNumber(btn)}
                  className="w-16 h-16 flex items-center justify-center text-2xl font-bold rounded-full hover:bg-bg-secondary active:scale-90 transition-all border border-transparent hover:border-glass-border"
                >
                  {btn}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
