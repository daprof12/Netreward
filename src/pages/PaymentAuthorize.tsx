import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Loader2, AlertCircle,
  ShoppingCart, ArrowRight, Fingerprint, ChevronLeft,
  ExternalLink, Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { useToastStore } from '@/stores/useToastStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import PinEntryModal from '@/components/ui/PinEntryModal';
import BiometricPromptModal from '@/components/ui/BiometricPromptModal';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── Types ────────────────────────────────────────────────────────────────────

interface PaySession {
  id: string;
  merchantId: string;
  merchantName: string;
  amountNrt: number;
  description: string;
  status: string;
  expiresAt: string;
  successUrl?: string;
  cancelUrl?: string;
}

type FlowStep =
  | 'loading'      // fetching session from DB
  | 'login_required' // user not signed in
  | 'review'       // show payment details, await confirmation
  | 'authenticating' // calling RPC
  | 'success'
  | 'failed'
  | 'expired'
  | 'not_found';

// ── Component ────────────────────────────────────────────────────────────────

export default function PaymentAuthorize() {
  usePageTitle('Confirm Payment');

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionId = searchParams.get('session');
  const returnTo = searchParams.get('return'); // optional SP return URL override

  const { user } = useAuthStore();
  const { balanceNRT, fetchBalance } = useWalletStore();
  const { biometricsEnabled, isBiometricSetup, pin } = useSecurityStore();
  const { showToast } = useToastStore();
  const { convertNrt } = useCurrencyStore();

  const [step, setStep] = useState<FlowStep>('loading');
  const [session, setSession] = useState<PaySession | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);

  // ── Load session ────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) {
      setStep('not_found');
      return;
    }

    if (!user) {
      // store the intended URL so Auth can redirect back
      sessionStorage.setItem('nrt_pay_redirect', window.location.href);
      setStep('login_required');
      return;
    }

    loadSession();
  }, [sessionId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSession = async () => {
    setStep('loading');
    try {
      const { data, error } = await supabase
        .from('scan2pay_sessions')
        .select('id, merchant_id, amount_nrt, description, status, expires_at, success_url, cancel_url')
        .eq('id', sessionId!)
        .single();

      if (error || !data) { setStep('not_found'); return; }

      if (data.status !== 'pending') {
        setStep(data.status === 'expired' ? 'expired' : 'not_found');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStep('expired');
        return;
      }

      // Fetch merchant name
      const { data: profile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', data.merchant_id)
        .single();

      setSession({
        id: data.id,
        merchantId: data.merchant_id,
        merchantName: profile?.display_name || 'Merchant',
        amountNrt: data.amount_nrt,
        description: data.description,
        status: data.status,
        expiresAt: data.expires_at,
        successUrl: returnTo || data.success_url || undefined,
        cancelUrl: data.cancel_url || undefined,
      });
      setStep('review');
    } catch {
      setStep('not_found');
    }
  };

  // ── Payment flow ────────────────────────────────────────────────

  const handlePay = () => {
    if (!session) return;

    if (balanceNRT < session.amountNrt) {
      setErrorMsg('Insufficient NRT balance. Please top up your wallet first.');
      setStep('failed');
      return;
    }

    if (biometricsEnabled && isBiometricSetup) {
      setShowBiometric(true);
    } else if (pin) {
      setShowPin(true);
    } else {
      executePayment();
    }
  };

  const executePayment = async () => {
    if (!session || !user) return;
    setStep('authenticating');

    try {
      const { data, error } = await supabase.rpc('process_scan2pay', {
        p_session_id: session.id,
        p_payer_id: user.id,
      });

      if (error) throw error;
      if (data?.status === 'error') throw new Error(data.message);

      await fetchBalance(user.id);
      setStep('success');
      showToast('Payment confirmed!', 'success');

      // Redirect back to SP after 3 seconds if a return URL was provided
      if (session.successUrl) {
        setTimeout(() => {
          window.location.href = session.successUrl!;
        }, 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transaction failed. Please try again.');
      setStep('failed');
    }
  };

  const handleCancel = () => {
    if (session?.cancelUrl) {
      window.location.href = session.cancelUrl;
    } else {
      navigate(-1);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────

  const fiat = session ? convertNrt(session.amountNrt) : null;
  const insufficientBalance = session ? balanceNRT < session.amountNrt : false;

  // Minutes until expiry
  const minutesLeft = session
    ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 60000))
    : 0;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
      {/* Centered card, max width for desktop */}
      <div className="w-full max-w-sm">

        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/nrt-logo.svg" alt="NetReward" className="w-8 h-8 rounded-lg" />
          <span className="font-black text-lg text-text-primary">NetReward</span>
          <span className="text-[10px] font-bold bg-accent-primary/10 text-accent-primary px-2 py-0.5 rounded-full ml-1">
            Secure Pay
          </span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Loading ── */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16"
            >
              <Loader2 size={40} className="animate-spin text-accent-primary" />
              <p className="text-text-secondary text-sm">Loading payment details…</p>
            </motion.div>
          )}

          {/* ── Login required ── */}
          {step === 'login_required' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl border border-glass-border p-6 text-center space-y-5"
            >
              <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Shield size={32} className="text-accent-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Sign in Required</h2>
                <p className="text-sm text-text-secondary">
                  Log in to your NetReward account to complete this payment.
                </p>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2"
              >
                Sign In <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* ── Payment review ── */}
          {step === 'review' && session && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Payment card */}
              <div className="glass rounded-3xl border border-glass-border p-6 space-y-5 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 opacity-5 pointer-events-none -mt-2 -mr-2">
                  <ShoppingCart size={120} />
                </div>

                {/* Merchant */}
                <div className="text-center relative z-10">
                  <div className="w-14 h-14 bg-accent-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-accent-primary/20">
                    <ShoppingCart size={24} className="text-accent-primary" />
                  </div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-0.5">
                    Payment to
                  </p>
                  <h2 className="text-xl font-bold">{session.merchantName}</h2>
                  <p className="text-sm text-text-secondary mt-0.5">{session.description}</p>
                </div>

                {/* Amount */}
                <div className="bg-bg-secondary rounded-2xl p-4 border border-glass-border space-y-3 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Amount Due</span>
                    <div className="text-right">
                      <p className="text-2xl font-black text-text-primary">
                        {session.amountNrt.toFixed(4)} NRT
                      </p>
                      {fiat && (
                        <p className="text-xs text-text-secondary">≈ {fiat.symbol}{fiat.amount}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-glass-border pt-3 flex justify-between items-center">
                    <span className="text-xs text-text-secondary">Your Balance</span>
                    <span className={`text-sm font-bold ${insufficientBalance ? 'text-red-400' : 'text-emerald-400'}`}>
                      {balanceNRT.toFixed(4)} NRT
                    </span>
                  </div>
                </div>

                {/* Expiry */}
                <div className="flex items-center justify-center gap-1.5 relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-[10px] text-text-secondary font-medium">
                    This request expires in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Insufficient balance warning */}
                {insufficientBalance && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 relative z-10">
                    <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">
                      Insufficient NRT balance. Please top up your wallet before completing this payment.
                    </p>
                  </div>
                )}
              </div>

              {/* Security badge */}
              <div className="flex items-center justify-center gap-2 text-text-secondary">
                <Shield size={12} className="text-accent-primary" />
                <p className="text-[10px]">256-bit encrypted · Powered by NetReward</p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  id="pay-authorize-btn"
                  onClick={handlePay}
                  disabled={insufficientBalance}
                  className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {biometricsEnabled && isBiometricSetup ? (
                    <>Confirm with Biometrics <Fingerprint size={18} /></>
                  ) : pin ? (
                    <>Confirm with PIN <ArrowRight size={18} /></>
                  ) : (
                    <>Authorize Payment <ArrowRight size={18} /></>
                  )}
                </button>

                {biometricsEnabled && isBiometricSetup && pin && (
                  <button
                    onClick={() => setShowPin(true)}
                    className="w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-2xl border border-glass-border"
                  >
                    Use PIN Instead
                  </button>
                )}

                <button
                  id="pay-cancel-btn"
                  onClick={handleCancel}
                  className="w-full py-3 text-sm text-text-secondary font-medium"
                >
                  Cancel & Go Back
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Authenticating ── */}
          {step === 'authenticating' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 py-16 text-center"
            >
              <div className="relative w-24 h-24">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  className="absolute inset-0 rounded-full bg-accent-primary/20"
                />
                <div className="absolute inset-0 flex items-center justify-center text-accent-primary">
                  {biometricsEnabled && isBiometricSetup
                    ? <Fingerprint size={48} className="animate-pulse" />
                    : <Loader2 size={48} className="animate-spin opacity-60" />}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Processing</h2>
                <p className="text-text-secondary text-sm">Authorizing your transaction…</p>
              </div>
            </motion.div>
          )}

          {/* ── Success ── */}
          {step === 'success' && session && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/30"
              >
                <CheckCircle2 size={56} className="text-emerald-400" />
              </motion.div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold">Payment Sent!</h2>
                <p className="text-text-secondary text-sm">
                  You paid <span className="font-bold text-text-primary">{session.amountNrt.toFixed(4)} NRT</span>{' '}
                  to {session.merchantName}
                </p>
              </div>

              {session.successUrl ? (
                <div className="space-y-2 w-full">
                  <p className="text-xs text-text-secondary">Redirecting you back…</p>
                  <div className="w-full bg-bg-secondary rounded-full h-1 overflow-hidden">
                    <motion.div
                      className="h-full bg-accent-primary"
                      initial={{ width: 0 }} animate={{ width: '100%' }}
                      transition={{ duration: 3, ease: 'linear' }}
                    />
                  </div>
                  <button
                    onClick={() => { window.location.href = session.successUrl!; }}
                    className="w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border flex items-center justify-center gap-2"
                  >
                    Return Now <ExternalLink size={14} />
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-3">
                  <button
                    onClick={() => navigate('/transactions')}
                    className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border"
                  >
                    View Receipt
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20"
                  >
                    Back to Home
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Failed ── */}
          {step === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-5 py-12 text-center"
            >
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border-4 border-red-500/20">
                <XCircle size={50} className="text-red-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold">Payment Failed</h2>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                  {errorMsg || 'Something went wrong. Please try again.'}
                </p>
              </div>
              <div className="w-full space-y-3">
                <button
                  onClick={loadSession}
                  className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20"
                >
                  Try Again
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Expired ── */}
          {step === 'expired' && (
            <motion.div
              key="expired"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl border border-amber-500/20 p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Link Expired</h2>
                <p className="text-sm text-text-secondary">
                  This payment request has expired. Ask the merchant to generate a new one.
                </p>
              </div>
              <button onClick={handleCancel} className="w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border">
                Go Back
              </button>
            </motion.div>
          )}

          {/* ── Not found ── */}
          {step === 'not_found' && (
            <motion.div
              key="notfound"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl border border-glass-border p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle size={32} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Payment Not Found</h2>
                <p className="text-sm text-text-secondary">
                  This payment link is invalid, already completed, or no longer exists.
                </p>
              </div>
              <button onClick={() => navigate('/')} className="w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border">
                Go to Wallet
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* PIN + Biometric modals */}
      <PinEntryModal
        isOpen={showPin}
        onClose={() => setShowPin(false)}
        onSuccess={() => { setShowPin(false); executePayment(); }}
        title="Confirm Payment"
        description="Enter your PIN to authorize this transaction"
        expectedPin={pin}
      />
      <BiometricPromptModal
        isOpen={showBiometric}
        onClose={() => setShowBiometric(false)}
        onSuccess={() => { setShowBiometric(false); executePayment(); }}
        title="Confirm Payment"
        description="Verify to approve this transaction"
      />
    </div>
  );
}
