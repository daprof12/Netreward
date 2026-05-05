import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, X, Power, PowerOff, Loader2 } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';

import { Server, Activity, Clock } from 'lucide-react';

export default function AdminApiEndpoints() {
  const { showToast } = useToastStore();
  const [apiEndpoints, setApiEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [editEndpoint, setEditEndpoint] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('api_endpoints').select('*').order('name');
        setApiEndpoints((data || []).map((e: any) => ({
          ...e,
          rateLimit: e.rate_limit || e.rateLimit || 100,
        })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = apiEndpoints.filter(e => {
    const q = search.toLowerCase();
    const matchQ = !q || (e.name || '').toLowerCase().includes(q) || (e.path || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || e.status === statusFilter;
    const matchMethod = methodFilter === 'All' || e.method === methodFilter;
    return matchQ && matchStatus && matchMethod;
  });

  const updateApiEndpoint = async (id: string, updates: any) => {
    try {
      const dbUpdates: any = { ...updates };
      if (updates.rateLimit !== undefined) { dbUpdates.rate_limit = updates.rateLimit; delete dbUpdates.rateLimit; }
      await supabase.from('api_endpoints').update(dbUpdates).eq('id', id);
      setApiEndpoints(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const handleSave = async () => {
    if (!editEndpoint) return;
    await updateApiEndpoint(editEndpoint.id, { rateLimit: editEndpoint.rateLimit, rate_limit: editEndpoint.rateLimit });
    showToast('Endpoint configuration updated.', 'success');
    setEditEndpoint(null);
  };

  const METHOD_COLORS: Record<string, string> = { GET: '#10B981', POST: '#3B82F6', PUT: '#F59E0B', DELETE: '#EF4444' };

  const avgRateLimit = apiEndpoints.length > 0 
    ? Math.round(apiEndpoints.reduce((sum, e) => sum + e.rateLimit, 0) / apiEndpoints.length) 
    : 0;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">API & Endpoints</h1>
          <p className="text-sm text-text-secondary">Manage system endpoints and global rate limits</p>
        </div>
        <button onClick={() => showToast('Registering new endpoints requires codebase update.', 'warning')} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20">
          <Plus size={16} /> Register Endpoint
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Endpoints', value: apiEndpoints.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10', icon: Server },
          { label: 'Active Endpoints', value: apiEndpoints.filter(e => e.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10', icon: Activity },
          { label: 'Avg Rate Limit', value: `${avgRateLimit}/min`, color: '#8b5cf6', bg: 'bg-purple-500/10', icon: Clock },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="glass p-5 rounded-2xl border border-glass-border">
            <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{label}</p>
            <h3 className="text-2xl font-black text-text-primary mt-1">{value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or path..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['Name', 'Method', 'Path', 'Rate Limit (req/min)', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-text-primary">{e.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider" style={{ backgroundColor: `${METHOD_COLORS[e.method]}20`, color: METHOD_COLORS[e.method] }}>{e.method}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{e.path}</td>
                  <td className="px-4 py-3 font-bold">{e.rateLimit}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${e.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {e.status === 'active' ? (
                        <button onClick={() => { updateApiEndpoint(e.id, { status: 'disabled' }); showToast('Endpoint disabled.', 'warning'); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg" title="Disable"><PowerOff size={16} /></button>
                      ) : (
                        <button onClick={() => { updateApiEndpoint(e.id, { status: 'active' }); showToast('Endpoint enabled.', 'success'); }} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg" title="Enable"><Power size={16} /></button>
                      )}
                      <button onClick={() => setEditEndpoint({ ...e })} className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-bg-secondary rounded-lg"><Edit2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No endpoints found.</div>}
        </div>
      </div>

      <AnimatePresence>
        {editEndpoint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditEndpoint(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold">Edit Endpoint</h3>
                <button onClick={() => setEditEndpoint(null)} className="p-1 rounded-full bg-bg-secondary"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Endpoint</label>
                  <p className="text-sm font-semibold text-text-primary">{editEndpoint.name}</p>
                  <p className="text-xs font-mono text-text-secondary mt-1"><span style={{ color: METHOD_COLORS[editEndpoint.method] }}>{editEndpoint.method}</span> {editEndpoint.path}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Rate Limit (req/min)</label>
                  <input type="number" value={editEndpoint.rateLimit} onChange={e => setEditEndpoint({ ...editEndpoint, rateLimit: Number(e.target.value) })}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                </div>
              </div>
              <div className="p-4 border-t border-glass-border flex gap-3">
                <button onClick={() => setEditEndpoint(null)} className="flex-1 py-2.5 rounded-xl bg-bg-secondary font-bold text-sm border border-glass-border">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
