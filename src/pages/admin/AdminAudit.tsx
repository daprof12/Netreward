import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Clock, User, Shield, Info, ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/useToastStore';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  payload_before: any;
  payload_after: any;
  user_agent: string;
  created_at: string;
  admin?: {
    email: string;
    display_name: string;
  };
}

export default function AdminAudit() {
  const { showToast } = useToastStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      const { data: auditData, error } = await supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const adminIds = [...new Set((auditData || []).map(log => log.admin_id).filter(Boolean))];
      let adminsMap: Record<string, any> = {};
      
      if (adminIds.length > 0) {
        const { data: adminsData } = await supabase
          .from('users')
          .select('id, email, display_name')
          .in('id', adminIds);
          
        adminsMap = (adminsData || []).reduce((acc: any, admin: any) => {
          acc[admin.id] = admin;
          return acc;
        }, {});
      }

      setLogs((auditData || []).map((log: any) => ({
        ...log,
        admin: adminsMap[log.admin_id] || { email: 'System', display_name: 'System' }
      })));
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch audit logs', 'danger');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const matchQ = !q || 
      log.action.toLowerCase().includes(q) || 
      log.resource_type.toLowerCase().includes(q) ||
      log.admin?.email.toLowerCase().includes(q);
    const matchAction = filterAction === 'all' || log.action.includes(filterAction);
    return matchQ && matchAction;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black">Audit Logs</h1>
          <p className="text-sm text-text-secondary">Track all administrative actions and system changes</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, resource, or admin..."
            className="w-full bg-bg-card border border-glass-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent-primary"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="bg-bg-card border border-glass-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-primary"
          >
            <option value="all">All Actions</option>
            <option value="kyc">KYC Reviews</option>
            <option value="update_config">Config Changes</option>
            <option value="delete">Deletions</option>
          </select>
          <button onClick={fetchLogs} className="p-2 bg-bg-card border border-glass-border rounded-xl hover:bg-bg-secondary transition-colors">
            <Clock size={18} className="text-text-secondary" />
          </button>
        </div>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-bg-secondary/50 border-b border-glass-border">
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-[10px]">Timestamp</th>
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-[10px]">Admin</th>
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-[10px]">Action</th>
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-[10px]">Resource</th>
                <th className="px-6 py-4 font-bold text-text-secondary uppercase tracking-wider text-[10px]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-bg-secondary/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium">{new Date(log.created_at).toLocaleDateString()}</span>
                      <span className="text-[10px] text-text-secondary">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary text-[10px] font-bold">
                        {log.admin?.display_name?.[0] || 'A'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary">{log.admin?.display_name || 'Admin'}</span>
                        <span className="text-[10px] text-text-secondary">{log.admin?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      log.action.includes('approve') ? 'bg-green-500/10 text-green-500' :
                      log.action.includes('reject') ? 'bg-red-500/10 text-red-500' :
                      'bg-accent-primary/10 text-accent-primary'
                    }`}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Shield size={14} className="text-text-secondary" />
                      <span className="capitalize">{log.resource_type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1.5 rounded-lg hover:bg-glass-border transition-colors group-hover:text-accent-primary">
                      <Info size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                    No audit logs found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
