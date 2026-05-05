import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserSquare, Loader2, MessageSquare, ShieldAlert, Users, Send, Target, Phone, Mail, Flag, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';

type ActiveTab = 'directory' | 'leads' | 'communications' | 'audits';

export default function AdminCRM() {
  usePageTitle('Admin — CRM');
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('directory');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  
  // UI States
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  
  // Compose Form
  const [msgForm, setMsgForm] = useState({
    type: 'general',
    channels: ['in_app'],
    targetRole: 'all',
    targetUserId: '',
    subject: '',
    message: ''
  });

  // Lead Form
  const [leadForm, setLeadForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    targetRole: 'sp',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, lRes, cRes, aRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_communications').select('*, users!crm_communications_target_user_id_fkey(email)').order('created_at', { ascending: false }),
        supabase.from('user_audits').select('*, users!user_audits_user_id_fkey(email)').order('created_at', { ascending: false })
      ]);
      
      setUsers((uRes.data || []).map(u => ({ ...u, name: u.display_name || u.email })));
      setLeads(lRes.data || []);
      setCommunications(cRes.data || []);
      setAudits(aRes.data || []);
    } catch (e: any) {
      console.error(e);
      showToast(e.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSendCommunication = async () => {
    if (!msgForm.subject || !msgForm.message || msgForm.channels.length === 0) {
      showToast('Please fill all required fields and select a channel', 'warning');
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload: any = {
        admin_id: user?.id,
        type: msgForm.type,
        channels: msgForm.channels,
        subject: msgForm.subject,
        message: msgForm.message,
        target_role: msgForm.targetRole === 'all' ? null : msgForm.targetRole,
        target_user_id: msgForm.targetRole === 'specific' ? msgForm.targetUserId : null
      };

      const { error } = await supabase.from('crm_communications').insert(payload);
      if (error) throw error;
      
      // If in_app, we simulate creating notifications (in reality, an edge function should do this for mass broadcast)
      if (msgForm.channels.includes('in_app') && msgForm.targetRole === 'specific' && msgForm.targetUserId) {
         await supabase.from('notifications').insert({
            user_id: msgForm.targetUserId,
            title: msgForm.subject,
            message: msgForm.message,
            type: msgForm.type
         });
      }

      showToast('Communication dispatched successfully (Email/SMS triggered via webhook)', 'success');
      setShowCompose(false);
      setMsgForm({ type: 'general', channels: ['in_app'], targetRole: 'all', targetUserId: '', subject: '', message: '' });
      fetchData();
    } catch (e: any) {
      showToast(e.message, 'danger');
    }
  };

  const handleFlagUser = async (userId: string) => {
    const reason = prompt('Enter reason for auditing this user:');
    if (!reason) return;
    try {
      const { error } = await supabase.from('user_audits').insert({ user_id: userId, reason });
      if (error) throw error;
      showToast('User flagged for audit', 'success');
      fetchData();
    } catch (e: any) {
      showToast(e.message, 'danger');
    }
  };

  const handleAddLead = async () => {
    if (!leadForm.companyName || !leadForm.targetRole) {
      showToast('Company name and target role are required', 'warning');
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('crm_leads').insert({
        company_name: leadForm.companyName,
        contact_name: leadForm.contactName,
        email: leadForm.email,
        phone: leadForm.phone,
        target_role: leadForm.targetRole,
        notes: leadForm.notes,
        assigned_admin_id: user?.id
      });
      if (error) throw error;
      
      showToast('Lead captured successfully', 'success');
      setShowAddLead(false);
      setLeadForm({ companyName: '', contactName: '', email: '', phone: '', targetRole: 'sp', notes: '' });
      fetchData();
    } catch (e: any) { showToast(e.message, 'danger'); }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('crm_leads').update({ status }).eq('id', id);
      if (error) throw error;
      showToast('Status updated', 'success');
      setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
    } catch (e: any) { showToast(e.message, 'danger'); }
  };

  const TABS = [
    { id: 'directory', label: 'User Directory', icon: Users },
    { id: 'leads', label: 'Marketing Leads', icon: Target },
    { id: 'communications', label: 'Communications', icon: MessageSquare },
    { id: 'audits', label: 'Compliance Audits', icon: ShieldAlert }
  ] as const;

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-accent-primary" size={32} /></div>;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">CRM & Compliance</h1>
        <p className="text-sm text-text-secondary">Manage users, marketing leads, broadcast messages, and security audits</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-glass-border overflow-x-auto hide-scrollbar">
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${active ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        
        {/* DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name or email..."
                className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-accent-primary" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2 max-h-[600px] overflow-y-auto pr-2">
                {users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).slice(0, 50).map(user => (
                  <div key={user.id} onClick={() => setSelectedUser(user)}
                    className={`p-4 rounded-xl border cursor-pointer transition-colors flex items-center justify-between ${selectedUser?.id === user.id ? 'bg-accent-primary/10 border-accent-primary' : 'bg-bg-card border-glass-border hover:bg-bg-secondary'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center font-bold">{user.name[0]?.toUpperCase()}</div>
                      <div>
                        <h4 className="font-bold text-sm text-text-primary">{user.name}</h4>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold text-accent-primary">{Number(user.nrt_balance || 0).toLocaleString()} NRT</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${user.role === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>{user.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="lg:col-span-1">
                {selectedUser ? (
                  <div className="bg-bg-card border border-glass-border rounded-xl p-5 space-y-6 sticky top-24">
                    <div className="text-center">
                       <div className="w-20 h-20 rounded-full bg-bg-secondary flex items-center justify-center font-black text-3xl mx-auto mb-3">{selectedUser.name[0]?.toUpperCase()}</div>
                       <h3 className="font-black text-xl">{selectedUser.name}</h3>
                       <p className="text-sm text-text-secondary">{selectedUser.email}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="glass p-3 rounded-xl border border-glass-border">
                          <p className="text-[10px] uppercase font-bold text-text-secondary">Country</p>
                          <p className="font-bold">{selectedUser.country || 'Unknown'}</p>
                       </div>
                       <div className="glass p-3 rounded-xl border border-glass-border">
                          <p className="text-[10px] uppercase font-bold text-text-secondary">KYC Status</p>
                          <p className={`font-bold capitalize ${selectedUser.kyc_status === 'verified' ? 'text-green-500' : 'text-amber-500'}`}>{selectedUser.kyc_status || 'none'}</p>
                       </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-4 border-t border-glass-border">
                       <button onClick={() => {
                          setMsgForm(prev => ({ ...prev, targetRole: 'specific', targetUserId: selectedUser.id }));
                          setActiveTab('communications');
                          setShowCompose(true);
                       }} className="w-full py-2 bg-bg-secondary hover:bg-glass-border rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                          <MessageSquare size={16} /> Send Direct Message
                       </button>
                       <button onClick={() => handleFlagUser(selectedUser.id)} className="w-full py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                          <Flag size={16} /> Flag for Audit
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-bg-card border border-glass-border rounded-xl p-8 text-center text-text-secondary flex flex-col items-center justify-center h-64">
                    <UserSquare size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select a user to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LEADS */}
        {activeTab === 'leads' && (
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h2 className="font-bold text-lg">Marketing & Partnerships Leads</h2>
                 <button onClick={() => setShowAddLead(true)} className="px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20">Add Lead</button>
              </div>
              <div className="bg-bg-card border border-glass-border rounded-xl overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-bg-secondary text-xs uppercase text-text-secondary">
                       <tr><th className="px-4 py-3">Company</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Target Role</th><th className="px-4 py-3">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                       {leads.map(l => (
                          <tr key={l.id} className="hover:bg-bg-secondary/50">
                             <td className="px-4 py-3 font-bold">{l.company_name}</td>
                             <td className="px-4 py-3">
                                <p>{l.contact_name || 'N/A'}</p>
                                <div className="flex gap-2 text-xs text-text-secondary">
                                  {l.email && <span className="flex items-center gap-1"><Mail size={12}/>{l.email}</span>}
                                  {l.phone && <span className="flex items-center gap-1"><Phone size={12}/>{l.phone}</span>}
                                </div>
                             </td>
                             <td className="px-4 py-3 uppercase font-bold text-accent-primary">{l.target_role}</td>
                             <td className="px-4 py-3 flex items-center gap-2">
                                <select value={l.status} onChange={e => updateLeadStatus(l.id, e.target.value)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border cursor-pointer outline-none ${l.status === 'converted' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-bg-secondary text-text-secondary border-glass-border'}`}>
                                  {['new', 'contacted', 'in_negotiation', 'converted', 'lost'].map(st => (
                                    <option key={st} value={st}>{st.replace('_', ' ')}</option>
                                  ))}
                                </select>
                             </td>
                          </tr>
                       ))}
                       {leads.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">No leads captured yet.</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* COMMUNICATIONS */}
        {activeTab === 'communications' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="font-bold text-lg">Broadcast & Alerts</h2>
                 <button onClick={() => setShowCompose(true)} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold">
                    <Send size={16} /> Compose Message
                 </button>
              </div>
              
              <div className="space-y-3">
                 {communications.map(c => (
                    <div key={c.id} className="bg-bg-card border border-glass-border rounded-xl p-4">
                       <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-text-primary">{c.subject}</h4>
                          <span className="text-xs text-text-secondary">{new Date(c.created_at).toLocaleString()}</span>
                       </div>
                       <p className="text-sm text-text-secondary mb-3 line-clamp-2">{c.message}</p>
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-glass-border">{c.type}</span>
                          <div className="flex gap-1">
                             {c.channels.map((ch: string) => <span key={ch} className="text-[10px] uppercase text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded">{ch}</span>)}
                          </div>
                          <span className="text-xs text-text-secondary ml-auto">
                             Target: <span className="font-bold">{c.target_role ? `Role: ${c.target_role}` : c.target_user_id ? c.users?.email : 'All Users'}</span>
                          </span>
                       </div>
                    </div>
                 ))}
                 {communications.length === 0 && <div className="text-center py-12 text-text-secondary border border-glass-border border-dashed rounded-xl">No communication history.</div>}
              </div>
           </div>
        )}

        {/* AUDITS */}
        {activeTab === 'audits' && (
           <div className="space-y-4">
              <h2 className="font-bold text-lg mb-4">Compliance Audits & Flagged Users</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {['open', 'in_progress', 'closed'].map(status => (
                    <div key={status} className="bg-bg-secondary border border-glass-border rounded-xl p-4 flex flex-col h-[500px]">
                       <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold uppercase text-xs tracking-wider">{status.replace('_', ' ')}</h3>
                          <span className="bg-bg-card text-text-secondary px-2 py-0.5 rounded text-xs font-bold">{audits.filter(a => a.status === status).length}</span>
                       </div>
                       <div className="flex-1 overflow-y-auto space-y-3 pr-1 hide-scrollbar">
                          {audits.filter(a => a.status === status).map(a => (
                             <div key={a.id} className="bg-bg-card border border-glass-border rounded-lg p-3 shadow-sm hover:border-accent-primary/50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                   <p className="font-bold text-sm truncate" title={a.users?.email}>{a.users?.email}</p>
                                </div>
                                <p className="text-xs text-text-secondary mb-3 line-clamp-2">Reason: {a.reason}</p>
                                <div className="flex items-center justify-between mt-auto">
                                   <span className="text-[10px] text-text-secondary">{new Date(a.created_at).toLocaleDateString()}</span>
                                   {status !== 'closed' && (
                                      <button onClick={() => updateAuditStatus(a.id, status === 'open' ? 'in_progress' : 'closed')} 
                                         className="p-1 hover:text-accent-primary transition-colors bg-bg-secondary rounded" title="Move to next stage">
                                         <CheckCircle2 size={14} />
                                      </button>
                                   )}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

      </div>

      {/* Compose Modal */}
      <AnimatePresence>
         {showCompose && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                  className="bg-bg-primary border border-glass-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-glass-border flex justify-between items-center bg-bg-secondary">
                     <h3 className="font-bold text-lg">Compose Communication</h3>
                     <button onClick={() => setShowCompose(false)} className="p-1 rounded-full bg-glass-border hover:bg-glass-border/80"><X size={16} /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-5">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Message Type</label>
                           <select value={msgForm.type} onChange={e => setMsgForm({...msgForm, type: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary">
                              <option value="general">General Broadcast</option>
                              <option value="update">System Update</option>
                              <option value="security">Security Alert</option>
                              <option value="maintenance">Maintenance Notice</option>
                              <option value="promotion">Marketing / Promotion</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Target Audience</label>
                           <select value={msgForm.targetRole} onChange={e => setMsgForm({...msgForm, targetRole: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary">
                              <option value="all">All Users</option>
                              <option value="user">Standard Users Only</option>
                              <option value="sp">Service Providers Only</option>
                              <option value="isp">ISPs Only</option>
                              <option value="specific">Specific User</option>
                           </select>
                        </div>
                     </div>

                     {msgForm.targetRole === 'specific' && (
                        <div>
                           <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Target User ID</label>
                           <input value={msgForm.targetUserId} onChange={e => setMsgForm({...msgForm, targetUserId: e.target.value})} placeholder="Paste UUID..." className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                        </div>
                     )}

                     <div>
                        <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Delivery Channels</label>
                        <div className="flex gap-3">
                           {['in_app', 'email', 'sms'].map(ch => (
                              <label key={ch} className="flex items-center gap-2 cursor-pointer bg-bg-secondary border border-glass-border px-3 py-2 rounded-xl text-sm font-medium hover:border-accent-primary transition-colors">
                                 <input type="checkbox" checked={msgForm.channels.includes(ch)} 
                                    onChange={e => {
                                       if(e.target.checked) setMsgForm({...msgForm, channels: [...msgForm.channels, ch]});
                                       else setMsgForm({...msgForm, channels: msgForm.channels.filter(c => c !== ch)});
                                    }} 
                                    className="accent-accent-primary" />
                                 <span className="uppercase">{ch.replace('_', '-')}</span>
                              </label>
                           ))}
                        </div>
                        <p className="text-[10px] text-text-secondary mt-2 italic">* Note: Email and SMS require SendGrid/Twilio integrations configured in settings.</p>
                     </div>

                     <div>
                        <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Subject / Title</label>
                        <input value={msgForm.subject} onChange={e => setMsgForm({...msgForm, subject: e.target.value})} placeholder="e.g. Scheduled Maintenance" className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                     </div>

                     <div>
                        <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Message Body</label>
                        <textarea value={msgForm.message} onChange={e => setMsgForm({...msgForm, message: e.target.value})} placeholder="Type your message here..." rows={5} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary resize-none" />
                     </div>
                  </div>

                  <div className="p-5 border-t border-glass-border flex gap-3 bg-bg-secondary">
                     <button onClick={() => setShowCompose(false)} className="flex-1 py-3 rounded-xl border border-glass-border font-bold text-sm bg-bg-card hover:bg-bg-primary transition-colors">Cancel</button>
                     <button onClick={handleSendCommunication} className="flex-[2] py-3 rounded-xl bg-accent-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                        <Send size={16} /> Dispatch Message
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
      <AnimatePresence>
         {showAddLead && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
               <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                  className="bg-bg-primary border border-glass-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-glass-border flex justify-between items-center bg-bg-secondary">
                     <h3 className="font-bold text-lg">Capture New Lead</h3>
                     <button onClick={() => setShowAddLead(false)} className="p-1 rounded-full bg-glass-border hover:bg-glass-border/80"><X size={16} /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-4">
                     <div>
                        <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Company Name *</label>
                        <input value={leadForm.companyName} onChange={e => setLeadForm({...leadForm, companyName: e.target.value})} placeholder="Acme Corp" className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Target Role *</label>
                        <select value={leadForm.targetRole} onChange={e => setLeadForm({...leadForm, targetRole: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary">
                           <option value="sp">Service Provider (SP)</option>
                           <option value="isp">Internet Service Provider (ISP)</option>
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Contact Name</label>
                           <input value={leadForm.contactName} onChange={e => setLeadForm({...leadForm, contactName: e.target.value})} placeholder="John Doe" className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Phone</label>
                           <input value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} placeholder="+1 234..." className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Email Address</label>
                        <input value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} placeholder="contact@acme.com" className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Notes / Follow-up Plan</label>
                        <textarea value={leadForm.notes} onChange={e => setLeadForm({...leadForm, notes: e.target.value})} rows={3} placeholder="Initial context..." className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary resize-none" />
                     </div>
                  </div>

                  <div className="p-5 border-t border-glass-border flex gap-3 bg-bg-secondary">
                     <button onClick={() => setShowAddLead(false)} className="flex-1 py-3 rounded-xl border border-glass-border font-bold text-sm bg-bg-card hover:bg-bg-primary transition-colors">Cancel</button>
                     <button onClick={handleAddLead} className="flex-1 py-3 rounded-xl bg-accent-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">Save Lead</button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

    </motion.div>
  );
}
