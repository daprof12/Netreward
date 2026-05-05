import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, CheckCircle2, X, AlertCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';

const STATUS_COLORS: Record<string, string> = { open: '#EF4444', in_progress: '#F59E0B', resolved: '#10B981', closed: '#6B7280' };
const PRIORITY_COLORS: Record<string, string> = { low: '#6B7280', medium: '#3B82F6', high: '#F59E0B', critical: '#EF4444' };

export default function AdminSupport() {
  const { showToast } = useToastStore();
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [viewTicket, setViewTicket] = useState<any | null>(null);
  const [reply, setReply] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, ticket_messages(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSupportTickets((data || []).map((t: any) => ({
        ...t,
        userEmail: t.user_email || t.email || t.user_id || 'Unknown',
        createdAt: t.created_at,
        messages: (t.ticket_messages || []).map((m: any) => ({
          sender: m.sender_type === 'admin' ? 'Support Agent' : m.sender_name || 'User',
          text: m.content || m.message || '',
          time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        })),
      })));
    } catch (e: any) { console.error('Fetch tickets:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = supportTickets.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || (t.userEmail || '').toLowerCase().includes(q) || (t.subject || '').toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchQ && matchStatus && matchPriority;
  });

  const handleReply = async () => {
    if (!reply.trim() || !viewTicket) return;
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: viewTicket.id,
        sender_type: 'admin',
        sender_name: 'Support Agent',
        content: reply,
      });
      if (error) throw error;
      if (viewTicket.status === 'open') {
        await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', viewTicket.id);
      }
      const newMsg = { sender: 'Support Agent', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setViewTicket({ ...viewTicket, messages: [...viewTicket.messages, newMsg], status: viewTicket.status === 'open' ? 'in_progress' : viewTicket.status });
      setSupportTickets(prev => prev.map(t => t.id === viewTicket.id ? { ...t, messages: [...t.messages, newMsg], status: t.status === 'open' ? 'in_progress' : t.status } : t));
      setReply('');
      showToast('Reply sent.', 'success');
    } catch (e: any) { showToast(e.message || 'Reply failed', 'error'); }
  };

  const handleResolve = async (id: string) => {
    try {
      await supabase.from('support_tickets').update({ status: 'resolved' }).eq('id', id);
      setSupportTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'resolved' } : t));
      showToast('Ticket resolved.', 'success');
      if (viewTicket?.id === id) setViewTicket(null);
    } catch (e: any) { showToast(e.message || 'Resolve failed', 'error'); }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Support Tickets</h1>
        <p className="text-sm text-text-secondary">Manage user support requests</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: AlertCircle, label: 'Open', value: supportTickets.filter(t => t.status === 'open').length.toString(), color: '#EF4444', bg: 'bg-red-500/10' },
          { icon: Clock, label: 'In Progress', value: supportTickets.filter(t => t.status === 'in_progress').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
          { icon: CheckCircle2, label: 'Resolved', value: supportTickets.filter(t => t.status === 'resolved').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: X, label: 'Closed', value: supportTickets.filter(t => t.status === 'closed').length.toString(), color: '#6B7280', bg: 'bg-gray-500/10' },
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

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID, email, or subject..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['ID', 'User', 'Subject', 'Category', 'Priority', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{t.id}</td>
                  <td className="px-4 py-3 text-text-primary">{t.userEmail}</td>
                  <td className="px-4 py-3 font-semibold text-text-primary">{t.subject}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.category}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase capitalize" style={{ backgroundColor: `${PRIORITY_COLORS[t.priority]}20`, color: PRIORITY_COLORS[t.priority] }}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase capitalize" style={{ backgroundColor: `${STATUS_COLORS[t.status]}20`, color: STATUS_COLORS[t.status] }}>{t.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewTicket(t)} className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary border border-glass-border rounded-lg text-xs font-bold text-text-secondary hover:text-accent-primary transition-colors">
                      <MessageSquare size={14} /> Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No tickets found.</div>}
        </div>
      </div>

      <AnimatePresence>
        {viewTicket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewTicket(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
              
              <div className="p-4 border-b border-glass-border flex justify-between items-center bg-bg-secondary shrink-0">
                <div>
                  <h3 className="font-bold flex items-center gap-2">{viewTicket.subject}</h3>
                  <p className="text-xs text-text-secondary">{viewTicket.userEmail} | {viewTicket.category}</p>
                </div>
                <button onClick={() => setViewTicket(null)} className="p-1.5 rounded-full hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {viewTicket.messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.sender === 'Support Agent' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-bold text-text-secondary">{m.sender}</span>
                      <span className="text-[10px] text-text-secondary">{m.time}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-sm ${m.sender === 'Support Agent' ? 'bg-accent-primary text-white' : 'bg-bg-secondary border border-glass-border text-text-primary'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-glass-border bg-bg-secondary shrink-0">
                {viewTicket.status !== 'resolved' && viewTicket.status !== 'closed' ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()}
                        placeholder="Type reply..." className="flex-1 bg-bg-card border border-glass-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-primary" />
                      <button onClick={handleReply} className="px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20">Reply</button>
                    </div>
                    <button onClick={() => handleResolve(viewTicket.id)} className="w-full flex items-center justify-center gap-2 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-colors"><CheckCircle2 size={16} /> Mark as Resolved</button>
                  </div>
                ) : (
                  <div className="text-center text-sm font-bold text-text-secondary py-2">This ticket is {viewTicket.status}.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
