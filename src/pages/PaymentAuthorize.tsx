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

      // Fetch merchant name from SP or ISP profiles for better display
      const { data: spProfile } = await supabase
        .from('sp_profiles')
        .select('company_name')
        .eq('user_id', data.merchant_id)
        .maybeSingle();

      const { data: ispProfile } = await supabase
        .from('isp_profiles')
        .select('isp_name')
        .eq('user_id', data.merchant_id)
        .maybeSingle();

      const { data: userProfile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', data.merchant_id)
        .single();

      const merchantName = spProfile?.company_name || ispProfile?.isp_name || userProfile?.display_name || 'Merchant';

      setSession({
        id: data.id,
        merchantId: data.merchant_id,
        merchantName,
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
    <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-between p-6">
      <div className="w-full max-w-sm flex-1 flex flex-col justify-center">
        
        {/* ── Brand Header ── */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-10 h-10 bg-[#1ed760] rounded-xl flex items-center justify-center shadow-lg shadow-[#1ed760]/20">
            <img src="/nrt-logo.svg" alt="NRT" className="w-6 h-6 brightness-0" />
          </div>
          <span className="font-black text-xl text-white tracking-tight">NetReward</span>
          <div className="px-3 py-1 bg-[#1ed760]/10 border border-[#1ed760]/20 rounded-full">
            <span className="text-[10px] font-black text-[#1ed760] uppercase tracking-wider">Secure Pay</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Loading State ── */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16"
            >
              <Loader2 size={32} className="animate-spin text-[#1ed760]" />
              <p className="text-gray-500 text-sm font-medium">Fetching secure payment details…</p>
            </motion.div>
          )}

          {(step === 'expired' || step === 'not_found') && (
            <motion.div
              key="error-generic"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#14171c] rounded-[40px] border border-white/5 p-10 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                <AlertCircle size={40} className="text-amber-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">
                  {step === 'expired' ? 'Link Expired' : 'Not Found'}
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {step === 'expired' 
                    ? 'This payment request has expired. Please ask the merchant to generate a new link.'
                    : 'This payment link is invalid or has already been processed.'}
                </p>
              </div>
              <button onClick={() => navigate('/')} className="w-full py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/5">
                Go Back Home
              </button>
            </motion.div>
          )}

          {/* ── Login Required ── */}
          {step === 'login_required' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#14171c] rounded-[32px] border border-white/5 p-8 text-center space-y-6 shadow-2xl"
            >
              <div className="w-20 h-20 bg-[#1ed760]/10 rounded-full flex items-center justify-center mx-auto border border-[#1ed760]/20">
                <Shield size={40} className="text-[#1ed760]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Sign In Required</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Please log in to your NetReward account to securely authorize this transaction.
                </p>
              </div>
              <button
                onClick={() => navigate('/auth')}
                className="w-full py-4 bg-[#1ed760] text-black font-black rounded-2xl shadow-xl shadow-[#1ed760]/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-wider"
              >
                Continue to Login <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {/* ── Payment Review ── */}
          {step === 'review' && session && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="bg-[#14171c] rounded-[40px] border border-white/5 p-8 space-y-8 relative overflow-hidden shadow-2xl">
                {/* Decorative background cart icon */}
                <ShoppingCart size={180} className="absolute -top-10 -right-10 text-white/5 pointer-events-none rotate-12" />

                {/* Merchant Header */}
                <div className="text-center relative z-10 space-y-4">
                  <div className="w-20 h-20 bg-[#1ed760]/10 rounded-[24px] flex items-center justify-center mx-auto border border-[#1ed760]/10 shadow-inner">
                    <ShoppingCart size={32} className="text-[#1ed760]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-500 uppercase tracking-[0.2em] font-black">Payment To</p>
                    <h2 className="text-3xl font-black text-white tracking-tight">{session.merchantName}</h2>
                    <p className="text-sm text-gray-400 font-medium">{session.description}</p>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="bg-black/40 rounded-[32px] p-6 border border-white/5 space-y-6 relative z-10 backdrop-blur-xl">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Amount</p>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Due</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-4xl font-black text-white tabular-nums">
                        {session.amountNrt.toFixed(4)}
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xl font-bold text-gray-400">NRT</span>
                        {fiat && (
                          <span className="text-xs text-gray-500 font-medium">≈ {fiat.symbol}{fiat.amount}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/5 w-full" />

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Your Balance</span>
                    <span className={`text-lg font-black tabular-nums ${insufficientBalance ? 'text-red-500' : 'text-[#1ed760]'}`}>
                      {balanceNRT.toFixed(4)} NRT
                    </span>
                  </div>
                </div>

                {/* Countdown */}
                <div className="flex items-center justify-center gap-2 relative z-10">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <p className="text-[11px] text-gray-400 font-black uppercase tracking-wider">
                    This request expires in {minutesLeft} minutes
                  </p>
                </div>

                {/* Status Message */}
                {insufficientBalance && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-[20px] p-4 relative z-10"
                  >
                    <AlertCircle size={20} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-500 leading-relaxed font-medium">
                      Insufficient NRT balance. Please top up your wallet before completing this payment.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Security Footer inside review area */}
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Shield size={16} className="text-[#1ed760]/40" />
                <p className="text-[11px] font-bold uppercase tracking-widest">256-bit encrypted · Powered by NetReward</p>
              </div>

              {/* Action Button */}
              <button
                id="pay-authorize-btn"
                onClick={handlePay}
                disabled={insufficientBalance}
                className="w-full py-5 bg-[#0e4d35] text-[#1ed760] font-black rounded-[24px] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group border border-[#1ed760]/20"
              >
                <span className="text-lg uppercase tracking-widest">Authorize Payment</span>
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                id="pay-cancel-btn"
                onClick={handleCancel}
                className="w-full py-2 text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] hover:text-white transition-colors"
              >
                Cancel Transaction
              </button>
            </motion.div>
          )}

          {/* ── Steps: Authenticating, Success, Failed, Expired, Not Found ── */}
          
          {step === 'authenticating' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-8 py-16 text-center"
            >
              <div className="relative w-32 h-32">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full bg-[#1ed760]/20"
                />
                <div className="absolute inset-0 flex items-center justify-center text-[#1ed760]">
                  {biometricsEnabled && isBiometricSetup
                    ? <Fingerprint size={64} className="animate-pulse" />
                    : <Loader2 size={64} className="animate-spin opacity-40" />}
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Processing</h2>
                <p className="text-gray-500 text-sm font-medium">Verifying and authorizing transaction…</p>
              </div>
            </motion.div>
          )}

          {step === 'success' && session && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[#14171c] rounded-[40px] border border-[#1ed760]/20 p-10 text-center space-y-8 shadow-2xl"
            >
              <div className="w-24 h-24 bg-[#1ed760]/10 rounded-full flex items-center justify-center mx-auto border-2 border-[#1ed760]/20 shadow-lg shadow-[#1ed760]/5">
                <CheckCircle2 size={48} className="text-[#1ed760]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white">Payment Sent!</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Authorized <span className="text-[#1ed760] font-bold">{session.amountNrt.toFixed(4)} NRT</span> to <br />
                  <span className="text-white font-black">{session.merchantName}</span>
                </p>
              </div>

              {session.successUrl ? (
                <div className="space-y-4 w-full">
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Redirecting safely…</p>
                  <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <motion.div
                      className="h-full bg-[#1ed760]"
                      initial={{ width: 0 }} animate={{ width: '100%' }}
                      transition={{ duration: 3, ease: 'linear' }}
                    />
                  </div>
                  <button
                    onClick={() => { window.location.href = session.successUrl!; }}
                    className="w-full py-4 bg-[#1ed760] text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    Return to Merchant <ExternalLink size={18} />
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-3">
                  <button
                    onClick={() => navigate('/transactions')}
                    className="w-full py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    View Receipt
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full py-4 bg-[#1ed760] text-black font-black rounded-2xl shadow-xl shadow-[#1ed760]/20"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[#14171c] rounded-[40px] border border-red-500/20 p-10 text-center space-y-8 shadow-2xl"
            >
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/20">
                <XCircle size={48} className="text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white">Payment Failed</h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {errorMsg || 'The transaction could not be completed at this time.'}
                </p>
              </div>
              <div className="w-full space-y-3">
                <button
                  onClick={loadSession}
                  className="w-full py-4 bg-[#1ed760] text-black font-black rounded-2xl"
                >
                  Retry Payment
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/5"
                >
                  Cancel
                </button>
              </div>
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
