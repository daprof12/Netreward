import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Layers, CheckCircle2, XCircle, Trash2, Eye, Globe, Smartphone, Play, Info, X, ShieldAlert, AlertCircle, Loader2, RefreshCw, Gamepad2, Terminal } from 'lucide-react';
import { adminServiceApi } from '@/lib/adminApi';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PlatformLogo } from '@/components/ui/PlatformLogos';
export default function AdminServices() {
  usePageTitle('Admin — Services');
  const { showToast } = useToastStore();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await adminServiceApi.fetchAll();
      setServices(data || []);
    } catch (e: any) {
      console.error('Fetch services:', e);
      showToast('Failed to fetch services', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const allCountries = useMemo(() => {
    const countries = services.map(s => s.country).filter(Boolean);
    return ['All', ...Array.from(new Set(countries)).sort()];
  }, [services]);

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.provider_name.toLowerCase().includes(q);
    const matchCountry = countryFilter === 'All' || (s.country || 'Unknown') === countryFilter;
    return matchQ && matchCountry;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service? This will affect attached campaigns.')) return;
    try {
      // For now we'll use a direct delete until adminServiceApi has a delete method
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      setServices(prev => prev.filter(s => s.id !== id));
      showToast('Service deleted.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Delete failed', 'error');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('services').update({ 
        status, 
        verified: status === 'active' 
      }).eq('id', id);
      if (error) throw error;
      
      setServices(prev => prev.map(s => s.id === id ? { ...s, status, verified: status === 'active' } : s));
      showToast(`Service status updated to ${status.replace('_', ' ')}.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Update failed', 'error');
    }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">Services</h1>
          <p className="text-sm text-text-secondary">Manage registered Service Provider APIs & Integration</p>
        </div>
        <button 
          onClick={fetchData} 
          className="p-2 bg-bg-secondary rounded-lg hover:bg-glass-border transition-colors text-text-secondary"
          title="Refresh Data"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Layers, label: 'Total', value: services.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: CheckCircle2, label: 'Active', value: services.filter(s => s.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: AlertCircle, label: 'Pending', value: services.filter(s => s.status === 'pending_verification' || !s.status).length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
          { icon: ShieldAlert, label: 'Suspended', value: services.filter(s => s.status === 'suspended').length.toString(), color: '#EF4444', bg: 'bg-red-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
            <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center mb-2`}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{label}</p>
            <h3 className="text-lg font-bold text-text-primary mt-0.5">{value}</h3>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..."
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

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['Service', 'Provider', 'Category', 'Country', 'Status', 'Integration', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading...</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold uppercase">{s.name[0]}</div>
                      )}
                      <div>
                        <p className="font-bold text-text-primary">{s.name}</p>
                        <p className="text-[10px] text-text-secondary font-mono truncate max-w-[120px]">{s.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary font-medium">{s.provider_name}</td>
                  <td className="px-4 py-3 text-text-secondary">{s.category}</td>
                  <td className="px-4 py-3 text-text-secondary">{s.country || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      s.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                      s.status === 'suspended' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {(s.status || 'pending').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.web_url && <Globe size={12} className="text-accent-primary" title="Web" />}
                      {s.android_url && <Smartphone size={12} className="text-[#3DDC84]" title="Android" />}
                      {s.ios_url && <Play size={12} className="text-[#007AFF]" title="iOS" />}
                      {s.webhook_url && <Terminal size={12} className="text-orange-400" title="Webhook" />}
                      {s.playstation_url && <div className="text-[#003791]" title="PlayStation"><PlatformLogo platform="playstation" size={12} /></div>}
                      {s.xbox_url && <div className="text-[#107C10]" title="Xbox"><PlatformLogo platform="xbox" size={12} /></div>}
                      {s.steam_url && <div className="text-[#1B2838]" title="Steam"><PlatformLogo platform="steam" size={12} /></div>}
                      {s.oculus_url && <div className="text-[#8B5CF6]" title="Oculus VR"><PlatformLogo platform="oculus_vr" size={12} /></div>}
                      {s.nintendo_url && <div className="text-[#E60012]" title="Nintendo Switch"><PlatformLogo platform="nintendo_switch" size={12} /></div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setSelectedService(s)} className="p-1.5 text-accent-primary hover:bg-accent-primary/10 rounded-lg" title="View Details"><Eye size={16} /></button>
                      
                      <select 
                        value={s.status || 'pending_verification'}
                        onChange={(e) => updateStatus(s.id, e.target.value)}
                        className="bg-bg-secondary border border-glass-border rounded-lg px-2 py-1 text-[10px] font-bold outline-none cursor-pointer"
                      >
                        <option value="pending_verification">Pending</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspend</option>
                      </select>

                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No services found.</div>}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-card border border-glass-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-glass-border flex justify-between items-center bg-bg-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center overflow-hidden">
                    {selectedService.logo_url ? <img src={selectedService.logo_url} className="w-full h-full object-cover" /> : <div className="text-accent-primary font-bold text-xl uppercase">{selectedService.name[0]}</div>}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{selectedService.name}</h3>
                    <p className="text-xs text-text-secondary">{selectedService.category} Service • Provided by {selectedService.provider_name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedService(null)} className="p-2 bg-bg-secondary rounded-full hover:bg-glass-border transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* API Key */}
                {selectedService.api_key && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <ShieldAlert size={14} className="text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">API Key</span>
                    </div>
                    <div className="p-4 bg-bg-secondary/80 border border-glass-border rounded-xl font-mono text-xs text-text-primary break-all select-all shadow-inner">
                      {selectedService.api_key}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedService.description && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Info size={14} className="text-accent-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent-primary/80">Description</span>
                    </div>
                    <div className="p-4 bg-bg-secondary/40 border border-glass-border rounded-xl">
                      <p className="text-sm text-text-primary leading-relaxed">{selectedService.description}</p>
                    </div>
                  </div>
                )}

                {/* Integration Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { icon: Globe, label: 'Web Platform', url: selectedService.web_url, color: 'text-accent-primary' },
                    { icon: Smartphone, label: 'Android App', url: selectedService.android_url, color: 'text-[#3DDC84]' },
                    { icon: Play, label: 'iOS App', url: selectedService.ios_url, color: 'text-[#007AFF]' },
                    { icon: Terminal, label: 'Webhook URL', url: selectedService.webhook_url, color: 'text-orange-400' },
                    { icon: (p:any) => <PlatformLogo platform="playstation" {...p} />, label: 'PlayStation', url: selectedService.playstation_url, color: 'text-[#003791]' },
                    { icon: (p:any) => <PlatformLogo platform="xbox" {...p} />, label: 'Xbox', url: selectedService.xbox_url, color: 'text-[#107C10]' },
                    { icon: (p:any) => <PlatformLogo platform="steam" {...p} />, label: 'Steam', url: selectedService.steam_url, color: 'text-[#1B2838]' },
                    { icon: (p:any) => <PlatformLogo platform="oculus_vr" {...p} />, label: 'Oculus VR', url: selectedService.oculus_url, color: 'text-[#8B5CF6]' },
                    { icon: (p:any) => <PlatformLogo platform="nintendo_switch" {...p} />, label: 'Nintendo Switch', url: selectedService.nintendo_url, color: 'text-[#E60012]' },
                  ].map((item, i) => item.url && (
                    <div key={i} className="p-4 bg-bg-secondary/50 rounded-2xl border border-glass-border space-y-3">
                      <div className="flex items-center gap-2">
                        <item.icon size={16} className={item.color} />
                        <span className="text-[11px] font-bold text-text-primary">{item.label}</span>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-text-secondary uppercase tracking-tighter mb-0.5">URL</p>
                        <p className="text-xs text-accent-primary truncate font-mono">{item.url}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-glass-border">
                  <div>
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Status</p>
                    <p className="text-sm font-bold text-text-primary capitalize">{(selectedService.status || 'pending').replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Added On</p>
                    <p className="text-sm font-bold text-text-primary">{new Date(selectedService.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-bg-secondary/30 border-t border-glass-border flex gap-3">
                <button onClick={() => setSelectedService(null)} className="flex-1 py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border">Close</button>
                {selectedService.status !== 'active' && (
                  <button onClick={() => { updateStatus(selectedService.id, 'active'); setSelectedService(null); }} className="flex-1 py-3 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20">Approve Service</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
