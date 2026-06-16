import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Search, TrendingUp, TrendingDown,
  ArrowDownToLine, ShoppingCart, SlidersHorizontal,
  QrCode, Gift, X, Check, Repeat, Coins, Lock, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTransactions, type Transaction } from '@/hooks/useTransactions';
import EmptyState from '@/components/ui/EmptyState';
import { usePageTitle } from '@/hooks/usePageTitle';
import NrtAmount from '@/components/ui/NrtAmount';

const TYPE_OPTIONS = [
  { value: 'reward',         label: 'Rewards',     icon: TrendingUp,     color: 'text-emerald-400',     bg: 'bg-emerald-500/10'     },
  { value: 'deposit',        label: 'Deposits',    icon: ArrowDownToLine,color: 'text-accent-primary',  bg: 'bg-accent-primary/10'  },
  { value: 'withdrawal',     label: 'Withdrawals', icon: TrendingDown,   color: 'text-red-400',         bg: 'bg-red-500/10'         },
  { value: 'referral_bonus', label: 'Referrals',   icon: Gift,           color: 'text-amber-400',       bg: 'bg-amber-400/10'       },
  { value: 'scan2pay',       label: 'Scan2Pay',    icon: QrCode,         color: 'text-violet-400',      bg: 'bg-violet-500/10'      },
  { value: 'p2p',            label: 'P2P',         icon: Repeat,         color: 'text-blue-400',        bg: 'bg-blue-500/10'        },
  { value: 'cashback',       label: 'Cashback',    icon: Coins,          color: 'text-orange-400',      bg: 'bg-orange-500/10'      },
  { value: 'escrow_lock',    label: 'Escrow',      icon: Lock,           color: 'text-cyan-400',        bg: 'bg-cyan-500/10'        },
  { value: 'refund',         label: 'Refund',      icon: RefreshCw,      color: 'text-teal-400',        bg: 'bg-teal-500/10'        },
  { value: 'fee',            label: 'Fees',        icon: AlertCircle,    color: 'text-gray-400',        bg: 'bg-gray-500/10'        },
];

const STATUS_OPTIONS = ['all', 'completed', 'pending', 'failed', 'rejected', 'cancelled'];

function getTxMeta(type: string) {
  return TYPE_OPTIONS.find(o => o.value === type) ?? TYPE_OPTIONS[0];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-400',
    pending:   'bg-amber-400/10 text-amber-400',
    failed:    'bg-red-500/10 text-red-400',
    rejected:  'bg-gray-500/10 text-gray-400',
    cancelled: 'bg-gray-500/10 text-gray-400',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${map[status] ?? 'bg-bg-secondary text-text-secondary'}`}>
      {status}
    </span>
  );
}

export default function TransactionHistory() {
  usePageTitle('Transaction History');
  const navigate   = useNavigate();
  const { role }   = useAuthStore();

  const { transactions, isLoading } = useTransactions();
  const [searchParams] = useSearchParams();
  const merchantFilter = searchParams.get('merchant');

  const [activeTab,        setActiveTab]        = useState<'transactions' | 'checkouts'>(merchantFilter ? 'checkouts' : 'transactions');
  const [search,           setSearch]           = useState('');
  const [showFilter,       setShowFilter]       = useState(false);

  // Transaction filters
  const [selectedTypes,    setSelectedTypes]    = useState<string[]>([]);
  const [selectedStatus,   setSelectedStatus]   = useState('all');
  const [dateFrom,         setDateFrom]         = useState('');
  const [dateTo,           setDateTo]           = useState('');

  // Checkout filters
  const [chkStatus,        setChkStatus]        = useState('all');
  const [chkDateFrom,      setChkDateFrom]      = useState('');
  const [chkDateTo,        setChkDateTo]        = useState('');

  const [receipt,          setReceipt]          = useState<Transaction | null>(null);

  const dateCount         = (dateFrom || dateTo) ? 1 : 0;
  const activeFilterCount = selectedTypes.length + (selectedStatus !== 'all' ? 1 : 0) + dateCount;

  // Split transactions for SP checkout tab
  const checkoutTransactions = useMemo(() => {
    return transactions.filter(tx => tx.tx_type === 'scan2pay');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const q  = search.toLowerCase();
      const ms = tx.description.toLowerCase().includes(q) || tx.id.includes(q);
      const mt = selectedTypes.length === 0 || selectedTypes.includes(tx.tx_type);
      const mv = selectedStatus === 'all' || (tx.status || 'completed') === selectedStatus;

      // Date filtering
      if (dateFrom) {
        const txDate = new Date(tx.created_at);
        const from = new Date(dateFrom);
        if (txDate < from) return false;
      }
      if (dateTo) {
        const txDate = new Date(tx.created_at);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (txDate > to) return false;
      }
      
      // Merchant filter (for scan2pay checkouts)
      const mm = merchantFilter ? tx.merchant_id === merchantFilter : true;

      return ms && mt && mv && mm;
    });
  }, [transactions, search, selectedTypes, selectedStatus, dateFrom, dateTo, merchantFilter]);

  const filteredCheckouts = useMemo(() => {
    return checkoutTransactions.filter(chk => {
      const q  = search.toLowerCase();
      const ms = chk.description.toLowerCase().includes(q);
      const mv = chkStatus === 'all' || (chk.status || 'completed') === chkStatus;
      const mm = merchantFilter ? chk.merchant_id === merchantFilter : true;
      return ms && mv && mm;
    });
  }, [checkoutTransactions, search, chkStatus, merchantFilter]);

  const toggleType = (v: string) =>
    setSelectedTypes(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const clearFilters = () => {
    setSelectedTypes([]); setSelectedStatus('all');
    setDateFrom(''); setDateTo('');
    setChkStatus('all'); setChkDateFrom(''); setChkDateTo('');
  };

  return (
    <motion.div className="space-y-5 pb-24 p-4 pt-8 min-h-screen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">History</h1>
          <p className="text-xs text-text-secondary">View your past activities</p>
        </div>
      </div>

      {/* SP Tabs */}
      {role === 'sp' && (
        <div className="flex p-1 bg-bg-secondary rounded-xl">
          {(['transactions', 'checkouts'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors capitalize ${activeTab === tab ? 'bg-bg-card shadow-sm text-text-primary' : 'text-text-secondary'}`}>
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Search + Filter icon */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary text-text-primary" />
        </div>
        <button onClick={() => setShowFilter(true)}
          className={`relative p-2.5 rounded-xl border transition-colors ${activeFilterCount > 0 ? 'bg-accent-primary border-accent-primary text-primary-foreground' : 'bg-bg-secondary border-glass-border text-text-secondary'}`}>
          <SlidersHorizontal size={18} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips summary */}
      {(selectedTypes.length > 0 || selectedStatus !== 'all') && activeTab === 'transactions' && (
        <div className="flex gap-2 flex-wrap">
          {selectedTypes.map(t => {
            const m = getTxMeta(t);
            return (
              <span key={t} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${m.bg} ${m.color}`}>
                {m.label}
                <button onClick={() => toggleType(t)}><X size={10} /></button>
              </span>
            );
          })}
          {selectedStatus !== 'all' && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-bg-secondary text-text-secondary border border-glass-border capitalize">
              {selectedStatus}
              <button onClick={() => setSelectedStatus('all')}><X size={10} /></button>
            </span>
          )}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="animate-pulse text-text-secondary">Loading transactions...</span>
          </div>
        ) : activeTab === 'transactions' ? (
          filteredTransactions.length > 0 ? filteredTransactions.map((tx, i) => {
            const m = getTxMeta(tx.tx_type);
            const Icon = m.icon;
            return (
              <motion.div key={tx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }} onClick={() => setReceipt(tx)}
                className="glass rounded-xl border border-glass-border p-4 flex items-center gap-3 cursor-pointer hover:bg-glass-bg/50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${m.bg}`}>
                  <Icon size={18} className={m.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-text-primary truncate pr-2">{tx.description}</p>
                    <p className={`font-black text-sm shrink-0 ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      <NrtAmount
                        value={tx.amount}
                        showSign
                        className={`font-black text-sm ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                        unitClassName="text-[10px] font-medium text-text-secondary ml-0.5"
                      />
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-text-secondary">{formatDate(tx.created_at)}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${m.bg} ${m.color}`}>
                        {m.label}
                      </span>
                      <StatusBadge status={tx.status || 'completed'} />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <EmptyState
              icon={<TrendingUp size={24} />}
              title="No Transactions"
              message="Your transaction history will appear here once you start earning or spending NRT."
            />
          )
        ) : (
          filteredCheckouts.length > 0 ? filteredCheckouts.map((chk, i) => {
            return (
              <motion.div key={chk.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} onClick={() => setReceipt(chk)}
                className="glass rounded-xl border border-glass-border p-4 flex items-center gap-3 cursor-pointer hover:bg-glass-bg/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ShoppingCart size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-text-primary truncate pr-2">{chk.description}</p>
                    <p className="font-black text-sm text-text-primary shrink-0">
                      <NrtAmount
                        value={Math.abs(chk.amount)}
                        className="font-black text-sm text-text-primary"
                        unitClassName="text-[10px] text-text-secondary font-medium ml-0.5"
                      />
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-text-secondary">{formatDate(chk.created_at)}</p>
                    <StatusBadge status={chk.status || 'completed'} />
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <EmptyState
              icon={<ShoppingCart size={24} />}
              title="No Checkouts"
              message="Scan2Pay checkout records will appear here."
            />
          )
        )}
      </div>

      {/* ── Bottom Drawer Filter ── */}
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
              onClick={() => setShowFilter(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[160] bg-bg-card border-t border-glass-border rounded-t-3xl p-6 space-y-6 max-h-[85vh] overflow-y-auto w-full max-w-md mx-auto"
              onClick={e => e.stopPropagation()}>

              {/* Drawer handle */}
              <div className="w-10 h-1 bg-glass-border rounded-full mx-auto -mt-2" />

              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Filter {activeTab === 'transactions' ? 'Transactions' : 'Checkouts'}</h2>
                <div className="flex gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs font-bold text-red-400 px-3 py-1.5 bg-red-500/10 rounded-lg">
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setShowFilter(false)} className="p-1.5 bg-bg-secondary rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {activeTab === 'transactions' ? (
                <>
                  {/* Type multi-select */}
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Transaction Type</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TYPE_OPTIONS.map(o => {
                        const Icon = o.icon;
                        const active = selectedTypes.includes(o.value);
                        return (
                          <button key={o.value} onClick={() => toggleType(o.value)}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${active ? `${o.bg} ${o.color} border-transparent` : 'bg-bg-secondary border-glass-border text-text-secondary'}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${active ? 'bg-white/10' : o.bg}`}>
                              <Icon size={14} className={active ? 'text-current' : o.color} />
                            </div>
                            {o.label}
                            {active && <Check size={13} className="ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.map(s => (
                        <button key={s} onClick={() => setSelectedStatus(s)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border capitalize transition-all ${selectedStatus === s ? 'bg-accent-primary text-primary-foreground border-transparent' : 'bg-bg-secondary border-glass-border text-text-secondary'}`}>
                          {s === 'all' ? 'All Status' : s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Date Range</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-text-secondary mb-1 block">From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                          className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary" />
                      </div>
                      <div>
                        <label className="text-[11px] text-text-secondary mb-1 block">To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                          min={dateFrom || undefined}
                          className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary" />
                      </div>
                    </div>
                    {(dateFrom || dateTo) && (
                      <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                        className="mt-2 text-xs text-red-400 font-semibold">
                        Clear dates
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Checkout filters */
                <>
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.map(s => (
                        <button key={s} onClick={() => setChkStatus(s)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border capitalize transition-all ${chkStatus === s ? 'bg-accent-primary text-primary-foreground border-transparent' : 'bg-bg-secondary border-glass-border text-text-secondary'}`}>
                          {s === 'all' ? 'All Status' : s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Date Range</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-text-secondary mb-1 block">From</label>
                        <input type="date" value={chkDateFrom} onChange={e => setChkDateFrom(e.target.value)}
                          className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary" />
                      </div>
                      <div>
                        <label className="text-[11px] text-text-secondary mb-1 block">To</label>
                        <input type="date" value={chkDateTo} onChange={e => setChkDateTo(e.target.value)}
                          min={chkDateFrom || undefined}
                          className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary" />
                      </div>
                    </div>
                    {(chkDateFrom || chkDateTo) && (
                      <button onClick={() => { setChkDateFrom(''); setChkDateTo(''); }}
                        className="mt-2 text-xs text-red-400 font-semibold">
                        Clear dates
                      </button>
                    )}
                  </div>
                </>
              )}

              <button onClick={() => setShowFilter(false)}
                className="w-full py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-accent-primary/20">
                Apply Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Transaction Receipt Modal */}
      <AnimatePresence>
        {receipt && (() => {
          const m = getTxMeta(receipt.tx_type);
          const Icon = m.icon;
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setReceipt(null)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-bg-card border border-glass-border rounded-3xl w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}>
                <div className="p-6 flex flex-col items-center border-b border-glass-border bg-gradient-to-b from-bg-secondary to-transparent">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${m.bg}`}>
                    <Icon size={32} className={m.color} />
                  </div>
                  <h3 className="text-3xl font-black text-text-primary">
                    <NrtAmount
                      value={receipt.amount}
                      showSign
                      className="text-3xl font-black text-text-primary"
                      unitClassName="text-sm ml-1 text-text-secondary font-bold"
                    />
                  </h3>
                  <p className="text-sm text-text-secondary font-medium mt-1">{receipt.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.bg} ${m.color}`}>{m.label}</span>
                    <StatusBadge status={receipt.status || 'completed'} />
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { label: 'Transaction ID', value: receipt.id.slice(0, 8) + '...' },
                    { label: 'Type',           value: m.label },
                    { label: 'Date & Time',    value: formatDate(receipt.created_at) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{label}</span>
                      <span className="font-semibold text-text-primary">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t border-glass-border">
                  <button onClick={() => setReceipt(null)} className="w-full py-3.5 rounded-2xl bg-bg-secondary font-bold text-sm border border-glass-border">Close</button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
