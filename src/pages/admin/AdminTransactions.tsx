import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowUpRight, ArrowDownLeft, Repeat, Gift, Coins, AlertCircle, ChevronDown, QrCode, Users, Loader2, RefreshCw } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

interface AdminTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  metadata?: any;
  users?: { email: string; country: string | null };
  // Mapped fields for backward compat
  userEmail: string;
  country: string;
  createdAt: string;
  referredUser?: string;
  trader?: string;
  merchant?: string;
  service?: string;
}

const TYPE_COLORS: Record<string, string> = {
  deposit:        '#10B981',
  withdrawal:     '#EF4444',
  p2p:            '#3B82F6',
  reward:         '#6366f1',
  cashback:       '#F59E0B',
  fee:            '#6B7280',
  referral_bonus: '#f97316',
  scan2pay:       '#8b5cf6',
};

const TYPE_ICONS: Record<string, typeof ArrowUpRight> = {
  deposit:        ArrowDownLeft,
  withdrawal:     ArrowUpRight,
  p2p:            Repeat,
  reward:         Gift,
  cashback:       Coins,
  fee:            AlertCircle,
  referral_bonus: Users,
  scan2pay:       QrCode,
};

const TYPE_LABELS: Record<string, string> = {
  deposit:        'Deposit',
  withdrawal:     'Withdrawal',
  p2p:            'P2P',
  reward:         'Reward',
  cashback:       'Cashback',
  fee:            'Fee',
  referral_bonus: 'Referral Bonus',
  scan2pay:       'Scan2Pay',
};

const STATUS_COLORS: Record<string, string> = { completed: '#10B981', pending: '#F59E0B', failed: '#EF4444', rejected: '#6B7280', cancelled: '#6B7280' };

function Badge({ label, color }: { label: string; color: string }) {
  return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase capitalize" style={{ backgroundColor: `${color}20`, color }}>{label}</span>;
}

export default function AdminTransactions() {
  usePageTitle('Admin — Transactions');
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [showTypeDD, setShowTypeDD] = useState(false);
  const [showStatusDD, setShowStatusDD] = useState(false);
  const [receipt, setReceipt] = useState<AdminTransaction | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, wallets(id, users(email, country, role, display_name, sp_profiles(company_name), isp_profiles(isp_name)))')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setTransactions((data || []).map((t: any) => {
        const u = t.wallets?.users || {};
        const isSp = u.role === 'sp';
        const isIsp = u.role === 'isp';
        const spName = Array.isArray(u.sp_profiles) ? u.sp_profiles[0]?.company_name : u.sp_profiles?.company_name;
        const ispName = Array.isArray(u.isp_profiles) ? u.isp_profiles[0]?.isp_name : u.isp_profiles?.isp_name;
        const userEmail = isSp ? (spName || u.email) : isIsp ? (ispName || u.email) : (u.email || 'Unknown');

        return {
          ...t,
          amount: Number(t.amount || 0),
          type: t.tx_type || t.type,
          userEmail: userEmail,
          country: u.country || 'Global',
          createdAt: t.created_at,
          currency: t.currency || 'NRT',
        };
      }));
    } catch (e: any) { console.error('Fetch transactions:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allCountries = useMemo(() => {
    const uniqueCountries = new Set(transactions.map(t => t.country));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [transactions]);

  const filtered = useMemo(() => transactions.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || t.userEmail.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || t.type === typeFilter;
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchCountry = countryFilter === 'Global' || t.country === countryFilter;
    return matchQ && matchType && matchStatus && matchCountry;
  }), [transactions, search, typeFilter, statusFilter, countryFilter]);

  const totalNrt = filtered.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Transactions</h1>
        <p className="text-sm text-text-secondary">{filtered.length} records · {totalNrt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} NRT total</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Coins, label: 'Total Volume', value: `${totalNrt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} NRT`, color: '#8b5cf6', bg: 'bg-purple-500/10' },
          { icon: ArrowDownLeft, label: 'Deposits', value: transactions.filter(t => t.type === 'deposit').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: ArrowUpRight, label: 'Withdrawals', value: transactions.filter(t => t.type === 'withdrawal').length.toString(), color: '#EF4444', bg: 'bg-red-500/10' },
          { icon: AlertCircle, label: 'Pending', value: transactions.filter(t => t.status === 'pending').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
            <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-xs text-text-secondary font-medium">{label}</p>
            <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email or ID..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        {/* Country Filter */}
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
        {/* Type Dropdown */}
        <div className="relative">
          <button onClick={() => { setShowTypeDD(!showTypeDD); setShowStatusDD(false); }}
            className="bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary flex items-center gap-2 min-w-[140px] justify-between">
            {typeFilter === 'All' ? 'All Types' : typeFilter} <ChevronDown size={14} className="text-text-secondary" />
          </button>
          <AnimatePresence>
            {showTypeDD && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-2 bg-bg-primary border border-glass-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                {['All', 'deposit', 'withdrawal', 'p2p', 'reward', 'cashback', 'referral_bonus', 'scan2pay', 'fee'].map(t => (
                  <button key={t} onClick={() => { setTypeFilter(t); setShowTypeDD(false); }}
                    className={`w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors text-sm ${typeFilter === t ? 'text-accent-primary font-bold bg-accent-primary/5' : 'text-text-primary'}`}>
                    {t === 'All' ? 'All Types' : (TYPE_LABELS[t] ?? t)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Status Dropdown */}
        <div className="relative">
          <button onClick={() => { setShowStatusDD(!showStatusDD); setShowTypeDD(false); }}
            className="bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary flex items-center gap-2 min-w-[140px] justify-between">
            {statusFilter === 'All' ? 'All Statuses' : statusFilter} <ChevronDown size={14} className="text-text-secondary" />
          </button>
          <AnimatePresence>
            {showStatusDD && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-2 bg-bg-primary border border-glass-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                {['All', 'completed', 'pending', 'failed', 'rejected', 'cancelled'].map(s => (
                  <button key={s} onClick={() => { setStatusFilter(s); setShowStatusDD(false); }}
                    className={`w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors capitalize text-sm ${statusFilter === s ? 'text-accent-primary font-bold bg-accent-primary/5' : 'text-text-primary'}`}>
                    {s === 'All' ? 'All Statuses' : s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['ID', 'User', 'Type', 'Amount', 'Country', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(t => (
                <tr key={t.id} onClick={() => setReceipt(t)} className="hover:bg-bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{t.id}</td>
                  <td className="px-4 py-3 text-text-primary">{t.userEmail}</td>
                  <td className="px-4 py-3"><Badge label={TYPE_LABELS[t.type] ?? t.type} color={TYPE_COLORS[t.type] ?? '#6B7280'} /></td>
                  <td className="px-4 py-3 font-bold">{Number(t.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {t.currency}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.country}</td>
                  <td className="px-4 py-3"><Badge label={t.status} color={STATUS_COLORS[t.status]} /></td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No transactions found.</div>}
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {receipt && (() => {
          const Icon = TYPE_ICONS[receipt.type] || Coins;
          const color = TYPE_COLORS[receipt.type];
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setReceipt(null)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 flex flex-col items-center border-b border-glass-border">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${color}20` }}>
                    <Icon size={32} style={{ color }} />
                  </div>
                  <h3 className="text-2xl font-black">{Number(receipt.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {receipt.currency}</h3>
                  <p className="text-sm text-text-secondary mt-1">{TYPE_LABELS[receipt.type] ?? receipt.type} Transaction</p>
                  <div className="mt-2"><Badge label={receipt.status} color={STATUS_COLORS[receipt.status]} /></div>
                </div>

                <div className="p-5 space-y-3">
                  {[
                    { label: 'Transaction ID', value: receipt.id },
                    { label: 'User',           value: receipt.userEmail },
                    { label: 'Type',           value: TYPE_LABELS[receipt.type] ?? receipt.type },
                    { label: 'Amount',         value: `${Number(receipt.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${receipt.currency}` },
                    { label: 'Country',        value: receipt.country },
                    { label: 'Status',         value: receipt.status },
                    { label: 'Date & Time',    value: new Date(receipt.createdAt).toLocaleString() },
                    ...(receipt.referredUser ? [{ label: 'Referred User', value: receipt.referredUser }] : []),
                    ...(receipt.trader       ? [{ label: 'Counterpart',   value: receipt.trader }]       : []),
                    ...(receipt.merchant     ? [{ label: 'Merchant',      value: receipt.merchant }]     : []),
                    ...(receipt.service      ? [{ label: 'Service',       value: receipt.service }]      : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-text-secondary">{label}</span>
                      <span className="font-semibold text-text-primary capitalize">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-glass-border">
                  <button onClick={() => setReceipt(null)} className="w-full py-2.5 rounded-xl bg-bg-secondary font-bold text-sm border border-glass-border hover:bg-glass-border transition-colors">Close</button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
