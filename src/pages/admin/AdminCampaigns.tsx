import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Play, Pause, Trash2, Target, Activity, Coins, RefreshCw, Loader2 } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { adminCampaignApi } from '@/lib/adminApi';
import MapSelectionModal from '@/components/MapSelectionModal';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AdminCampaigns() {
  usePageTitle('Admin — Campaigns');
  const { showToast } = useToastStore();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [viewMapLocations, setViewMapLocations] = useState<any[] | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminCampaignApi.fetchAll();
      setCampaigns(data || []);
    } catch (e: any) { 
      console.error('Fetch campaigns:', e); 
      showToast('Failed to fetch campaigns', 'error');
    } finally { 
      setLoading(false); 
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allCountries = useMemo(() => {
    const countries = campaigns.map(c => c.country).filter(Boolean);
    return ['All', ...Array.from(new Set(countries)).sort()];
  }, [campaigns]);

  const filtered = campaigns.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || 
      (c.title || '').toLowerCase().includes(q) || 
      (c.creator_name || '').toLowerCase().includes(q) || 
      (c.display_service || '').toLowerCase().includes(q);
    
    const matchCountry = countryFilter === 'All' || (c.country || '').includes(countryFilter);
    
    return matchQ && matchCountry;
  });

  const updateStatus = async (id: string, status: string) => {
    try {
      await adminCampaignApi.updateCampaign(id, { status });
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      showToast(`Campaign ${status}`, 'success');
    } catch (e: any) { 
      showToast(e.message || 'Update failed', 'error'); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await adminCampaignApi.deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      showToast('Campaign deleted.', 'success');
    } catch (e: any) { 
      showToast(e.message || 'Delete failed', 'error'); 
    }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">Campaigns</h1>
          <p className="text-sm text-text-secondary">Manage SP and ISP campaigns</p>
        </div>
        <button 
          onClick={fetchData} 
          className="p-2 bg-bg-secondary rounded-lg hover:bg-glass-border transition-colors text-text-secondary"
          title="Refresh Data"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, label: 'Total Campaigns', value: campaigns.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: Activity, label: 'Active', value: campaigns.filter(c => c.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Pause, label: 'Paused', value: campaigns.filter(c => c.status === 'paused').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
          { icon: Coins, label: 'Total Budget', value: `${(campaigns.reduce((s, c) => s + (c.total_budget || 0), 0) / 1000).toFixed(1)}K`, color: '#8b5cf6', bg: 'bg-purple-500/10' },
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, owner, or service..."
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
                {['Campaign', 'Provider', 'Service', 'Budget', 'Spent', 'Status', 'Locations', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading...</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-text-primary">{c.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center overflow-hidden border border-glass-border">
                        {c.creator_logo ? (
                          <img src={c.creator_logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Target size={14} className="text-text-secondary" />
                        )}
                      </div>
                      <div>
                        <p className="text-text-primary font-bold text-xs">{c.creator_name}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${c.sp_id ? 'text-green-400' : 'text-blue-400'}`}>{c.sp_id ? 'SP' : 'ISP'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-text-primary font-medium">{c.display_service}</p>
                  </td>
                  <td className="px-4 py-3 font-bold">{(c.total_budget || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-secondary">{(c.budget_spent || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${c.status === 'active' ? 'bg-green-500/10 text-green-500' : c.status === 'paused' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-500/10 text-gray-400'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.target_locations && c.target_locations.length > 0 ? (
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-xs text-text-secondary">{c.target_locations.length} points defined</span>
                        <button 
                          onClick={() => setViewMapLocations(c.target_locations)}
                          className="text-[10px] font-bold text-accent-primary hover:underline"
                        >
                          View Map
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary italic">{c.country || 'Global'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.status === 'active' ? (
                        <button onClick={() => updateStatus(c.id, 'paused')} className="p-1.5 text-text-secondary hover:text-amber-500 bg-bg-secondary rounded-lg"><Pause size={14} /></button>
                      ) : (
                        <button onClick={() => updateStatus(c.id, 'active')} className="p-1.5 text-text-secondary hover:text-green-500 bg-bg-secondary rounded-lg"><Play size={14} /></button>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-text-secondary hover:text-destructive bg-bg-secondary rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No campaigns found.</div>}
        </div>
      </div>

      <MapSelectionModal 
        isOpen={!!viewMapLocations} 
        onClose={() => setViewMapLocations(null)} 
        onSave={() => {}} 
        initialLocations={viewMapLocations || []}
        readOnly
      />
    </motion.div>
  );
}
