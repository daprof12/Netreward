import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Clock, ShieldCheck, Users, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Loader2,
  Banknote, TrendingUp, XCircle, DollarSign
} from 'lucide-react';
import { adminTreasuryApi } from '@/lib/adminApi';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';

type Tab = 'overview' | 'liquidity' | 'audits';

export default function AdminTreasury() {
  usePageTitle('Admin — Treasury');
  const { showToast } = useToastStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [treasury, setTreasury] = useState<any>(null);
  const [gateways, setGateways] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, g, a, w] = await Promise.all([
        adminTreasuryApi.fetchTreasuryBalance().catch(() => null),
        adminTreasuryApi.fetchGatewayLiquidity().catch(() => []),
        adminTreasuryApi.fetchPayoutAudits(25).catch(() => []),
        adminTreasuryApi.fetchRecentWithdrawals(25).catch(() => []),
      ]);
      setTreasury(t);
      setGateways(g);
      setAudits(a);
      setWithdrawals(w);
    } catch (e: any) {
      showToast('Failed to load treasury data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const nrtBal = treasury?.nrt_balance ?? 0;
  const totalFiat = gateways.reduce((s, g) => s + (g.fiat_balance || 0), 0);
  const pendingW = withdrawals.filter(w => w.status === 'pending').length;
  const processedW = withdrawals.filter(w => w.status === 'processed').length;

  const stats = [
    { label: 'NRT Reserve', value: Number(nrtBal).toLocaleString(undefined, { maximumFractionDigits: 7 }) + ' NRT', icon: Wallet, color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Fiat Liquidity', value: '$' + Number(totalFiat).toLocaleString(undefined, { maximumFractionDigits: 2 }), icon: Banknote, color: 'bg-blue-500/10 text-blue-400' },
    { label: 'Pending Payouts', value: String(pendingW), icon: Clock, color: 'bg-amber-500/10 text-amber-400' },
    { label: 'Processed', value: String(processedW), icon: CheckCircle2, color: 'bg-purple-500/10 text-purple-400' },
  ];

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      success: 'bg-emerald-500/10 text-emerald-400', processed: 'bg-emerald-500/10 text-emerald-400',
      pending: 'bg-amber-500/10 text-amber-400', liquidity_failed: 'bg-red-500/10 text-red-400',
      failed: 'bg-red-500/10 text-red-400', rejected: 'bg-zinc-500/10 text-zinc-400',
      active: 'bg-emerald-500/10 text-emerald-400', inactive: 'bg-zinc-500/10 text-zinc-400',
    };
    return m[s] || 'bg-zinc-500/10 text-zinc-400';
  };

  const fmt = (n: number, d = 2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 7 });
  const fmtDate = (d: string) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-accent-primary" />
            Treasury Management
          </h1>
          <p className="text-sm text-text-secondary mt-1">NRT reserves, fiat liquidity pools, and payout audits</p>
        </div>
        <button onClick={fetchAll} className="p-2 bg-bg-secondary rounded-lg hover:bg-glass-border transition-colors text-text-secondary" title="Refresh">
          {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass p-5 rounded-2xl border border-glass-border">
            <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center mb-3`}>
              <s.icon size={20} />
            </div>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{s.label}</p>
            <h3 className="text-xl font-black text-text-primary mt-1">{loading ? '—' : s.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl w-fit border border-glass-border">
        {(['overview', 'liquidity', 'audits'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? 'bg-accent-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-text-secondary" size={32} /></div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Withdrawals */}
              <div className="lg:col-span-2 bg-bg-card border border-glass-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-glass-border flex items-center justify-between">
                  <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Recent Withdrawal Requests</h2>
                  <span className="text-[10px] text-text-secondary">{withdrawals.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-bg-secondary border-b border-glass-border">
                      {['User', 'NRT', 'Fiat', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-glass-border">
                      {withdrawals.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-text-secondary">No withdrawal requests yet</td></tr>
                      ) : withdrawals.map(w => (
                        <tr key={w.id} className="hover:bg-bg-secondary/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-text-primary font-medium text-xs">{w.users?.display_name || w.users?.email || '—'}</p>
                          </td>
                          <td className="px-4 py-3 font-bold text-text-primary">{fmt(w.amount_nrt)}</td>
                          <td className="px-4 py-3 text-text-secondary">{w.currency} {fmt(w.amount_fiat)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusBadge(w.status)}`}>{w.status}</span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-xs">{fmtDate(w.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sidebar cards */}
              <div className="space-y-4">
                <div className="glass p-5 rounded-2xl border border-glass-border bg-gradient-to-br from-accent-primary/5 to-transparent">
                  <h3 className="text-sm font-black text-text-primary flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-accent-primary" /> Reserve Health
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">NRT Balance</span>
                      <span className="text-text-primary font-bold">{fmt(nrtBal, 0)} NRT</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">Last Updated</span>
                      <span className="text-text-primary font-medium">{fmtDate(treasury?.updated_at)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">Status</span>
                      <span className={`font-bold ${nrtBal > 100000 ? 'text-emerald-400' : nrtBal > 10000 ? 'text-amber-400' : 'text-red-400'}`}>
                        {nrtBal > 100000 ? 'OPTIMAL' : nrtBal > 10000 ? 'LOW' : 'CRITICAL'}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-glass-border">
                      <p className="text-[10px] text-text-secondary uppercase font-bold mb-2">Network</p>
                      <div className="flex items-center justify-between p-2.5 bg-bg-secondary rounded-xl">
                        <span className="text-xs font-mono text-text-secondary">Solana Mainnet-Beta</span>
                        <ExternalLink className="w-3 h-3 text-text-secondary" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass p-5 rounded-2xl border border-glass-border">
                  <h3 className="text-sm font-black text-text-primary flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-400" /> Governance
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    All treasury movements above <span className="text-text-primary font-bold">10,000 NRT</span> require multi-sig approval. Automated payouts route through the gateway liquidity pool.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'liquidity' && (
            <motion.div key="liquidity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-glass-border">
                  <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Gateway Liquidity Pools</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-bg-secondary border-b border-glass-border">
                      {['Provider', 'Currency', 'Fiat Balance', 'Status', 'Last Funded', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-glass-border">
                      {gateways.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-text-secondary">No gateways configured</td></tr>
                      ) : gateways.map(g => (
                        <tr key={g.id} className="hover:bg-bg-secondary/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center border border-glass-border">
                                <DollarSign size={14} className="text-text-secondary" />
                              </div>
                              <span className="font-bold text-text-primary">{g.provider_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-text-secondary">{g.currency}</td>
                          <td className="px-4 py-3 font-bold text-text-primary">{fmt(g.fiat_balance)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusBadge(g.status)}`}>{g.status}</span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-xs">{fmtDate(g.last_funded_at)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={async () => {
                                const newStatus = g.status === 'active' ? 'inactive' : 'active';
                                try {
                                  await adminTreasuryApi.updateGatewayLiquidity(g.id, { status: newStatus });
                                  setGateways(prev => prev.map(x => x.id === g.id ? { ...x, status: newStatus } : x));
                                  showToast(`${g.provider_name} ${newStatus}`, 'success');
                                } catch { showToast('Update failed', 'error'); }
                              }}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${g.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'} transition-colors`}
                            >
                              {g.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'audits' && (
            <motion.div key="audits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-glass-border">
                  <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Payout Audit Trail</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-bg-secondary border-b border-glass-border">
                      {['Reference', 'Gateway', 'Fiat Amount', 'Fee', 'Result', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-glass-border">
                      {audits.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-10 text-text-secondary">No payout audits recorded yet</td></tr>
                      ) : audits.map(a => (
                        <tr key={a.id} className="hover:bg-bg-secondary/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-text-primary">{a.provider_reference || a.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-text-secondary">{a.gateway_liquidity?.provider_name || '—'}</td>
                          <td className="px-4 py-3 font-bold text-text-primary">{fmt(a.amount_fiat)}</td>
                          <td className="px-4 py-3 text-text-secondary">{fmt(a.fee_incurred)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {a.status === 'success' ? <CheckCircle2 size={12} className="text-emerald-400" /> :
                               a.status === 'liquidity_failed' ? <XCircle size={12} className="text-red-400" /> :
                               <AlertCircle size={12} className="text-amber-400" />}
                              <span className={`text-[10px] font-bold uppercase ${statusBadge(a.status)}`}>{a.status?.replace('_', ' ')}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-xs">{fmtDate(a.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
