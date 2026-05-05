import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, QrCode, ScanLine, CheckCircle2, ShoppingCart, 
  ArrowRight, Fingerprint, Loader2, AlertCircle, RefreshCw, XCircle
} from 'lucide-react';
import { useWalletStore } from '@/stores/useWalletStore';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { useSpStore, type CheckoutSession } from '@/stores/useSpStore';
import { useToastStore } from '@/stores/useToastStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';
import PinEntryModal from '@/components/ui/PinEntryModal';
import BiometricPromptModal from '@/components/ui/BiometricPromptModal';

type ScanStep = 'scanning' | 'decoding' | 'detected' | 'authenticating' | 'success' | 'failed' | 'timeout';

export default function ScanToPay() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { nrtBalance, fiatValue, fetchBalance } = useWalletStore();
  const { biometricsEnabled, isBiometricSetup, pin } = useSecurityStore();
  const { checkoutSessions } = useSpStore();
  const { showToast } = useToastStore();
  
  const [step, setStep] = useState<ScanStep>('scanning');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [detectedSession, setDetectedSession] = useState<CheckoutSession | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Mock scan detection: Check for active sessions in SpStore
  useEffect(() => {
    if (step === 'scanning') {
      const timer = setTimeout(() => {
        // Try to find an active session from the store (simulating QR decode)
        const activeSession = checkoutSessions.find(s => s.status === 'pending');
        
        if (activeSession) {
          setStep('decoding');
          setTimeout(() => {
            setDetectedSession(activeSession);
            setStep('detected');
          }, 1500);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step, checkoutSessions]);

  const handlePay = () => {
    if (!detectedSession) return;
    
    // Check balance
    if (nrtBalance < detectedSession.amountNrt) {
      setErrorMsg('Insufficient NRT balance to complete this transaction.');
      setStep('failed');
      return;
    }

    if (biometricsEnabled && isBiometricSetup) {
      setShowBiometricModal(true);
    } else if (pin) {
      setShowPinModal(true);
    } else {
      completePayment();
    }
  };

  const completePayment = async () => {
    if (!detectedSession || !user) return;
    setStep('authenticating');
    
    try {
      const { data, error } = await supabase.rpc('process_scan2pay', {
        p_session_id: detectedSession.id,
        p_payer_id: user.id
      });

      if (error) throw error;

      // Success
      await fetchBalance(user.id); // Refresh wallet
      setStep('success');
      showToast('Payment confirmed!', 'success');
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMsg(err.message || 'Transaction failed. Please try again.');
      setStep('failed');
    }
  };

  const handlePinSuccess = (enteredPin: string) => {
    setShowPinModal(false);
    completePayment();
  };

  const amountUsd = detectedSession ? (detectedSession.amountNrt * fiatValue).toFixed(2) : '0.00';

  return (
    <motion.div
      className="min-h-screen bg-bg-primary flex flex-col pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full z-10">
          <ChevronLeft size={20} className="text-text-primary" />
        </button>
        <h1 className="text-lg font-bold">Scan2Pay</h1>
        <div className="w-10"></div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Scan QR Code</h2>
              <p className="text-sm text-text-secondary max-w-[250px] mx-auto">
                Align the QR code within the frame to checkout instantly.
              </p>
            </div>

            <div className="relative w-64 h-64 mx-auto">
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-accent-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-accent-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-accent-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-accent-primary rounded-br-xl" />

              <div className="absolute inset-0 bg-accent-primary/5 rounded-xl overflow-hidden flex items-center justify-center">
                <QrCode size={100} className="text-accent-primary/20" />
                <motion.div
                  className="absolute top-0 left-0 w-full h-1 bg-accent-primary shadow-[0_0_15px_var(--accent-primary)]"
                  animate={{ y: [0, 250, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-accent-primary font-medium bg-accent-primary/10 px-4 py-2 rounded-full">
              <ScanLine size={16} className="animate-pulse" />
              <span className="text-sm">Scanning...</span>
            </div>
          </motion.div>
        )}

        {step === 'decoding' && (
          <motion.div
            key="decoding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 space-y-4"
          >
            <div className="relative">
              <Loader2 size={48} className="text-accent-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <QrCode size={20} className="text-accent-primary" />
              </div>
            </div>
            <p className="font-bold">Decoding QR Data...</p>
          </motion.div>
        )}

        {step === 'detected' && detectedSession && (
          <motion.div
            key="detected"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="flex-1 flex flex-col p-6"
          >
            <div className="flex-1"></div>
            
            <div className="glass p-6 rounded-3xl border border-glass-border space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none -mt-4 -mr-4">
                <ShoppingCart size={150} />
              </div>

              <div className="relative z-10 text-center space-y-1">
                <div className="w-14 h-14 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart size={24} className="text-accent-primary" />
                </div>
                <h2 className="text-xl font-bold">{detectedSession.description}</h2>
                <p className="text-sm text-text-secondary">Service Provider: {detectedSession.merchantName}</p>
              </div>

              <div className="relative z-10 bg-bg-secondary p-4 rounded-xl border border-glass-border space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-sm text-text-secondary">Amount Due</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-text-primary">{detectedSession.amountNrt.toFixed(2)} NRT</span>
                    <p className="text-xs text-text-secondary">~${amountUsd} USD</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePay}
                  className="relative z-10 w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {biometricsEnabled && isBiometricSetup ? (
                    <>
                      Confirm with Biometrics <Fingerprint size={18} />
                    </>
                  ) : pin ? (
                    <>
                      Confirm with PIN <ArrowRight size={18} />
                    </>
                  ) : (
                    <>
                      Confirm Payment <ArrowRight size={18} />
                    </>
                  )}
                </button>
                
                {biometricsEnabled && isBiometricSetup && pin && (
                  <button
                    onClick={() => setShowPinModal(true)}
                    className="relative z-10 w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border flex items-center justify-center gap-2 hover:bg-glass-bg transition-colors"
                  >
                    Use PIN Instead
                  </button>
                )}
              </div>
              
              <button
                onClick={() => {
                  setStep('scanning');
                  setDetectedSession(null);
                }}
                className="relative z-10 w-full py-2 text-sm text-text-secondary font-medium"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {step === 'authenticating' && (
          <motion.div
            key="authenticating"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8"
          >
            <div className="relative w-32 h-32">
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-accent-primary/20"
              />
              <div className="absolute inset-0 flex items-center justify-center text-accent-primary">
                {biometricsEnabled && isBiometricSetup ? <Fingerprint size={64} className="animate-pulse" /> : <Loader2 size={64} className="animate-spin opacity-50" />}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{biometricsEnabled && isBiometricSetup ? 'Authenticating' : 'Processing'}</h2>
              <p className="text-text-secondary">{biometricsEnabled && isBiometricSetup ? 'Verifying your biometric identity...' : 'Confirming transaction on-chain...'}</p>
            </div>
            <Loader2 className="w-8 h-8 animate-spin text-accent-primary opacity-50" />
          </motion.div>
        )}

        {step === 'success' && detectedSession && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/20">
              <CheckCircle2 size={50} className="text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Payment Successful!</h2>
              <p className="text-sm text-text-secondary">
                You paid <span className="font-bold text-text-primary">{detectedSession.amountNrt.toFixed(2)} NRT</span> to {detectedSession.merchantName}.
              </p>
            </div>
            <div className="w-full pt-8 space-y-3">
              <button
                onClick={() => navigate('/transactions')}
                className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border shadow-sm hover:bg-glass-bg transition-colors"
              >
                View Receipt
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 active:scale-[0.98] transition-all"
              >
                Back to Home
              </button>
            </div>
          </motion.div>
        )}

        {step === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6"
          >
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border-4 border-red-500/20">
              <XCircle size={50} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Payment Failed</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {errorMsg || 'We encountered an error while processing your payment. Please try again.'}
              </p>
            </div>
            <div className="w-full pt-8 space-y-3">
              <button
                onClick={() => setStep('scanning')}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Try Again
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PinEntryModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
        title="Payment Confirmation"
        description="Enter your PIN to confirm this payment"
        expectedPin={pin}
      />

      <BiometricPromptModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        onSuccess={() => {
          setShowBiometricModal(false);
          completePayment();
        }}
        title="Confirm Payment"
        description="Verify to approve this transaction"
      />
    </motion.div>
  );
}
