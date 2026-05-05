import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Gift, Coins, Clock, RefreshCw } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { supabase } from '@/lib/supabase';

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReferrals((data || []).map((r: any) => ({
        ...r,
        referrerEmail: r.referrer_email || r.referrer_id || 'Unknown',
        referredEmail: r.referred_email || r.referred_id || 'Unknown',
        nrtReward: Number(r.reward_amount || r.nrt_reward || 0),
        country: r.country || 'Global',
        createdAt: r.created_at,
      })));
    } catch (e: any) { console.error('Fetch referrals:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allCountries = useMemo(() => {
    const uniqueCountries = new Set(referrals.map(r => r.country));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [referrals]);

  const filtered = referrals.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || (r.referrerEmail || '').toLowerCase().includes(q) || (r.referredEmail || '').toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || r.country === countryFilter;
    return matchQ && matchCountry;
  });

  const totalRewarded = referrals.filter(r => r.status === 'rewarded').reduce((s, r) => s + r.nrtReward, 0);

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Referrals</h1>
        <p className="text-sm text-text-secondary">View referral tree and rewarded NRT</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Referrals', value: referrals.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: Gift, label: 'Rewarded', value: referrals.filter(r => r.status === 'rewarded').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Clock, label: 'Pending', value: referrals.filter(r => r.status === 'pending').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
          { icon: Coins, label: 'Total NRT Rewarded', value: totalRewarded.toString(), color: '#8b5cf6', bg: 'bg-purple-500/10' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by referrer or referred email..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['Referrer', 'Referred', 'Status', 'Reward (NRT)', 'Country', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-text-primary">{r.referrerEmail}</td>
                  <td className="px-4 py-3 text-text-primary">{r.referredEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${r.status === 'rewarded' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-accent-primary">{r.nrtReward > 0 ? `${r.nrtReward} NRT` : '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.country}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No referrals found.</div>}
        </div>
      </div>
    </motion.div>
  );
}
