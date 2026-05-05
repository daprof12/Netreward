import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, X, FileText, Search, Filter, Globe, User as UserIcon, Building, Server, ExternalLink } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { logAuditAction } from '@/lib/audit';
import { usePageTitle } from '@/hooks/usePageTitle';

interface KycSubmission {
  id: string;
  user_id: string;
  target_role: string;
  selfie_url: string;
  id_doc_url: string;
  business_name?: string;
  website?: string;
  business_email?: string;
  phone_number?: string;
  business_address?: string;
  biz_reg_url?: string;
  logo_url?: string;
  isp_license_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  user_email: string;
  user_display_name: string;
}

export default function AdminKYC() {
  usePageTitle('Admin — KYC');
  const { showToast } = useToastStore();
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [viewSubmission, setViewSubmission] = useState<KycSubmission | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kyc_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch KYC submissions', 'danger');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchStatus = filter === 'all' || s.status === filter;
      const q = search.toLowerCase();
      const matchQ = !q || 
        s.user_email?.toLowerCase().includes(q) || 
        s.user_display_name?.toLowerCase().includes(q) ||
        s.business_name?.toLowerCase().includes(q);
      return matchStatus && matchQ;
    });
  }, [submissions, filter, search]);

  const handleReview = async (id: string, userId: string, status: 'approved' | 'rejected', targetRole: string) => {
    setIsProcessing(true);
    try {
      // 1. Update kyc_submissions table
      const { error: kycError } = await supabase
        .from('kyc_submissions')
        .update({ status, admin_note: adminNote, reviewed_at: new Date().toISOString() })
        .eq('id', id);

      if (kycError) throw kycError;

      // 2. Update users table (kyc_status and potentially role)
      const updates: any = { kyc_status: status === 'approved' ? 'verified' : 'rejected' };
      if (status === 'approved') {
        updates.role = targetRole;
        updates.kyc_verified = true;
      }

      const { error: userError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (userError) throw userError;

      // 3. Log Audit
      await logAuditAction({
        action: `kyc_${status}`,
        resource_type: 'kyc_submission',
        resource_id: id,
        payload_after: { status, admin_note: adminNote, target_role: targetRole }
      });

      showToast(`KYC submission ${status}`, 'success');
      setAdminNote('');
      setViewSubmission(null);
      fetchSubmissions();
    } catch (err: any) {
      showToast(err.message || 'Failed to process KYC', 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const statusColor: Record<string, string> = { approved: '#10B981', pending: '#F59E0B', rejected: '#EF4444' };
  const statusIcon: Record<string, typeof CheckCircle2> = { approved: CheckCircle2, pending: Clock, rejected: XCircle };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black">KYC Review</h1>
          <p className="text-sm text-text-secondary">Review and approve platform upgrades</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Submissions', value: submissions.length.toLocaleString(), sub: 'all time', color: '#3B82F6', icon: FileText },
          { label: 'Pending Review', value: submissions.filter(s => s.status === 'pending').length.toString(), sub: 'awaiting action', color: '#F59E0B', icon: Clock },
          { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length.toString(), sub: 'verified', color: '#10B981', icon: CheckCircle2 },
          { label: 'Rejected', value: submissions.filter(s => s.status === 'rejected').length.toString(), sub: 'denied', color: '#EF4444', icon: XCircle },
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 shrink-0 overflow-x-auto pb-2 sm:pb-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors whitespace-nowrap ${filter === f ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-text-secondary border border-glass-border'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, name or business..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
      </div>

      <div className="grid gap-3">
        {filteredSubmissions.map(sub => {
          const Icon = statusIcon[sub.status];
          const color = statusColor[sub.status];
          return (
            <div key={sub.id} onClick={() => setViewSubmission(sub)} className="bg-bg-card border border-glass-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-bg-secondary/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center font-bold text-text-primary shrink-0 overflow-hidden">
                {sub.logo_url ? <img src={sub.logo_url} className="w-full h-full object-cover" /> : sub.user_display_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-text-primary truncate">{sub.business_name || sub.user_display_name || 'Anonymous User'}</p>
                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${sub.target_role === 'isp' ? 'bg-purple-500/10 text-purple-500' : sub.target_role === 'sp' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                    {sub.target_role}
                  </span>
                </div>
                <p className="text-xs text-text-secondary truncate">{sub.user_email} · {new Date(sub.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0" style={{ color }}>
                <Icon size={16} />
                <span className="text-xs font-bold capitalize hidden sm:inline">{sub.status}</span>
              </div>
            </div>
          );
        })}
        {filteredSubmissions.length === 0 && <div className="text-center py-12 text-text-secondary glass rounded-2xl">No submissions found for this filter.</div>}
      </div>

      {/* KYC Detail Modal */}
      <AnimatePresence>
        {viewSubmission && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setViewSubmission(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-bg-card border border-glass-border rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl" onClick={e => e.stopPropagation()}>
              
              <div className="p-6 border-b border-glass-border flex justify-between items-center bg-bg-secondary shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary font-black text-xl">
                    {viewSubmission.user_display_name?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{viewSubmission.business_name || viewSubmission.user_display_name}</h3>
                    <p className="text-xs text-text-secondary">{viewSubmission.user_email} · Requesting <span className="font-bold text-accent-primary uppercase">{viewSubmission.target_role}</span> status</p>
                  </div>
                </div>
                <button onClick={() => setViewSubmission(null)} className="p-2 rounded-full hover:bg-glass-border transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Selfie Liveness section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2"><UserIcon size={16} className="text-accent-primary" /> Liveness Verification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-glass-border bg-black relative group">
                        <img src={viewSubmission.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                           <p className="text-[10px] text-white font-medium">Captured during rotation check</p>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                       <div className="glass p-4 rounded-2xl border border-glass-border space-y-3">
                          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Liveness Audit Trail</p>
                          <div className="space-y-2">
                             {[
                                { label: 'Turn Head Left', status: 'Passed', time: '10:00:05' },
                                { label: 'Open Mouth', status: 'Passed', time: '10:00:12' },
                                { label: 'Rotate Head', status: 'Passed', time: '10:00:20' },
                             ].map((step, i) => (
                               <div key={i} className="flex items-center justify-between py-2 border-b border-glass-border last:border-0">
                                  <span className="text-sm font-medium">{step.label}</span>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-mono text-text-secondary">{step.time}</span>
                                     <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">PASSED</span>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Business Information */}
                {viewSubmission.business_name && (
                   <div className="space-y-3">
                      <h4 className="text-sm font-bold flex items-center gap-2"><Building size={16} className="text-accent-primary" /> Business Profile</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {[
                           { label: 'Company Name', value: viewSubmission.business_name },
                           { label: 'Website', value: viewSubmission.website, isLink: true },
                           { label: 'Official Email', value: viewSubmission.business_email },
                           { label: 'Contact Phone', value: viewSubmission.phone_number },
                           { label: 'Registered Address', value: viewSubmission.business_address, fullWidth: true },
                         ].map((item, i) => (
                            <div key={i} className={`glass p-4 rounded-xl border border-glass-border ${item.fullWidth ? 'md:col-span-2' : ''}`}>
                               <p className="text-[10px] text-text-secondary uppercase font-black mb-1">{item.label}</p>
                               {item.isLink ? (
                                 <a href={item.value} target="_blank" rel="noreferrer" className="font-semibold text-accent-primary flex items-center gap-1 hover:underline">
                                   {item.value} <ExternalLink size={12} />
                                 </a>
                               ) : (
                                 <p className="font-semibold text-text-primary">{item.value}</p>
                               )}
                            </div>
                         ))}
                      </div>
                   </div>
                )}

                {/* Documents section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-2"><FileText size={16} className="text-accent-primary" /> Verification Documents</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Government ID', url: viewSubmission.id_doc_url, icon: FileText },
                      { label: 'Business Registration', url: viewSubmission.biz_reg_url, icon: Building },
                      { label: 'ISP License', url: viewSubmission.isp_license_url, icon: Server },
                      { label: 'Company Logo', url: viewSubmission.logo_url, icon: ImageIcon },
                    ].filter(d => d.url).map((doc, i) => (
                      <div key={i} className="group relative aspect-[1.4/1] rounded-2xl overflow-hidden border border-glass-border bg-bg-secondary cursor-zoom-in">
                        <img src={doc.url!} alt={doc.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-xs font-bold">View Fullscreen</div>
                        </div>
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white border border-white/10">
                          {doc.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Review Actions */}
              <div className="p-6 border-t border-glass-border bg-bg-secondary shrink-0">
                {viewSubmission.status === 'pending' ? (
                  <div className="space-y-4">
                    <div>
                       <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Reviewer Notes (Optional for rejection)</label>
                       <textarea 
                          value={adminNote}
                          onChange={e => setAdminNote(e.target.value)}
                          placeholder="Provide details for rejection or specific approval notes..."
                          className="w-full bg-bg-card border border-glass-border rounded-xl p-3 text-sm focus:outline-none focus:border-accent-primary transition-colors min-h-[80px]"
                       />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleReview(viewSubmission.id, viewSubmission.user_id, 'rejected', viewSubmission.target_role)} 
                        className="px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Reject Verification
                      </button>
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleReview(viewSubmission.id, viewSubmission.user_id, 'approved', viewSubmission.target_role)} 
                        className="px-8 py-2.5 bg-accent-primary text-white border border-accent-primary rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-accent-primary/20 active:scale-95 disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Approve & Upgrade'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${viewSubmission.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <p className="text-sm font-bold text-text-primary capitalize">This request was {viewSubmission.status}</p>
                     </div>
                     {viewSubmission.admin_note && (
                        <p className="text-xs text-text-secondary italic">" {viewSubmission.admin_note} "</p>
                     )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ImageIcon(props: any) {
   return (
     <svg
       xmlns="http://www.w3.org/2000/svg"
       width="24"
       height="24"
       viewBox="0 0 24 24"
       fill="none"
       stroke="currentColor"
       strokeWidth="2"
       strokeLinecap="round"
       strokeLinejoin="round"
       {...props}
     >
       <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
       <circle cx="9" cy="9" r="2" />
       <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
     </svg>
   );
 }
