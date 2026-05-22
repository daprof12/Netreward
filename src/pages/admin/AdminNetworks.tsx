import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Network, CheckCircle2, XCircle, Trash2, RefreshCw, Loader2, Eye, X, Globe, Terminal, ShieldAlert, Info } from 'lucide-react';
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
  const [selectedNetwork, setSelectedNetwork] = useState<any | null>(null);

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
                      <button onClick={() => setSelectedNetwork(n)} className="p-1.5 text-accent-primary hover:bg-accent-primary/10 rounded-lg" title="View Details"><Eye size={16} /></button>
                      {!n.verified ? (
                        <button onClick={() => updateVerification(n.id, true)} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg" title="Verify Network"><CheckCircle2 size={16} /></button>
                      ) : (
                        <button onClick={() => updateVerification(n.id, false)} className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg" title="Unverify Network"><XCircle size={16} /></button>
                      )}
                      <button onClick={() => handleDelete(n.id)} className="p-1.5 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No networks found.</div>}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedNetwork && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-glass-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-glass-border flex justify-between items-center bg-bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center overflow-hidden">
                    {selectedNetwork.logo_url ? <img src={selectedNetwork.logo_url} className="w-full h-full object-cover" /> : <Network size={24} className="text-blue-500" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{selectedNetwork.name}</h3>
                    <p className="text-xs text-text-secondary">{selectedNetwork.category} Network • Provided by {selectedNetwork.provider_name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedNetwork(null)} className="p-2 bg-bg-secondary rounded-full hover:bg-glass-border transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* API Key */}
                {selectedNetwork.api_key && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <ShieldAlert size={14} className="text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">API Key</span>
                    </div>
                    <div className="p-4 bg-bg-secondary/80 border border-glass-border rounded-xl font-mono text-xs text-text-primary break-all select-all shadow-inner">
                      {selectedNetwork.api_key}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedNetwork.description && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Info size={14} className="text-blue-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/80">Description</span>
                    </div>
                    <div className="p-4 bg-bg-secondary/40 border border-glass-border rounded-xl">
                      <p className="text-sm text-text-primary leading-relaxed">{selectedNetwork.description}</p>
                    </div>
                  </div>
                )}

                {/* Integration Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { icon: Globe, label: 'ASN', value: selectedNetwork.asn, color: 'text-blue-500' },
                    { icon: Globe, label: 'IP Range', value: selectedNetwork.ip_range, color: 'text-indigo-400' },
                    { icon: Terminal, label: 'Webhook URL', value: selectedNetwork.webhook_url, color: 'text-orange-400' },
                  ].map((item, i) => item.value && (
                    <div key={i} className="p-4 bg-bg-secondary/50 rounded-2xl border border-glass-border space-y-3">
                      <div className="flex items-center gap-2">
                        <item.icon size={16} className={item.color} />
                        <span className="text-[11px] font-bold text-text-primary">{item.label}</span>
                      </div>
                      <div className="p-2 bg-bg-secondary border border-glass-border rounded-lg">
                        <p className="text-sm text-text-primary truncate font-mono">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-glass-border">
                  <div>
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Status</p>
                    <p className="text-sm font-bold text-text-primary capitalize">{selectedNetwork.verified ? 'Verified' : 'Pending'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Added On</p>
                    <p className="text-sm font-bold text-text-primary">{new Date(selectedNetwork.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-bg-secondary/30 border-t border-glass-border flex gap-3">
                <button onClick={() => setSelectedNetwork(null)} className="flex-1 py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border">Close</button>
                {!selectedNetwork.verified && (
                  <button onClick={() => { updateVerification(selectedNetwork.id, true); setSelectedNetwork(null); }} className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20">Verify Network</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
