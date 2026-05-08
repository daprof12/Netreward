import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Network, CheckCircle2, XCircle, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { adminNetworkApi } from '@/lib/adminApi';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AdminNetworks() {
  usePageTitle('Admin — Networks');
  const { showToast } = useToastStore();
  const [networks, setNetworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await adminNetworkApi.fetchAll();
      setNetworks(data || []);
    } catch (e: any) {
      console.error('Fetch networks:', e);
      showToast('Failed to fetch networks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const allCountries = useMemo(() => {
    const countries = networks.map(n => n.country).filter(Boolean);
    return ['All', ...Array.from(new Set(countries)).sort()];
  }, [networks]);

  const filtered = networks.filter(n => {
    const q = search.toLowerCase();
    const matchQ = !q || n.name.toLowerCase().includes(q) || n.category.toLowerCase().includes(q) || n.provider_name.toLowerCase().includes(q);
    const matchCountry = countryFilter === 'All' || (n.country || 'Unknown') === countryFilter;
    return matchQ && matchCountry;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this network? This will affect ISP campaigns.')) return;
    try {
      const { error } = await supabase.from('networks').delete().eq('id', id);
      if (error) throw error;
      setNetworks(prev => prev.filter(n => n.id !== id));
      showToast('Network deleted.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Delete failed', 'error');
    }
  };

  const updateVerification = async (id: string, verified: boolean) => {
    try {
      const { error } = await supabase.from('networks').update({ verified }).eq('id', id);
      if (error) throw error;
      setNetworks(prev => prev.map(n => n.id === id ? { ...n, verified } : n));
      showToast(verified ? 'Network verified.' : 'Network unverified.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Update failed', 'error');
    }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">Networks</h1>
          <p className="text-sm text-text-secondary">Manage registered ISP Networks</p>
        </div>
        <button 
          onClick={fetchData} 
          className="p-2 bg-bg-secondary rounded-lg hover:bg-glass-border transition-colors text-text-secondary"
          title="Refresh Data"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Network, label: 'Total Networks', value: networks.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: CheckCircle2, label: 'Verified', value: networks.filter(n => n.verified).length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: XCircle, label: 'Pending', value: networks.filter(n => !n.verified).length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass p-5 rounded-2xl border border-glass-border">
            <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{label}</p>
            <h3 className="text-2xl font-black text-text-primary mt-1">{value}</h3>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search networks..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <select 
          value={countryFilter} 
          onChange={e => setCountryFilter(e.target.value)}
          className="bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer"
        >
          {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['Network', 'ISP / Provider', 'Category', 'Country', 'Status', 'Date Added', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading...</td></tr>
              ) : filtered.map(n => (
                <tr key={n.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {n.logo_url ? (
                        <img src={n.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><Network size={16} /></div>
                      )}
                      <span className="font-semibold text-text-primary">{n.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary font-medium">{n.provider_name}</td>
                  <td className="px-4 py-3 text-text-secondary">{n.category}</td>
                  <td className="px-4 py-3 text-text-secondary">{n.country || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${n.verified ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>{n.verified ? 'verified' : 'pending'}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(n.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {!n.verified ? (
                        <button onClick={() => updateVerification(n.id, true)} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg" title="Verify Network"><CheckCircle2 size={16} /></button>
                      ) : (
                        <button onClick={() => updateVerification(n.id, false)} className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg" title="Unverify Network"><XCircle size={16} /></button>
                      )}
                      <button onClick={() => handleDelete(n.id)} className="p-1.5 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No networks found.</div>}
        </div>
      </div>
    </motion.div>
  );
}
