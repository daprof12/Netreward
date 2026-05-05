import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, X, Users, Coins, Activity, Plus, Upload, ImageIcon, Search, Loader2, RefreshCw } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { exchangerApi, type DbExchanger } from '@/lib/adminApi';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';

const STATUS_COLORS: Record<string, string> = { verified: '#10B981', pending: '#F59E0B', suspended: '#EF4444' };

const EMPTY_FORM = {
  name: '', email: '', country: '', volume_24h: 0, rating: 5, trading_limit: 10000,
  status: 'pending' as const, logo_url: '', website_url: '', description: '', badge: '', badge_color: ''
};

export default function AdminExchangers() {
  const { showToast } = useToastStore();
  const [exchangers, setExchangers] = useState<DbExchanger[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEx, setEditEx] = useState<DbExchanger | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await exchangerApi.fetchAll();
      setExchangers(data);
    } catch (e: any) { console.error('Fetch exchangers:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allCountries = useMemo(() => {
    const c = new Set(exchangers.map(ex => ex.country));
    return ['All', ...Array.from(c).sort()];
  }, [exchangers]);

  const filtered = useMemo(() => exchangers.filter(ex => {
    const q = search.toLowerCase();
    const matchQ = !q || ex.name.toLowerCase().includes(q) || (ex.email || '').toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || ex.country === countryFilter;
    return matchQ && matchCountry;
  }), [exchangers, search, countryFilter]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isCreating) {
        const { name, email, country, volume_24h, rating, trading_limit, status, logo_url, website_url, description, badge, badge_color } = form;
        const created = await exchangerApi.create({ name, email, country, volume_24h, rating, trading_limit, status, logo_url, website_url, description, badge, badge_color, updated_at: new Date().toISOString() });
        setExchangers(prev => [created, ...prev]);
        showToast('Exchanger added successfully.', 'success');
        setIsCreating(false);
        setForm(EMPTY_FORM);
      } else if (editEx) {
        await exchangerApi.update(editEx.id, editEx);
        setExchangers(prev => prev.map(e => e.id === editEx.id ? editEx : e));
        showToast('Exchanger updated.', 'success');
        setEditEx(null);
      }
    } catch (e: any) {
      showToast(e.message || 'Operation failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (ex: DbExchanger) => {
    if (!confirm(`Remove exchanger "${ex.name}"?`)) return;
    try {
      await exchangerApi.delete(ex.id);
      setExchangers(prev => prev.filter(e => e.id !== ex.id));
      showToast('Exchanger removed.', 'success');
    } catch (e: any) { showToast(e.message || 'Delete failed', 'error'); }
  };

  const handleStatusChange = async (ex: DbExchanger, newStatus: string) => {
    try {
      await exchangerApi.update(ex.id, { status: newStatus as any });
      setExchangers(prev => prev.map(e => e.id === ex.id ? { ...e, status: newStatus as any } : e));
      showToast(`Exchanger ${newStatus}.`, 'success');
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const ext = file.name.split('.').pop();
      const path = `exchanger-logos/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(path);
      return urlData.publicUrl;
    } catch (e: any) { showToast('Logo upload failed', 'error'); return null; }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Exchangers</h1>
          <p className="text-sm text-text-secondary">Manage verified exchanger accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 bg-bg-secondary border border-glass-border rounded-xl hover:bg-glass-bg transition-colors" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setIsCreating(true); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-opacity"
          >
            <Plus size={18} /> Add Exchanger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Total Exchangers', value: exchangers.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: Activity, label: 'Verified', value: exchangers.filter(e => e.status === 'verified').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Coins, label: '24H Volume', value: `${(exchangers.reduce((s, e) => s + Number(e.volume_24h || 0), 0) / 1000).toFixed(0)}K`, color: '#8b5cf6', bg: 'bg-purple-500/10' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-accent-primary" size={32} /></div>
      ) : (
        <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border bg-bg-secondary">
                  {['Exchanger', 'Country', 'Volume (24H)', 'Trade Limit', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {filtered.map(ex => (
                  <tr key={ex.id} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-lg shadow-sm border border-glass-border overflow-hidden">
                          {ex.logo_url ? <img src={ex.logo_url} className="w-full h-full object-cover" alt="" /> : '🏛️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-text-primary">{ex.name}</p>
                            {ex.badge && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${ex.badge_color}`}>{ex.badge}</span>}
                          </div>
                          <p className="text-xs text-text-secondary">{ex.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{ex.country}</td>
                    <td className="px-4 py-3 font-bold text-accent-primary">{Number(ex.volume_24h).toLocaleString()} NRT</td>
                    <td className="px-4 py-3 text-text-secondary">{Number(ex.trading_limit).toLocaleString()} NRT</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase capitalize" style={{ backgroundColor: `${STATUS_COLORS[ex.status]}20`, color: STATUS_COLORS[ex.status] }}>{ex.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {ex.status === 'pending' && (
                          <button onClick={() => handleStatusChange(ex, 'verified')}
                            className="px-2 py-1 text-[10px] font-bold bg-green-500/10 text-green-500 rounded-md hover:bg-green-500/20 transition-colors">Verify</button>
                        )}
                        {ex.status !== 'suspended' && (
                          <button onClick={() => handleStatusChange(ex, 'suspended')}
                            className="px-2 py-1 text-[10px] font-bold bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors">Suspend</button>
                        )}
                        <button onClick={() => setEditEx({ ...ex })} className="p-1.5 text-text-secondary hover:text-accent-primary rounded-lg transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(ex)} className="p-1.5 text-text-secondary hover:text-destructive rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">{loading ? 'Loading...' : 'No exchangers found.'}</div>}
          </div>
        </div>
      )}

      <AnimatePresence>
        {(editEx || isCreating) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => { setEditEx(null); setIsCreating(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-md my-8" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold">{isCreating ? 'Add New Exchanger' : 'Edit Exchanger'}</h3>
                <button onClick={() => { setEditEx(null); setIsCreating(false); }} className="p-1 rounded-full bg-bg-secondary"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Logo Upload */}
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-2 block uppercase tracking-wider">Exchange Logo</label>
                  <div
                    className="group relative w-24 h-24 rounded-2xl bg-bg-secondary border-2 border-dashed border-glass-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent-primary transition-colors overflow-hidden"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    {(isCreating ? form.logo_url : editEx?.logo_url) ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src={(isCreating ? form.logo_url : editEx?.logo_url) || ''} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload size={20} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={24} className="text-text-secondary" />
                        <span className="text-[10px] text-text-secondary font-bold">Upload</span>
                      </>
                    )}
                    <input
                      id="logo-upload" type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await handleLogoUpload(file);
                        if (url) {
                          if (isCreating) setForm({ ...form, logo_url: url });
                          else if (editEx) setEditEx({ ...editEx, logo_url: url });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: 'Exchange Name', key: 'name' },
                    { label: 'Contact Email', key: 'email' },
                    { label: 'Country / Region', key: 'country' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">{label}</label>
                      <input
                        value={isCreating ? (form as any)[key] : (editEx as any)?.[key] || ''}
                        onChange={e => isCreating ? setForm({ ...form, [key]: e.target.value }) : setEditEx({ ...editEx!, [key]: e.target.value })}
                        className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Website URL</label>
                  <input
                    value={isCreating ? form.website_url : editEx?.website_url || ''}
                    onChange={e => isCreating ? setForm({ ...form, website_url: e.target.value }) : setEditEx({ ...editEx!, website_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Description</label>
                  <textarea
                    value={isCreating ? form.description : editEx?.description || ''}
                    onChange={e => isCreating ? setForm({ ...form, description: e.target.value }) : setEditEx({ ...editEx!, description: e.target.value })}
                    rows={2}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Badge Text</label>
                    <input
                      value={isCreating ? form.badge : editEx?.badge || ''}
                      onChange={e => isCreating ? setForm({ ...form, badge: e.target.value }) : setEditEx({ ...editEx!, badge: e.target.value })}
                      placeholder="e.g. Verified"
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Badge Style</label>
                    <select
                      value={isCreating ? form.badge_color : editEx?.badge_color || ''}
                      onChange={e => isCreating ? setForm({ ...form, badge_color: e.target.value }) : setEditEx({ ...editEx!, badge_color: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary outline-none appearance-none cursor-pointer"
                    >
                      <option value="">None (Default)</option>
                      <option value="bg-blue-500/10 text-blue-500">Blue (Verified)</option>
                      <option value="bg-emerald-500/10 text-emerald-500">Green (Safe)</option>
                      <option value="bg-amber-500/10 text-amber-500">Amber (Warning)</option>
                      <option value="bg-red-500/10 text-red-500">Red (Danger)</option>
                      <option value="bg-purple-500/10 text-purple-500">Purple (Premium)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Trade Limit (NRT)</label>
                    <input
                      type="number"
                      value={isCreating ? form.trading_limit : editEx?.trading_limit}
                      onChange={e => isCreating ? setForm({ ...form, trading_limit: Number(e.target.value) }) : setEditEx({ ...editEx!, trading_limit: Number(e.target.value) })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Status</label>
                    <select
                      value={isCreating ? form.status : editEx?.status}
                      onChange={e => isCreating ? setForm({ ...form, status: e.target.value as any }) : setEditEx({ ...editEx!, status: e.target.value as any })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm outline-none"
                    >
                      {['verified', 'pending', 'suspended'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-glass-border flex gap-3">
                <button onClick={() => { setEditEx(null); setIsCreating(false); }} className="flex-1 py-2.5 rounded-xl bg-bg-secondary font-bold text-sm border border-glass-border transition-colors hover:bg-bg-secondary/80">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm shadow-lg shadow-accent-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {isCreating ? 'Create Exchanger' : 'Update Details'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
