import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Users, Zap, ChevronDown, Search, Loader2 } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { supabase } from '@/lib/supabase';

export default function AdminEarnings() {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [showDD, setShowDD] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Aggregate from transactions where type = reward/cashback
        const { data } = await supabase
          .from('transactions')
          .select('*, wallets(id, users(email, display_name, role, country))')
          .in('tx_type', ['reward', 'cashback', 'referral_bonus'])
          .order('created_at', { ascending: false })
          .limit(300);
        setEarnings((data || []).map((e: any) => ({
          ...e,
          entityName: e.wallets?.users?.display_name || e.wallets?.users?.email || 'Unknown',
          entityEmail: e.wallets?.users?.email || '',
          entityType: e.wallets?.users?.role || 'user',
          nrtEarned: Number(e.amount || 0),
          cashbackPct: e.tx_type === 'cashback' ? 5 : 0,
          cashbackNrt: e.tx_type === 'cashback' ? Number(e.amount || 0) : 0,
          dataConsumedGb: 0,
          country: e.wallets?.users?.country || 'Global',
          period: e.created_at ? new Date(e.created_at).toLocaleDateString() : 'N/A',
        })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const allCountries = useMemo(() => {
    const uniqueCountries = new Set(earnings.map(e => e.country));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [earnings]);

  const filtered = useMemo(() => earnings.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || (e.entityName || '').toLowerCase().includes(q) || (e.entityEmail || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || e.entityType === typeFilter;
    const matchCountry = countryFilter === 'Global' || e.country === countryFilter;
    return matchQ && matchType && matchCountry;
  }), [earnings, search, typeFilter, countryFilter]);

  const totalNrt = filtered.reduce((s, e) => s + e.nrtEarned, 0);
  const totalCashback = filtered.reduce((s, e) => s + e.cashbackNrt, 0);

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">Earnings & Cashback</h1>
          <p className="text-sm text-text-secondary">SP, ISP, and User revenue overview</p>
        </div>
        {/* Filter Dropdown */}
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
              className="bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
          </div>
          <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
          <div className="relative">
            <button onClick={() => setShowDD(!showDD)}
              className="bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary flex items-center gap-2 min-w-[160px] justify-between h-full">
              {typeFilter === 'All' ? 'All Entity Types' : typeFilter.toUpperCase()} <ChevronDown size={14} className="text-text-secondary" />
            </button>
            <AnimatePresence>
              {showDD && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-2 bg-bg-primary border border-glass-border rounded-xl shadow-2xl max-h-60 overflow-y-auto right-0">
                  {['All', 'sp', 'isp', 'user'].map(t => (
                    <button key={t} onClick={() => { setTypeFilter(t); setShowDD(false); }}
                      className={`w-full text-left px-4 py-3 hover:bg-bg-secondary transition-colors text-sm ${typeFilter === t ? 'text-accent-primary font-bold bg-accent-primary/5' : 'text-text-primary'}`}>
                      {t === 'All' ? 'All Entity Types' : t === 'user' ? 'Standard User' : t.toUpperCase()}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Coins, label: 'Total NRT Earned', value: `${totalNrt.toLocaleString()} NRT`, color: '#8b5cf6', bg: 'bg-purple-500/10' },
          { icon: TrendingUp, label: 'Total Cashback', value: `${totalCashback.toLocaleString()} NRT`, color: '#F59E0B', bg: 'bg-amber-500/10' },
          { icon: Zap, label: 'SP Entities', value: earnings.filter(e => e.entityType === 'sp').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Users, label: 'Users', value: earnings.filter(e => e.entityType === 'user').length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
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

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['Entity', 'Type', 'Data (GB)', 'NRT Earned', 'Cashback %', 'Cashback NRT', 'Country', 'Period'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-text-primary">{e.entityName}</p>
                    <p className="text-xs text-text-secondary">{e.entityEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${e.entityType === 'sp' ? 'bg-green-500/10 text-green-500' : e.entityType === 'isp' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>{e.entityType}</span>
                  </td>
                  <td className="px-4 py-3 font-bold">{e.dataConsumedGb.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-accent-primary">{e.nrtEarned.toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-secondary">{e.cashbackPct > 0 ? `${e.cashbackPct}%` : '—'}</td>
                  <td className="px-4 py-3 font-bold text-amber-400">{e.cashbackNrt > 0 ? e.cashbackNrt.toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{e.country}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{e.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No earnings found for this filter.</div>}
        </div>
      </div>
    </motion.div>
  );
}
