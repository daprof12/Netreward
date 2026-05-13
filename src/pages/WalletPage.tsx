import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowUpFromLine, Users, ChevronLeft,
  TrendingUp, TrendingDown, Wallet, QrCode, History, Copy, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/hooks/useWallet';
import { useWalletStore } from '@/stores/useWalletStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { Skeleton } from '@/components/ui/skeleton';
import AnalyticsChart from '@/components/ui/AnalyticsChart';
import { useTransactions } from '@/hooks/useTransactions';
import WithdrawModal from '@/components/wallet/WithdrawModal';
import { useWalletAutomation } from '@/hooks/useWalletAutomation';
import { usePageTitle } from '@/hooks/usePageTitle';
import NrtAmount from '@/components/ui/NrtAmount';

function WalletSkeleton() {
  return (
    <div className="space-y-6 pb-24 p-4 pt-8">
      <Skeleton className="h-8 w-36 rounded-lg" />
      <Skeleton className="h-48 w-full rounded-[20px]" />
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function WalletPage() {
  usePageTitle('Wallet');
  const { wallet, isLoading } = useWallet();
  const { balanceNRT, fetchBalance, subscribeToWallet } = useWalletStore();
  const { user } = useAuthStore();
  const { selectedCurrency, convertNrt } = useCurrencyStore();
  const [receipt, setReceipt] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Trigger automated wallet generation if missing
  const { isSyncing } = useWalletAutomation();

  const { transactions, isLoading: isTxLoading, totalEarned, totalWithdrawn } = useTransactions();
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const navigate = useNavigate();

  // Setup real-time balance subscription
  useEffect(() => {
    if (!user?.id) return;
    fetchBalance(user.id);
    const unsubscribe = subscribeToWallet(user.id);
    return () => unsubscribe();
  }, [user?.id, fetchBalance, subscribeToWallet]);

  const displayBalance = balanceNRT;

  if (isLoading || isTxLoading || isSyncing) return <WalletSkeleton />;

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full hover:bg-glass-border transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative overflow-hidden rounded-[20px] p-6 shadow-xl"
        style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 50%, #6366f1 100%)' }}
      >
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <Wallet size={160} strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-medium">Total Balance</p>
          <h2 className="text-4xl font-bold text-white mt-1 tracking-tight">
            <NrtAmount
              value={displayBalance}
              hideUnit
              className="text-4xl font-bold text-white tracking-tight"
            />
            <span className="text-xl ml-2 text-white/70">NRT</span>
          </h2>
          <p className="text-white/60 text-sm mt-1">
            ≈ {convertNrt(displayBalance).symbol}{convertNrt(displayBalance).amount} {selectedCurrency.split(' ')[0]}
          </p>

          {/* Mini stats */}
          <div className="flex gap-6 mt-5">
            <div>
              <p className="text-white/50 text-xs">Total Earned</p>
              <p className="text-white font-bold text-sm">
                <NrtAmount value={totalEarned} showSign className="text-white font-bold text-sm" />
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs">Withdrawn</p>
              <p className="text-white font-bold text-sm">-<NrtAmount value={totalWithdrawn} hideUnit className="text-white font-bold text-sm" /><span className="ml-1 text-white/70 text-xs font-bold">NRT</span></p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: ArrowUpFromLine, label: 'Withdraw', color: '#10b981', bg: 'bg-emerald-500/10', onClick: () => setIsWithdrawModalOpen(true) },
          { icon: ArrowDownToLine, label: 'Deposit', to: '/wallet/deposit', color: 'var(--accent-primary)', bg: 'bg-accent-primary/10' },
          { icon: Users, label: 'Referral', to: '/wallet/referral', color: '#f59e0b', bg: 'bg-emerald-500/10' },
          { icon: QrCode, label: 'Scan2Pay', to: '/wallet/scan-to-pay', color: '#3b82f6', bg: 'bg-blue-500/10' },
        ].map(({ icon: Icon, label, to, color, bg, onClick }) => {
          const content = (
            <motion.div
              whileTap={{ scale: 0.93 }}
              className="glass rounded-xl p-3 border border-glass-border flex flex-col items-center gap-2 cursor-pointer hover:bg-glass-bg/50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-[10px] font-semibold text-text-secondary">{label}</span>
            </motion.div>
          );
          
          if (onClick) {
            return <button key={label} onClick={onClick} className="w-full">{content}</button>;
          }
          
          return (
            <Link key={label} to={to || '#'}>
              {content}
            </Link>
          );
        })}
      </div>


      {/* Solana Network Address */}
      <div className="glass rounded-[20px] p-5 border border-glass-border">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#14F195]/20 flex items-center justify-center">
              <Wallet size={16} className="text-[#14F195]" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Solana Network</h3>
              <Link to="/token-info" className="text-[10px] text-accent-primary hover:underline font-semibold">
                Token-2022 Standard • View Stats
              </Link>
            </div>
          </div>
          <Link to="/wallet/deposit/address" className="text-accent-primary text-xs font-bold hover:underline">
            View QR
          </Link>
        </div>
        <div className="bg-bg-secondary p-3 rounded-xl border border-glass-border flex items-center justify-between">
          <p className="font-mono text-xs text-text-secondary truncate pr-4">
            {wallet?.solana_public_key || 'Generating address...'}
          </p>
          <button 
            onClick={() => {
              if (wallet?.solana_public_key) {
                navigator.clipboard.writeText(wallet.solana_public_key);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            className="text-text-secondary hover:text-accent-primary transition-all duration-300"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"
                >
                  <Check size={10} strokeWidth={3} /> Copied
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Copy size={14} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-base">Transaction History</h3>
          <Link
            to="/transactions"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-primary/10 text-accent-primary text-xs font-bold border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
          >
            <History size={13} />
            History
          </Link>
        </div>

        <div className="glass rounded-xl border border-glass-border divide-y divide-glass-border/50 overflow-hidden">
          {transactions.length === 0 && (
            <div className="p-8 text-center text-text-secondary">
              <History size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No transactions yet</p>
            </div>
          )}
          {transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setReceipt(tx)}
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-glass-bg/50 transition-colors"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                tx.tx_type === 'reward' ? 'bg-emerald-500/10' :
                tx.tx_type === 'withdrawal' ? 'bg-red-500/10' : 'bg-accent-primary/10'
              }`}>
                {tx.tx_type === 'reward' ? (
                  <TrendingUp size={16} className="text-emerald-400" />
                ) : tx.tx_type === 'withdrawal' ? (
                  <TrendingDown size={16} className="text-red-400" />
                ) : (
                  <ArrowDownToLine size={16} className="text-accent-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{tx.description}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
              <p className={`font-bold text-sm shrink-0 ${Number(tx.amount) > 0 ? 'text-emerald-400' : 'text-text-primary'}`}>
                <NrtAmount value={tx.amount} showSign className={`font-bold text-sm ${Number(tx.amount) > 0 ? 'text-emerald-400' : 'text-text-primary'}`} />
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Transaction Receipt Modal */}
      <AnimatePresence>
        {receipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setReceipt(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-3xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              
              <div className="p-6 flex flex-col items-center border-b border-glass-border bg-gradient-to-b from-bg-secondary to-transparent">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  receipt.type === 'reward' ? 'bg-emerald-500/10' : receipt.type === 'withdrawal' ? 'bg-red-500/10' : 'bg-accent-primary/10'
                }`}>
                  {receipt.type === 'reward' ? <TrendingUp size={32} className="text-emerald-400" /> :
                   receipt.type === 'withdrawal' ? <TrendingDown size={32} className="text-red-400" /> :
                   <ArrowDownToLine size={32} className="text-accent-primary" />}
                </div>
                <h3 className="text-3xl font-black text-text-primary">
                  <NrtAmount
                    value={receipt.amount}
                    showSign
                    className="text-3xl font-black text-text-primary"
                    unitClassName="text-sm ml-1 text-text-secondary font-bold"
                  />
                </h3>
                <p className="text-xs text-text-secondary font-medium mt-1">
                  ≈ {convertNrt(Math.abs(receipt.amount)).symbol}{convertNrt(Math.abs(receipt.amount)).amount} {selectedCurrency.split(' ')[0]}
                </p>
                <p className="text-sm text-text-secondary font-medium mt-1">{receipt.description}</p>
                <div className="mt-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    receipt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    receipt.status === 'pending' ? 'bg-amber-400/10 text-amber-400' :
                    receipt.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {receipt.status || 'completed'}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {[
                  { label: 'Transaction ID', value: receipt.id.slice(0, 8) + '...' },
                  { label: 'Type', value: receipt.tx_type, capitalize: true },
                  { label: 'Date & Time', value: new Date(receipt.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) },
                  { label: 'Status', value: 'Completed', capitalize: true },
                ].map(({ label, value, capitalize }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{label}</span>
                    <span className={`font-semibold text-text-primary ${capitalize ? 'capitalize' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-glass-border">
                <button onClick={() => setReceipt(null)} className="w-full py-3.5 rounded-2xl bg-bg-secondary font-bold text-sm border border-glass-border hover:bg-glass-border transition-colors">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} />
    </motion.div>
  );
}
