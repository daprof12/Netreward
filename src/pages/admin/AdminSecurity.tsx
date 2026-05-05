import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminSecurity() {
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setSecurityLogs((data || []).map((l: any) => ({
        ...l,
        type: l.event_type || l.action || 'system_event',
        ip: l.ip_address || 'N/A',
        userEmail: l.actor_id || 'system',
        country: l.country || 'Unknown',
        detail: l.details || l.resource || '',
        createdAt: l.created_at,
      })));
    } catch (e: any) { console.error('Fetch security logs:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = securityLogs.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || (l.ip || '').includes(q) || (l.userEmail || '').toLowerCase().includes(q) || (l.type || '').toLowerCase().includes(q);
    const matchSeverity = severityFilter === 'All' || l.severity === severityFilter || (!l.severity && severityFilter === 'info');
    const matchType = typeFilter === 'All' || l.type === typeFilter;
    return matchQ && matchSeverity && matchType;
  });

  const TYPE_COLORS: Record<string, string> = {
    login_attempt: '#F59E0B',
    blocked_ip: '#EF4444',
    suspicious_activity: '#8B5CF6',
    system_event: '#6B7280',
    admin_action: '#3B82F6',
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Cyber Security</h1>
          <p className="text-sm text-text-secondary">Review security logs and flagged activity</p>
        </div>
        <button onClick={fetchData} className="p-2 bg-bg-secondary border border-glass-border rounded-xl hover:bg-glass-bg transition-colors" title="Refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(TYPE_COLORS).slice(0, 3).map(([type, color]) => (
          <div key={type} className="bg-bg-card border border-glass-border rounded-xl p-4">
            <p className="text-xs text-text-secondary font-medium mb-1 capitalize">{type.replace(/_/g, ' ')}</p>
            <p className="text-xl font-black" style={{ color }}>{securityLogs.filter(l => l.type === type).length}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by IP, email, or type..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Types</option>
          <option value="login_attempt">Login Attempt</option>
          <option value="blocked_ip">Blocked IP</option>
          <option value="suspicious_activity">Suspicious Activity</option>
          <option value="system_event">System Event</option>
          <option value="admin_action">Admin Action</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-accent-primary" size={32} /></div>
      ) : (
        <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border bg-bg-secondary">
                  {['Event Type', 'IP Address', 'User', 'Location', 'Details', 'Severity', 'Time'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ backgroundColor: `${TYPE_COLORS[l.type] || '#6B7280'}20`, color: TYPE_COLORS[l.type] || '#6B7280' }}>
                        {(l.type || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">{l.ip}</td>
                    <td className="px-4 py-3 text-text-secondary">{l.userEmail || 'N/A'}</td>
                    <td className="px-4 py-3 text-text-secondary">{l.country}</td>
                    <td className="px-4 py-3 font-semibold text-text-primary max-w-[250px] truncate">{l.detail}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${l.severity === 'critical' ? 'bg-red-500/10 text-red-500' : l.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                        {l.severity || 'info'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No security logs found.</div>}
          </div>
        </div>
      )}
    </motion.div>
  );
}
