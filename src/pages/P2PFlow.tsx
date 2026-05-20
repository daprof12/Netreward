import { useState, useEffect, useRef } from 'react'; 
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ChevronLeft, X, CheckCircle2, AlertTriangle, MessageCircle,
  Upload, Camera, Flag, Clock, Loader2, Check,
  ArrowRight, ShieldAlert, CreditCard, Plus, ShieldAlert as DisputeIcon
} from 'lucide-react';
import { useDisputes } from '@/hooks/useDisputes';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { useToastStore } from '@/stores/useToastStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useP2PStore } from '@/stores/useP2PStore';
import { useSystemStore } from '@/stores/useSystemStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

type P2PStep =
  | 'onboarding'
  | 'choose-asset'
  | 'enter-amount'
  | 'waiting-acceptance'
  | 'declined'
  | 'pay-seller'
  | 'upload-proof'
  | 'waiting-payment'
  | 'awaiting-release'
  | 'success'
  | 'cancelled';

// Removed hardcoded NRT_PRICE_USD
const LOCAL_CURRENCY = 'USD';
const PAYMENT_METHODS = ['Bank Transfer', 'Mobile Money', 'USDC'];

function useCountdown(seconds: number, active: boolean, startTime?: string | null) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (!active) { setRemaining(seconds); return; }
    
    // Set initial remaining based on elapsed time if startTime is provided
    if (startTime) {
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      setRemaining(Math.max(0, seconds - elapsed));
    }

    const t = setInterval(() => {
      setRemaining(r => {
        if (startTime) {
          const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
          return Math.max(0, seconds - elapsed);
        }
        return Math.max(0, r - 1);
      });
    }, 1000);
    return () => clearInterval(t);
  }, [active, seconds, startTime]);
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  return { mins, secs, remaining };
}

export default function P2PFlow() {
  usePageTitle('P2P Trade');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuthStore();
  const { fetchBalance } = useWalletStore();

  const { showToast } = useToastStore();
  const { paymentAccounts } = useP2PStore();
  const { settings: systemSettings } = useSystemStore();

  const { orderId: urlOrderId } = useParams<{ orderId: string }>();
  const [loadedOffer, setLoadedOffer] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(!!urlOrderId);
  const [orderUpdatedAt, setOrderUpdatedAt] = useState<string | null>(null);
  const [loadedFiat, setLoadedFiat] = useState<number | null>(null);
  const [loadedNrt, setLoadedNrt] = useState<number | null>(null);
  const [loadedPaymentMethod, setLoadedPaymentMethod] = useState<string | null>(null);

  const selectedOffer = location.state?.offer || loadedOffer;
  const isSelling = selectedOffer?.type === 'buy'; 

  const [step, setStep] = useState<P2PStep>(selectedOffer ? 'enter-amount' : 'onboarding');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState(paymentAccounts[0]?.id || '');

  // Load existing order if accessed from notification link
  useEffect(() => {
    if (urlOrderId && user) {
      const loadOrder = async () => {
        const { data: order } = await supabase
          .from('p2p_orders')
          .select('*, p2p_offers(*, users(display_name))')
          .eq('id', urlOrderId)
          .single();
          
        if (order) {
           setCurrentOrderId(order.id);
           setLoadedNrt(order.nrt_amount);
           setLoadedFiat(order.fiat_amount);
           setLoadedPaymentMethod(order.payment_method);
           setOrderUpdatedAt(order.updated_at);
           
           const amISelling = user.id === order.seller_id;
           setAmount(amISelling ? order.nrt_amount.toString() : order.fiat_amount.toString());
           
           setLoadedOffer({
              ...order.p2p_offers,
              type: amISelling ? 'buy' : 'sell', 
              userName: order.p2p_offers?.users?.display_name || 'Trader',
              userId: amISelling ? order.buyer_id : order.seller_id,
              price: order.fiat_amount / order.nrt_amount
           });
           
           if (order.status === 'completed') setStep('success');
           else if (order.status === 'disputed') setStep('awaiting-release');
           else if (order.status === 'cancelled') setStep('cancelled');
           else if (amISelling && order.status === 'pending') setStep('pay-seller'); // Seller sees accept/decline
           else if (amISelling && (order.status === 'accepted' || order.status === 'paid')) setStep('waiting-payment');
           else if (!amISelling && (order.status === 'pending')) setStep('waiting-acceptance');
           else if (!amISelling && (order.status === 'accepted')) setStep('pay-seller');
           else if (!amISelling && (order.status === 'paid')) setStep('awaiting-release');
           else setStep('pay-seller');
        } else {
           showToast('Order not found', 'error');
           navigate('/wallet');
        }
        setIsLoadingOrder(false);
      };
      loadOrder();
    }
  }, [urlOrderId, user, navigate, showToast]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatReply, setChatReply] = useState('');
  const [messages, setMessages] = useState<{sender: string; text: string; time: string}[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('other');
  const [reportDescription, setReportDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  // Derive trade ID from the real DB order ID so both parties see the same one
  const tradeId = currentOrderId ? currentOrderId.slice(0, 8).toUpperCase() : '---';

  // Fetch seller's payment account if buying
  const [sellerAccount, setSellerAccount] = useState<any>(null);
  useEffect(() => {
    if (!isSelling && selectedOffer?.userId) {
      supabase.from('p2p_payment_methods')
        .select('*')
        .eq('user_id', selectedOffer.userId)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setSellerAccount(data);
        });
    }
  }, [isSelling, selectedOffer]);

  const fetchedPrice = useTokenPrice();
  const currentPrice = selectedOffer?.price || fetchedPrice;

  // If selling, 'amount' is NRT. If buying, 'amount' is USD.
  const nrtValue = isSelling ? parseFloat(amount || '0') : parseFloat(amount || '0') / currentPrice;
  const usdValue = isSelling ? parseFloat(amount || '0') * currentPrice : parseFloat(amount || '0');
  const nrtAmountDisplay = loadedNrt || nrtValue;
  const usdAmountDisplay = loadedFiat || usdValue;

  const { mins, secs, remaining } = useCountdown(15 * 60, step === 'pay-seller', orderUpdatedAt);
  const { mins: releaseMins, secs: releaseSecs, remaining: releaseRemaining } = useCountdown(15 * 60, step === 'awaiting-release' || step === 'waiting-payment', orderUpdatedAt);
  const { mins: acceptMins, secs: acceptSecs, remaining: acceptRemaining } = useCountdown(10 * 60, step === 'waiting-acceptance', orderUpdatedAt);

  const { acceptOrder, declineOrder, markOrderPaid } = useP2PStore();

  const playNotification = () => {
    if (systemSettings.soundEnabled) {
      console.log('🔊 Sound Notification triggered');
    }
    if (systemSettings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
      console.log('📳 Vibration Notification triggered');
    }
  };

  // Handle status changes from either realtime or polling
  const handleOrderStatusChange = (newStatus: string, updatedAt?: string) => {
    if (updatedAt) setOrderUpdatedAt(updatedAt);

    if (newStatus === 'accepted' && !isSelling && step === 'waiting-acceptance') {
      playNotification();
      setStep('pay-seller');
    } else if (newStatus === 'cancelled' && step !== 'cancelled') {
      setStep('cancelled');
    } else if (newStatus === 'paid' && isSelling && step !== 'waiting-payment') {
      playNotification();
      setStep('waiting-payment');
    } else if (newStatus === 'completed' && step !== 'success') {
      playNotification();
      setStep('success');
    } else if (newStatus === 'disputed' && step !== 'cancelled') {
      showToast('This trade has been escalated to the resolution center.', 'warning');
      setTimeout(() => navigate('/wallet/deposit/p2p/disputes'), 1500);
    }
  };

  // Real-time subscription to order status changes
  useEffect(() => {
    if (!currentOrderId) return;
    const channel = supabase
      .channel(`order:${currentOrderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'p2p_orders',
        filter: `id=eq.${currentOrderId}`,
      }, (payload) => {
        handleOrderStatusChange(payload.new.status, payload.new.updated_at);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentOrderId, isSelling, step, navigate, showToast]);

  // Polling fallback — checks every 5s in case realtime is delayed
  useEffect(() => {
    if (!currentOrderId) return;
    const waitingSteps: P2PStep[] = ['waiting-acceptance', 'pay-seller', 'waiting-payment', 'awaiting-release'];
    if (!waitingSteps.includes(step)) return;

    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('p2p_orders')
        .select('status, updated_at')
        .eq('id', currentOrderId)
        .single();
      if (data) handleOrderStatusChange(data.status, data.updated_at);
    }, 5000);

    return () => clearInterval(poll);
  }, [currentOrderId, step, isSelling]);

  const handleStartTrade = async () => {
    if (!selectedOffer || !user) return;
    setStep('waiting-acceptance');
    
    try {
      const { data: orderId, error } = await supabase.rpc('create_p2p_order', {
        p_offer_id: selectedOffer.id,
        p_buyer_id: isSelling ? selectedOffer.userId : user.id,
        p_nrt_amount: nrtValue,
        p_fiat_amount: usdValue,
        p_payment_method: paymentAccounts.find(a => a.id === paymentMethodId)?.provider || 'Bank Transfer'
      });

      if (error) throw error;
      
      setCurrentOrderId(orderId);
      // Immediately fetch the created order to get its created_at/updated_at timestamp for the timer
      const { data: newOrder } = await supabase.from('p2p_orders').select('updated_at').eq('id', orderId).single();
      if (newOrder) setOrderUpdatedAt(newOrder.updated_at);
      
    } catch (err: any) {
      console.error('Trade start error:', err);
      showToast(err.message || 'Failed to start trade', 'error');
      setStep('enter-amount');
    }
  };

  const handleAcceptOrder = async () => {
    if (!currentOrderId) return;
    try {
      await acceptOrder(currentOrderId);
      setStep('waiting-payment');
    } catch (err: any) {
      showToast(err.message || 'Failed to accept order', 'error');
    }
  };

  const handleDeclineOrder = async () => {
    if (!currentOrderId) return;
    try {
      await declineOrder(currentOrderId);
      setStep('cancelled');
    } catch (err: any) {
      showToast(err.message || 'Failed to decline order', 'error');
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrderId) return;
    try {
      await supabase.rpc('cancel_p2p_order', { p_order_id: currentOrderId });
      setStep('cancelled');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order', 'error');
    }
  };

  const handleReleaseEscrow = async () => {
    if (!currentOrderId || !user) return;
    
    try {
      const { error } = await supabase.rpc('release_p2p_escrow', {
        p_order_id: currentOrderId
      });

      if (error) throw error;

      await fetchBalance(user.id);
      setStep('success');
    } catch (err: any) {
      showToast(err.message || 'Failed to release escrow', 'error');
    }
  };

  // Auto-cancel (before payment) / auto-dispute (after payment) on timeout
  useEffect(() => {
    if (step === 'success') {
      playNotification();
      const t = setTimeout(() => setShowReviewModal(true), 1500);
      return () => clearTimeout(t);
    }
    // Before payment: auto-cancel
    if (step === 'waiting-acceptance' && acceptRemaining === 0 && currentOrderId) {
      handleCancelOrder();
    }
    if (step === 'pay-seller' && remaining === 0 && currentOrderId) {
      handleCancelOrder();
    }
    // After payment: auto-dispute
    if ((step === 'awaiting-release' || step === 'waiting-payment') && releaseRemaining === 0 && currentOrderId) {
      supabase.rpc('auto_dispute_p2p_order', { p_order_id: currentOrderId }).then(() => {
        showToast('Trade auto-escalated to resolution center.', 'warning');
        setTimeout(() => navigate('/wallet/deposit/p2p/disputes'), 1500);
      });
    }
  }, [step, remaining, releaseRemaining, acceptRemaining]);

  const steps: P2PStep[] = ['onboarding', 'choose-asset', 'enter-amount', 'waiting-acceptance', 'pay-seller', 'upload-proof', 'awaiting-release', 'success'];
  const stepIdx = steps.indexOf(step);
  const progressPct = step === 'success' ? 100 : Math.max(0, (stepIdx / (steps.length - 1)) * 100);

  const canCancel = ['waiting-acceptance', 'pay-seller', 'upload-proof'].includes(step);

  const handleBack = () => {
    if (step === 'onboarding') { navigate(-1); return; }
    if (step === 'choose-asset') { setStep('onboarding'); return; }
    if (step === 'enter-amount') { setStep('choose-asset'); return; }
    navigate(-1);
  };

  const submitReview = async () => {
    if (rating === 0) {
      showToast('Please select a rating', 'warning');
      return;
    }
    setIsSubmittingReview(true);
    
    try {
      await supabase.from('p2p_reviews').insert({
        id: 'REV-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        trade_id: tradeId,
        reviewer_email: profile?.email || 'unknown',
        target_email: selectedOffer?.userEmail || 'trader',
        rating,
        comment: reviewComment,
      });
    } catch (e) { console.error('Review insert error:', e); }

    setTimeout(() => {
      setIsSubmittingReview(false);
      setShowReviewModal(false);
      showToast('Thank you for your feedback!', 'success');
      navigate('/wallet');
    }, 1500);
  };

  const { createDispute } = useDisputes();
  const handleReportTrade = async (autoReason?: string) => {
    const finalReason = autoReason || reportReason;
    const finalDesc = autoReason ? `Trade ${tradeId} automatically disputed due to timeout.` : reportDescription;

    try {
      await createDispute({
        trade_id: tradeId,
        category: finalReason,
        reason: finalReason,
        description: finalDesc || `Dispute raised for trade ${tradeId}. Amount: ${nrtAmountDisplay} NRT ($${usdAmountDisplay}).`,
      });

      setShowReportModal(false);
      showToast('Dispute raised successfully. Redirecting to Dispute Center...', 'success');
      setTimeout(() => navigate('/wallet/deposit/p2p/disputes'), 1500);
    } catch (err: any) {
      showToast(err.message || 'Failed to raise dispute', 'danger');
    }
  };

  return (
    <motion.div
      className="min-h-screen pb-24 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {isLoadingOrder && (
        <div className="absolute inset-0 z-50 bg-bg-primary/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <Loader2 size={40} className="text-accent-primary animate-spin" />
          <p className="text-sm font-bold text-text-secondary">Loading Order Details...</p>
        </div>
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 pt-8">
        <button onClick={handleBack} className="p-2 bg-bg-secondary rounded-full hover:bg-glass-border transition-colors">
          <ChevronLeft size={18} className="text-text-primary" />
        </button>
        <div className="text-center">
          <p className="text-xs text-text-secondary font-medium">P2P Trading</p>
          <p className="text-[10px] text-text-secondary">Trade ID: {tradeId}</p>
        </div>
        {canCancel ? (
          <button onClick={() => setShowCancelConfirm(true)} className="text-xs text-red-400 font-semibold px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/20">
            Cancel
          </button>
        ) : <div className="w-10" />}
      </div>

      {/* Progress bar */}
      {step !== 'onboarding' && step !== 'cancelled' && (
        <div className="px-4 mb-4">
          <div className="w-full bg-bg-secondary rounded-full h-1 overflow-hidden">
            <motion.div
              className="h-full bg-accent-primary rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 px-4 space-y-5"
        >
          {/* ── ONBOARDING ─────────────────────────────────────── */}
          {step === 'onboarding' && (
            <div className="space-y-6 pt-4">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full mx-auto flex items-center justify-center">
                  <MessageCircle size={40} className="text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold">P2P Trading</h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Buy NRT directly from verified sellers at the best market rates with zero platform fees.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: ShieldAlert, color: '#10b981', text: 'Escrow-protected — NRT is held securely until you confirm payment' },
                  { icon: Clock, color: '#3b82f6', text: '15-minute payment window to complete each trade' },
                  { icon: Flag, color: '#f59e0b', text: 'Dispute resolution available via Support Center' },
                ].map(({ icon: Icon, color, text }) => (
                  <div key={text} className="flex items-start gap-3 glass rounded-xl p-3 border border-glass-border">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setStep('choose-asset')}
                  className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => navigate('/wallet/deposit/p2p')}
                  className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border flex items-center justify-center gap-2"
                >
                  View Market Offer Listing
                </button>
              </div>
            </div>
          )}

          {/* ── CHOOSE ASSET ───────────────────────────────────── */}
          {step === 'choose-asset' && (
            <div className="space-y-5 pt-2">
              <div>
                <h2 className="text-xl font-bold">Choose Asset</h2>
                <p className="text-sm text-text-secondary mt-1">Select the token you want to buy</p>
              </div>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="glass rounded-xl border-2 border-accent-primary p-4 flex items-center gap-4 cursor-pointer relative"
              >
                <div className="absolute top-2 right-2">
                  <Check size={14} className="text-accent-primary" />
                </div>
                <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center">
                  <span className="font-black text-accent-primary text-lg">N</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary">NRT</h3>
                  <p className="text-xs text-text-secondary">NetReward Token</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-primary">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 7 })}</p>
                  <p className="text-xs text-emerald-400">+2.4% 24h</p>
                </div>
              </motion.div>
              <div className="glass rounded-xl border border-glass-border p-3 flex items-center gap-3 opacity-50">
                <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center">
                  <span className="font-black text-text-secondary text-sm">U</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary text-sm">USDC</h3>
                  <p className="text-xs text-text-secondary">Coming Soon</p>
                </div>
              </div>
              <button
                onClick={() => setStep('enter-amount')}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20"
              >
                Continue
              </button>
            </div>
          )}

          {/* ── ENTER AMOUNT ───────────────────────────────────── */}
          {step === 'enter-amount' && (
            <div className="space-y-5 pt-2">
              <div>
                <h2 className="text-xl font-bold">{isSelling ? 'Enter Sell Amount' : 'Enter Buy Amount'}</h2>
                <p className="text-sm text-text-secondary mt-1">
                  {isSelling ? `Amount in NRT to sell to ${selectedOffer?.userName || 'Buyer'}` : `Amount in ${LOCAL_CURRENCY} to pay`}
                </p>
              </div>

              <div className="glass rounded-xl border border-glass-border p-4 space-y-4">
                <div>
                  <label className="text-xs text-text-secondary font-medium">
                    {isSelling ? 'You sell (NRT)' : `You pay (${LOCAL_CURRENCY})`}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-text-secondary text-xl font-bold">{isSelling ? '' : '$'}</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="flex-1 bg-transparent text-2xl font-bold text-text-primary outline-none placeholder:text-text-secondary/40"
                    />
                    {isSelling && <span className="text-text-secondary text-sm font-bold">NRT</span>}
                  </div>
                </div>
                <div className="border-t border-glass-border/50 pt-3">
                  <label className="text-xs text-text-secondary font-medium">
                    {isSelling ? `You receive (${LOCAL_CURRENCY})` : 'You receive (NRT)'}
                  </label>
                  <p className="text-2xl font-bold text-accent-primary mt-1">
                    {isSelling ? `$${usdAmountDisplay}` : `${nrtAmountDisplay}`} 
                    <span className="text-sm text-text-secondary font-normal ml-1">{isSelling ? LOCAL_CURRENCY : 'NRT'}</span>
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">Rate: 1 NRT = ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 7 })} · <span className="text-emerald-400 font-semibold">0 Fee</span></p>
                </div>
              </div>

              {/* Quick amounts */}
              <div>
                <p className="text-xs text-text-secondary mb-2 font-medium">Quick select ({isSelling ? 'NRT' : '$'})</p>
                <div className="flex gap-2">
                  {(isSelling ? ['100', '500', '1000', '5000'] : ['10', '25', '50', '100']).map(q => (
                    <button
                      key={q}
                      onClick={() => setAmount(q)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                        amount === q ? 'bg-accent-primary/20 border-accent-primary text-accent-primary' : 'bg-bg-secondary border-glass-border text-text-secondary'
                      }`}
                    >
                      {isSelling ? '' : '$'}{q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method selection for selling */}
              {isSelling && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-secondary font-medium">Receiving Payment Method</p>
                    <button 
                      onClick={() => navigate('/wallet/deposit/p2p/accounts')}
                      className="text-[10px] font-bold text-accent-primary bg-accent-primary/10 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Plus size={12} /> Add New
                    </button>
                  </div>
                  <div className="space-y-2">
                    {paymentAccounts.length > 0 ? (
                      paymentAccounts.map(acc => (
                        <button
                          key={acc.id}
                          onClick={() => setPaymentMethodId(acc.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            paymentMethodId === acc.id 
                              ? 'bg-accent-primary/10 border-accent-primary' 
                              : 'bg-bg-secondary border-glass-border hover:border-glass-border/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center text-accent-primary">
                              <CreditCard size={14} />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-text-primary">{acc.provider}</p>
                              <p className="text-[10px] text-text-secondary">{acc.accountNumber}</p>
                            </div>
                          </div>
                          {paymentMethodId === acc.id && <Check size={16} className="text-accent-primary" />}
                        </button>
                      ))
                    ) : (
                      <button 
                        onClick={() => navigate('/wallet/deposit/p2p/accounts')}
                        className="w-full p-4 border border-dashed border-glass-border rounded-xl text-center space-y-1"
                      >
                        <p className="text-xs font-bold text-text-secondary">No payment accounts found</p>
                        <p className="text-[10px] text-accent-primary underline">Add an account to continue</p>
                      </button>
                    )}
                  </div>

                  {/* KYC Check for Selling (Moved here) */}
                  {profile?.kyc_status !== 'verified' && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-500">
                        <ShieldAlert size={18} />
                        <p className="text-sm font-bold">KYC Verification Required</p>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        You must have a verified KYC profile to sell NRT. Your current status is <span className="font-bold uppercase">{profile?.kyc_status || 'none'}</span>.
                      </p>
                      <button 
                        onClick={() => navigate('/settings/kyc')}
                        className="text-xs font-bold text-amber-500 underline underline-offset-4"
                      >
                        Complete KYC Verification Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleStartTrade}
                disabled={!amount || parseFloat(amount) <= 0 || (isSelling && (profile?.kyc_status !== 'verified' || !paymentMethodId))}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedOffer ? `${isSelling ? 'Sell NRT to' : 'Trade with'} ${selectedOffer.userName}` : `${isSelling ? 'Sell NRT' : 'Buy NRT'} · 0 Fee`}
              </button>
            </div>
          )}

          {/* ── WAITING FOR SELLER ACCEPTANCE (Buyer view) ──── */}
          {step === 'waiting-acceptance' && (
            <div className="flex flex-col items-center justify-center gap-6 pt-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-full border-4 border-accent-primary border-t-transparent"
              />
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Waiting for Seller</h2>
                <p className="text-sm text-text-secondary">
                  Your order for <span className="text-accent-primary font-semibold">{nrtAmountDisplay} NRT</span> has been sent to {selectedOffer?.userName || 'the seller'}.
                </p>
                <p className="text-xs text-text-secondary">Waiting for them to accept your trade…</p>
              </div>
              <div className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl border font-mono text-xl font-bold ${
                acceptRemaining < 120 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
              }`}>
                <Clock size={18} />
                {acceptMins}:{acceptSecs}
              </div>
              <p className="text-[10px] text-text-secondary text-center">
                The order will be automatically cancelled if the seller does not respond within 10 minutes.
              </p>
            </div>
          )}

          {/* ── DECLINED (Seller rejected) ─────────────────── */}
          {step === 'declined' && (
            <div className="flex flex-col items-center justify-center gap-6 pt-16 text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                <X size={40} className="text-red-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Order Declined</h2>
                <p className="text-sm text-text-secondary">The seller has declined your trade request. No funds were charged.</p>
              </div>
              <button
                onClick={() => navigate('/wallet/deposit/p2p')}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20"
              >
                Return to P2P Market
              </button>
            </div>
          )}

          {/* ── WAITING FOR PAYMENT (Seller view) ──────────── */}
          {step === 'waiting-payment' && (
            <div className="space-y-4 pt-2">
              <div>
                <h2 className="text-xl font-bold">Waiting for Payment</h2>
                <p className="text-sm text-text-secondary mt-0.5">The buyer is processing payment. You will be notified when proof is uploaded.</p>
              </div>

              {/* Countdown */}
              <div className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-mono text-2xl font-bold ${
                releaseRemaining < 120 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <Clock size={20} />
                {releaseMins}:{releaseSecs}
              </div>

              {/* Trade details */}
              <div className="glass rounded-xl border border-glass-border p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Amount</span>
                  <span className="font-bold text-accent-primary">{nrtAmountDisplay} NRT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">You receive</span>
                  <span className="font-bold text-text-primary">${usdAmountDisplay} {LOCAL_CURRENCY}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Buyer</span>
                  <span className="font-bold text-text-primary">{selectedOffer?.userName || 'Buyer'}</span>
                </div>
              </div>

              {/* Scam Tips */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-500">
                  <ShieldAlert size={18} />
                  <p className="text-sm font-bold">Scam Protection Tips</p>
                </div>
                <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside leading-relaxed">
                  <li>Only confirm when you see the <span className="font-bold text-text-primary">actual funds</span> in your bank account</li>
                  <li>Do <span className="font-bold text-red-400">NOT</span> rely on SMS or email notifications — they can be faked</li>
                  <li>Never release NRT based on a screenshot from the buyer</li>
                  <li>Check your bank app directly to verify the payment</li>
                </ul>
              </div>

              {/* Check bank message */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2">
                <CreditCard size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  <span className="font-bold text-blue-400">Check your bank account</span> to confirm the buyer's payment has arrived before releasing NRT.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex-1 py-3 rounded-xl bg-bg-secondary border border-glass-border text-text-secondary font-semibold flex items-center justify-center gap-2 text-sm"
                >
                  <MessageCircle size={16} /> Chat Buyer
                </button>
                <button
                  onClick={handleReleaseEscrow}
                  className="flex-2 flex-grow py-3 rounded-xl bg-accent-primary text-primary-foreground font-bold shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 text-sm"
                >
                  <Check size={16} /> Confirm & Release NRT
                </button>
              </div>
            </div>
          )}

          {/* ── PAY SELLER / SELLER ACCEPT ────────────────────── */}
          {step === 'pay-seller' && (
            <div className="space-y-4 pt-2">
              <div>
                <h2 className="text-xl font-bold">{isSelling ? 'New Order Received' : 'Pay the Seller'}</h2>
                <p className="text-sm text-text-secondary mt-0.5">
                  {isSelling ? 'A buyer wants to purchase NRT from you. Review and accept or decline.' : 'Complete payment before the timer expires'}
                </p>
              </div>

              {/* Countdown (buyer only) */}
              {!isSelling && (
                <div className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-mono text-2xl font-bold ${
                  remaining < 120 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
                }`}>
                  <Clock size={20} />
                  {mins}:{secs}
                </div>
              )}

              {/* Trade details */}
              <div className="glass rounded-xl border border-glass-border p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Amount</span>
                  <span className="font-bold text-accent-primary">{nrtAmountDisplay} NRT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{isSelling ? 'You receive' : 'You pay'}</span>
                  <span className="font-bold text-text-primary">${usdAmountDisplay} {LOCAL_CURRENCY}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Payment method</span>
                  <span className="font-bold text-text-primary">{loadedPaymentMethod || paymentAccounts.find(a => a.id === paymentMethodId)?.provider || 'Bank Transfer'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{isSelling ? 'Buyer' : 'Seller'}</span>
                  <span className="font-bold text-text-primary">{selectedOffer?.userName || 'Trader'}</span>
                </div>
                {!isSelling && (
                  <div className="border-t border-glass-border/50 pt-3">
                    <p className="text-xs text-text-secondary font-medium mb-1">Seller's account details</p>
                    <p className="text-sm font-semibold text-text-primary">Account: {sellerAccount?.account_number || 'Pending'}</p>
                    <p className="text-sm text-text-secondary">Bank: {sellerAccount?.provider || 'Pending'}</p>
                    <p className="text-sm text-text-secondary">Name: {sellerAccount?.account_name || 'Pending'}</p>
                  </div>
                )}
              </div>

              {/* Scam Tips */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-500">
                  <ShieldAlert size={18} />
                  <p className="text-sm font-bold">Scam Protection Tips</p>
                </div>
                <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside leading-relaxed">
                  {isSelling ? (
                    <>
                      <li>Only accept orders from users with good ratings</li>
                      <li>Never release NRT until you confirm payment in your bank</li>
                      <li>Do <span className="font-bold text-red-400">NOT</span> rely on SMS or email — check your bank app</li>
                    </>
                  ) : (
                    <>
                      <li>Only pay to the account details shown above</li>
                      <li>Do <span className="font-bold text-red-400">NOT</span> pay to any account shared via chat</li>
                      <li>Always upload proof of payment after completing the transfer</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Seller: Accept/Decline, Buyer: Chat/Confirm */}
              {isSelling ? (
                <div className="flex gap-3">
                  <button onClick={handleDeclineOrder} className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/30 font-bold text-red-400 text-sm">
                    Decline
                  </button>
                  <button onClick={handleAcceptOrder} className="flex-2 flex-grow py-3 rounded-xl bg-accent-primary text-primary-foreground font-bold shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 text-sm">
                    <Check size={16} /> Accept Order
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setShowChat(true)} className="flex-1 py-3 rounded-xl bg-bg-secondary border border-glass-border text-text-secondary font-semibold flex items-center justify-center gap-2 text-sm">
                    <MessageCircle size={16} /> Chat
                  </button>
                  <button onClick={() => setStep('upload-proof')} className="flex-2 flex-grow py-3 rounded-xl bg-accent-primary text-primary-foreground font-bold shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 text-sm">
                    <Check size={16} /> I've Paid
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── UPLOAD PROOF ───────────────────────────────────── */}
          {step === 'upload-proof' && (
            <div className="space-y-5 pt-2">
              <div>
                <h2 className="text-xl font-bold">Upload Proof</h2>
                <p className="text-sm text-text-secondary mt-1">Provide payment proof for the seller to verify</p>
              </div>

              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />

              <div
                onClick={() => fileRef.current?.click()}
                className={`glass rounded-xl border-2 border-dashed p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  proofFile ? 'border-accent-primary bg-accent-primary/5' : 'border-glass-border hover:border-accent-primary/50'
                }`}
              >
                {proofFile ? (
                  <>
                    <CheckCircle2 size={40} className="text-accent-primary" />
                    <p className="text-sm font-semibold text-accent-primary">{proofFile.name}</p>
                    <p className="text-xs text-text-secondary">Tap to change</p>
                  </>
                ) : (
                  <>
                    <Upload size={40} className="text-text-secondary" />
                    <p className="text-sm font-semibold text-text-primary">Upload Screenshot</p>
                    <p className="text-xs text-text-secondary text-center">Tap to upload payment screenshot or video proof</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Camera size={14} />
                <span>Video proof is optional but may speed up release</span>
              </div>

              <button
                onClick={async () => {
                  if (!currentOrderId) return;
                  try {
                    await markOrderPaid(currentOrderId);
                    setStep('awaiting-release');
                  } catch (err: any) {
                    showToast(err.message || 'Failed to submit proof', 'error');
                  }
                }}
                disabled={!proofFile}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Proof
              </button>
            </div>
          )}

          {/* ── AWAITING RELEASE ────────────────────────────────── */}
          {step === 'awaiting-release' && (
            <div className="space-y-5 pt-2">
              <div className="text-center space-y-2 pt-4">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 bg-amber-500/10 rounded-full mx-auto flex items-center justify-center"
                >
                  <Loader2 size={32} className="text-amber-400 animate-spin" />
                </motion.div>
                <h2 className="text-xl font-bold">Awaiting NRT Release</h2>
                <p className="text-sm text-text-secondary">Proof submitted. Waiting for the seller to release your NRT.</p>
                
                <div className={`flex items-center justify-center gap-2 py-3 mt-4 rounded-xl border font-mono text-xl font-bold ${
                  releaseRemaining < 120 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  <Clock size={18} />
                  {releaseMins}:{releaseSecs}
                </div>
              </div>

              <div className="glass rounded-xl border border-glass-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Trade ID</span>
                  <span className="font-mono font-bold text-text-primary">{tradeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Amount</span>
                  <span className="font-bold text-accent-primary">{nrtAmountDisplay} NRT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Status</span>
                  <span className="text-amber-400 font-semibold">Awaiting Release</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex-1 py-3 rounded-xl bg-bg-secondary border border-glass-border font-semibold text-text-secondary flex items-center justify-center gap-2 text-sm"
                >
                  <MessageCircle size={16} /> Chat Seller
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/30 font-semibold text-red-400 flex items-center justify-center gap-2 text-sm"
                >
                  <Flag size={16} /> Report Trade
                </button>
              </div>
            </div>
          )}

          {/* ── SUCCESS ────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center gap-6 pt-12 text-center relative overflow-hidden">
              {/* Confetti particles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6],
                    left: `${10 + Math.random() * 80}%`,
                    top: '-10px',
                  }}
                  animate={{
                    y: [0, 500 + Math.random() * 200],
                    x: [0, (Math.random() - 0.5) * 100],
                    rotate: [0, Math.random() * 720],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    delay: Math.random() * 0.5,
                    ease: 'easeOut',
                  }}
                />
              ))}

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 size={56} className="text-emerald-400" />
              </motion.div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{isSelling ? 'You have sold' : 'NRT Received!'}</h2>
                <p className="text-4xl font-black text-accent-primary">{nrtAmountDisplay} <span className="text-lg">NRT</span></p>
                <p className="text-sm font-bold text-emerald-400">{isSelling ? 'Order successfully completed' : 'Successfully credited to your wallet'}</p>
              </div>
              <div className="glass rounded-xl border border-glass-border p-4 w-full text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Trade ID</span>
                  <span className="font-mono font-bold">{tradeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Amount</span>
                  <span className="font-bold text-accent-primary">{nrtAmountDisplay} NRT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{isSelling ? 'Received' : 'Paid'}</span>
                  <span className="font-bold">${usdAmountDisplay} {LOCAL_CURRENCY}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Fee</span>
                  <span className="font-bold text-emerald-400">$0.00</span>
                </div>
              </div>
              <button
                onClick={() => navigate('/wallet/deposit/p2p')}
                className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20"
              >
                Return to P2P Market
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Cancel Confirmation Sheet */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border p-5 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertTriangle size={28} className="text-red-400" />
                </div>
                <h3 className="font-bold text-lg">Cancel Trade?</h3>
                <p className="text-sm text-text-secondary">
                  Are you sure you want to cancel this trade? Frequent cancellations may affect your trading reputation.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-bg-secondary border border-glass-border font-semibold text-text-primary"
                >
                  Keep Trading
                </button>
                <button
                  onClick={() => { setShowCancelConfirm(false); handleCancelOrder(); }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/20"
                >
                  Cancel Trade
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancelled state */}
      {step === 'cancelled' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-bg-primary z-50 p-4 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
            <X size={40} className="text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Trade Cancelled</h2>
            <p className="text-sm text-text-secondary">This order has been cancelled and any locked escrow has been refunded.</p>
          </div>
          <button
            onClick={() => navigate('/wallet/deposit/p2p/my-offers')}
            className="w-full max-w-sm py-4 bg-bg-secondary border border-glass-border font-bold rounded-xl mt-4"
          >
            Return to My Orders
          </button>
        </div>
      )}

      {/* Transaction Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowChat(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm overflow-hidden flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
              
              <div className="p-4 border-b border-glass-border flex justify-between items-center bg-bg-secondary shrink-0">
                <div>
                  <h3 className="font-bold flex items-center gap-2">Transaction Chat</h3>
                  <p className="text-xs text-text-secondary">Trade ID: {tradeId}</p>
                </div>
                <button onClick={() => setShowChat(false)} className="p-1.5 rounded-full hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-xl text-xs text-accent-primary text-center">
                  Trade started. Ensure you communicate only within this chat.
                </div>
                
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-bold text-text-secondary">{m.sender}</span>
                      <span className="text-[10px] text-text-secondary">{m.time}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-sm ${m.sender === 'You' ? 'bg-accent-primary text-white' : 'bg-bg-secondary border border-glass-border text-text-primary'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-glass-border bg-bg-secondary shrink-0">
                <div className="flex gap-2">
                  <input value={chatReply} onChange={e => setChatReply(e.target.value)} onKeyDown={e => {
                    if (e.key === 'Enter' && chatReply.trim()) {
                      setMessages([...messages, { sender: 'You', text: chatReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                      setChatReply('');
                    }
                  }} placeholder="Type a message..." className="flex-1 bg-bg-card border border-glass-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-primary" />
                  <button onClick={() => {
                    if (chatReply.trim()) {
                      setMessages([...messages, { sender: 'You', text: chatReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                      setChatReply('');
                    }
                  }} className="px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20">Send</button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave a Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowReviewModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-accent-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Rate your experience</h3>
                  <p className="text-sm text-text-secondary mt-1">How was your trade with {selectedOffer?.userName || 'the seller'}?</p>
                </div>

                <div className="flex justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill={star <= rating ? 'var(--accent-primary)' : 'none'}
                        stroke={star <= rating ? 'var(--accent-primary)' : 'var(--text-secondary)'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  ))}
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience (optional)..."
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl p-3 text-sm min-h-[100px] outline-none focus:border-accent-primary transition-colors resize-none"
                ></textarea>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="flex-1 py-3 rounded-xl bg-bg-secondary text-text-secondary font-semibold text-sm"
                  >
                    Skip
                  </button>
                  <button
                    onClick={submitReview}
                    disabled={isSubmittingReview || rating === 0}
                    className="flex-1 py-3 rounded-xl bg-accent-primary text-white font-bold text-sm shadow-lg shadow-accent-primary/20 disabled:opacity-50"
                  >
                    {isSubmittingReview ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Submit'}
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Trade Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowReportModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              
              <div className="p-6 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                    <Flag size={32} />
                  </div>
                  <h3 className="font-bold text-xl text-text-primary">Report Trade</h3>
                  <p className="text-sm text-text-secondary">
                    Provide details about the issue. Our resolution team will review the trade immediately.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Reason for Dispute</label>
                    <select 
                      value={reportReason}
                      onChange={e => setReportReason(e.target.value)}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:border-accent-primary outline-none transition-colors"
                    >
                      <option value="payment_not_received">Payment not received</option>
                      <option value="nrt_not_released">NRT not released</option>
                      <option value="wrong_amount">Incorrect amount paid</option>
                      <option value="scam_attempt">Suspicious behavior/Scam attempt</option>
                      <option value="other">Other issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Detailed Description</label>
                    <textarea
                      value={reportDescription}
                      onChange={e => setReportDescription(e.target.value)}
                      placeholder="Describe exactly what happened..."
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl p-4 text-sm min-h-[120px] outline-none focus:border-accent-primary transition-colors resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-4 rounded-xl bg-bg-secondary text-text-secondary font-bold text-sm hover:bg-glass-bg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReportTrade()}
                    disabled={!reportDescription.trim()}
                    className="flex-1 py-4 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-50"
                  >
                    Raise Dispute
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

  );
}
