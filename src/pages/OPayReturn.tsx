import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, Loader2, ArrowLeft, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWalletStore } from '@/stores/useWalletStore';
import { useAuthStore } from '@/stores/useAuthStore';

type PaymentStatus = 'loading' | 'SUCCESS' | 'PENDING' | 'FAIL' | 'CLOSE' | 'not_found';

export default function OPayReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('ref');
  const { fetchBalance } = useWalletStore();
  const { user } = useAuthStore();

  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!reference) {
      setStatus('not_found');
      return;
    }

    const checkStatus = async () => {
      const { data, error } = await supabase
        .from('opay_payments')
        .select('*')
        .eq('reference', reference)
        .single();

      if (error || !data) {
        if (pollCount > 10) {
          setStatus('not_found');
        }
        return;
      }

      setPaymentData(data);

      if (data.status === 'SUCCESS') {
        setStatus('SUCCESS');
        if (user?.id) fetchBalance(user.id);
      } else if (data.status === 'FAIL') {
        setStatus('FAIL');
      } else if (data.status === 'CLOSE') {
        setStatus('CLOSE');
      } else {
        setStatus('PENDING');
      }
    };

    checkStatus();

    // Poll every 3 seconds for up to 30 seconds while pending
    if (status === 'loading' || status === 'PENDING') {
      const interval = setInterval(() => {
        setPollCount(c => c + 1);
        checkStatus();
      }, 3000);

      const timeout = setTimeout(() => clearInterval(interval), 30000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }
  }, [reference, pollCount, status, user?.id, fetchBalance]);

  const statusConfig = {
    loading: {
      icon: <Loader2 size={48} className="text-accent-primary animate-spin" />,
      title: 'Verifying Payment...',
      subtitle: 'Please wait while we confirm your payment with OPay.',
      color: 'from-accent-primary/20 to-purple-500/20',
    },
    SUCCESS: {
      icon: <CheckCircle2 size={48} className="text-emerald-400" />,
      title: 'Payment Successful!',
      subtitle: `${paymentData?.amount_nrt?.toFixed(2) || '0'} NRT has been credited to your wallet.`,
      color: 'from-emerald-500/20 to-green-500/20',
    },
    PENDING: {
      icon: <Clock size={48} className="text-amber-400" />,
      title: 'Payment Processing',
      subtitle: 'Your payment is being processed. NRT will be credited once confirmed.',
      color: 'from-amber-500/20 to-orange-500/20',
    },
    FAIL: {
      icon: <XCircle size={48} className="text-red-400" />,
      title: 'Payment Failed',
      subtitle: 'The payment could not be completed. No charges were made.',
      color: 'from-red-500/20 to-rose-500/20',
    },
    CLOSE: {
      icon: <XCircle size={48} className="text-gray-400" />,
      title: 'Payment Cancelled',
      subtitle: 'The payment session was cancelled or expired.',
      color: 'from-gray-500/20 to-slate-500/20',
    },
    not_found: {
      icon: <XCircle size={48} className="text-gray-400" />,
      title: 'Payment Not Found',
      subtitle: 'We could not find a payment matching this reference.',
      color: 'from-gray-500/20 to-slate-500/20',
    },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      className="min-h-screen p-4 pt-8 pb-24 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-sm"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className={`glass rounded-3xl border border-glass-border overflow-hidden`}>
          {/* Status Header */}
          <div className={`p-8 flex flex-col items-center bg-gradient-to-br ${config.color}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              {config.icon}
            </motion.div>
            <h2 className="text-xl font-bold text-text-primary mt-4 text-center">{config.title}</h2>
            <p className="text-sm text-text-secondary mt-2 text-center">{config.subtitle}</p>
          </div>

          {/* Payment Details */}
          {paymentData && (
            <div className="p-6 space-y-3 border-t border-glass-border">
              {[
                { label: 'Reference', value: paymentData.reference },
                { label: 'Amount', value: `${paymentData.currency} ${paymentData.amount_fiat?.toLocaleString()}` },
                { label: 'NRT Amount', value: `${paymentData.amount_nrt?.toFixed(2)} NRT` },
                ...(paymentData.opay_transaction_id ? [{ label: 'OPay ID', value: paymentData.opay_transaction_id }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{label}</span>
                  <span className="font-semibold text-text-primary text-right max-w-[200px] truncate">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="p-6 border-t border-glass-border space-y-3">
            {status === 'SUCCESS' && (
              <button
                onClick={() => navigate('/wallet')}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                <Wallet size={18} /> View Wallet
              </button>
            )}

            {(status === 'FAIL' || status === 'CLOSE') && (
              <button
                onClick={() => navigate('/wallet/deposit/instant-purchase')}
                className="w-full py-3.5 bg-accent-primary hover:bg-accent-primary/80 text-white font-bold rounded-2xl transition-colors"
              >
                Try Again
              </button>
            )}

            <button
              onClick={() => navigate('/wallet')}
              className="w-full py-3 bg-bg-secondary hover:bg-glass-border text-text-primary font-bold rounded-2xl border border-glass-border flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft size={16} /> Back to Wallet
            </button>
          </div>
        </div>

        {/* Pending auto-refresh indicator */}
        {status === 'PENDING' && (
          <motion.p
            className="text-center text-xs text-text-secondary mt-4 flex items-center justify-center gap-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Loader2 size={12} className="animate-spin" />
            Checking for confirmation...
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
