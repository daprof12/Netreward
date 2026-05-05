import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, DollarSign, Users, Loader2 } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AdminCheckout() {
  usePageTitle('Admin — Checkout');
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [receipt, setReceipt] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('scan2pay_sessions').select('*').order('created_at', { ascending: false });
        setCheckouts((data || []).map((c: any) => ({
          ...c,
          spEmail: c.sp_email || c.merchant_email || 'Unknown',
          userEmail: c.user_email || c.payer_email || 'Unknown',
          serviceName: c.service_name || c.description || '',
          nrtAmount: Number(c.nrt_amount || c.amount || 0),
          usdValue: Number(c.usd_value || c.fiat_amount || 0),
          country: c.country || 'Global',
          createdAt: c.created_at,
        })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const allCountries = useMemo(() => {
    const uniqueCountries = new Set(checkouts.map(c => c.country));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [checkouts]);

  const filtered = useMemo(() => checkouts.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || (c.spEmail || '').toLowerCase().includes(q) || (c.userEmail || '').toLowerCase().includes(q) || (c.serviceName || '').toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || c.country === countryFilter;
    return matchQ && matchCountry;
  }), [checkouts, search, countryFilter]);

  const totalNrt = filtered.reduce((s, c) => s + c.nrtAmount, 0);
  const totalUsd = filtered.reduce((s, c) => s + c.usdValue, 0);

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Checkout (SP Platform)</h1>
        <p className="text-sm text-text-secondary">{filtered.length} checkouts · {totalNrt} NRT · ${totalUsd.toFixed(3)} USD</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: ShoppingCart, label: 'Total Checkouts', value: filtered.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: DollarSign, label: 'Total NRT', value: `${totalNrt} NRT`, color: '#8b5cf6', bg: 'bg-purple-500/10' },
          { icon: Users, label: 'USD Value', value: `$${totalUsd.toFixed(3)}`, color: '#10B981', bg: 'bg-emerald-500/10' },
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

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by SP, user, or service..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['SP Email', 'Service', 'User', 'NRT', 'USD Value', 'Country', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(c => (
                <tr key={c.id} onClick={() => setReceipt(c)} className="hover:bg-bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-text-primary">{c.spEmail}</td>
                  <td className="px-4 py-3 font-semibold">{c.serviceName}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.userEmail}</td>
                  <td className="px-4 py-3 font-bold text-accent-primary">{c.nrtAmount} NRT</td>
                  <td className="px-4 py-3 text-text-secondary">${c.usdValue.toFixed(3)}</td>
                  <td className="px-4 py-3 text-text-secondary">{c.country}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${c.status === 'completed' ? 'bg-green-500/10 text-green-500' : c.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No checkout records found.</div>}
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {receipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setReceipt(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              
              <div className="p-6 flex flex-col items-center border-b border-glass-border">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                  <ShoppingCart size={32} className="text-blue-500" />
                </div>
                <h3 className="text-2xl font-black">{receipt.nrtAmount} NRT</h3>
                <p className="text-sm text-text-secondary mt-1">Checkout Receipt</p>
                <span className={`mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${receipt.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>{receipt.status}</span>
              </div>

              <div className="p-5 space-y-3">
                {[
                  { label: 'Checkout ID', value: receipt.id },
                  { label: 'Service', value: receipt.serviceName },
                  { label: 'SP', value: receipt.spEmail },
                  { label: 'User', value: receipt.userEmail },
                  { label: 'NRT Amount', value: `${receipt.nrtAmount} NRT` },
                  { label: 'USD Value', value: `$${receipt.usdValue.toFixed(3)}` },
                  { label: 'Country', value: receipt.country },
                  { label: 'Date & Time', value: new Date(receipt.createdAt).toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{label}</span>
                    <span className="font-semibold text-text-primary">{value}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-glass-border">
                <button onClick={() => setReceipt(null)} className="w-full py-2.5 rounded-xl bg-bg-secondary font-bold text-sm border border-glass-border hover:bg-glass-border transition-colors">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
