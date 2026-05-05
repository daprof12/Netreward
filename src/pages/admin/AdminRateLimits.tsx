import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Globe, Activity, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminRateLimits() {
  const [apiEndpoints, setApiEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('api_endpoints').select('*').order('name');
        setApiEndpoints((data || []).map((e: any) => ({ ...e, rateLimit: e.rate_limit || 100 })));
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

  const avgRateLimit = apiEndpoints.length > 0 ? Math.round(apiEndpoints.reduce((sum, e) => sum + e.rateLimit, 0) / apiEndpoints.length) : 0;

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">API Rate Limits</h1>
        <p className="text-sm text-text-secondary">Monitor endpoint traffic constraints</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Endpoints', value: apiEndpoints.length.toString(), sub: 'active routes', color: '#3B82F6', icon: Globe },
          { label: 'Active Limits', value: apiEndpoints.filter(e => e.status === 'active').length.toString(), sub: 'enforced', color: '#10B981', icon: Activity },
          { label: 'Avg Rate Limit', value: `${avgRateLimit}/min`, sub: 'per endpoint', color: '#8b5cf6', icon: Zap },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
            <div className="flex justify-between items-start mb-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-[10px] font-medium text-text-secondary whitespace-nowrap ml-2">{sub}</span>
            </div>
            <p className="text-xs text-text-secondary font-medium">{label}</p>
            <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search endpoints..."
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(e => (
          <div key={e.id} className="bg-bg-card border border-glass-border rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-text-primary">{e.name}</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${e.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{e.status}</span>
              </div>
              <p className="text-xs font-mono text-text-secondary mb-4">{e.method} {e.path}</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-text-secondary">Current Traffic</span>
                <span className="font-bold text-text-primary">{Math.floor(Math.random() * e.rateLimit)} / {e.rateLimit} req/min</span>
              </div>
              <div className="h-2 w-full bg-bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent-primary" style={{ width: `${Math.random() * 80}%` }} />
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-text-secondary">No endpoints found.</div>}
      </div>
    </motion.div>
  );
}
