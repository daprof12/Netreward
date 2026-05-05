import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, AlertCircle, CheckCircle2, 
  MessageSquare, ShieldAlert, FileText,
  Search, ChevronRight, X, Send, Paperclip, Inbox
} from 'lucide-react';
import { useDisputes, type P2PDispute } from '@/hooks/useDisputes';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function DisputeCenter() {
  usePageTitle('Dispute Center');
  const navigate = useNavigate();
  const { disputes, isLoading, sendMessage, isSending } = useDisputes();
  const [search, setSearch] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<P2PDispute | null>(null);
  const [reply, setReply] = useState('');

  const filteredDisputes = disputes.filter(d => 
    d.trade_id.toLowerCase().includes(search.toLowerCase()) || 
    d.reason.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'investigating': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'resolved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'dismissed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-glass-border text-text-secondary';
    }
  };

  const handleSendMessage = async () => {
    if (!reply.trim() || !selectedDispute) return;
    try {
      await sendMessage({ disputeId: selectedDispute.id, message: reply });
      setReply('');
      // Refresh the selected dispute from the updated list
      const updated = disputes.find(d => d.id === selectedDispute.id);
      if (updated) setSelectedDispute(updated);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs} hrs ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 p-4 pt-8 space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen pb-24 p-4 pt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Dispute Center</h1>
          <p className="text-xs text-text-secondary">Track and manage your trade resolutions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <AlertCircle size={20} className="text-amber-500 mb-2" />
          <p className="text-xs text-text-secondary font-medium">Active Cases</p>
          <h3 className="text-xl font-bold text-text-primary">
            {disputes.filter(d => d.status === 'open' || d.status === 'investigating').length}
          </h3>
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <CheckCircle2 size={20} className="text-emerald-500 mb-2" />
          <p className="text-xs text-text-secondary font-medium">Resolved</p>
          <h3 className="text-xl font-bold text-text-primary">
            {disputes.filter(d => d.status === 'resolved').length}
          </h3>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Trade ID..."
          className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-accent-primary"
        />
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.length > 0 ? (
          filteredDisputes.map((dispute, i) => (
            <motion.div
              key={dispute.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedDispute(dispute)}
              className="glass rounded-2xl border border-glass-border p-4 space-y-4 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                    <ShieldAlert size={20} className="text-accent-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">Trade: {dispute.trade_id}</h4>
                    <p className="text-[10px] text-text-secondary mt-0.5">{formatDate(dispute.created_at)}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getStatusColor(dispute.status)}`}>
                  {dispute.status}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-text-primary line-clamp-1">{dispute.reason}</p>
                <p className="text-[10px] text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                  {dispute.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-glass-border/50">
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-text-secondary" />
                  <span className="text-[10px] font-bold text-text-secondary">{dispute.messages?.length || 0} Messages</span>
                </div>
                <div className="flex items-center gap-1 text-accent-primary">
                  <span className="text-[10px] font-bold">View Details</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-bg-secondary/50 rounded-3xl border border-dashed border-glass-border">
            <Inbox size={40} className="mx-auto text-text-secondary/20 mb-3" />
            <p className="text-sm text-text-secondary">No disputes found</p>
            <p className="text-xs text-text-secondary mt-1">All your P2P trade disputes will appear here</p>
          </div>
        )}
      </div>

      {/* Dispute Detail Modal */}
      <AnimatePresence>
        {selectedDispute && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDispute(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[160] bg-bg-card rounded-t-[32px] border-t border-glass-border flex flex-col h-[85vh] w-full max-w-md mx-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-glass-border flex justify-between items-center bg-bg-secondary/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <ShieldAlert size={24} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Case: {selectedDispute.trade_id}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusColor(selectedDispute.status)}`}>
                        {selectedDispute.status}
                      </span>
                      <span className="text-[10px] text-text-secondary font-medium">
                        {formatDate(selectedDispute.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDispute(null)}
                  className="p-2 bg-bg-secondary rounded-full hover:bg-glass-border transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content - Scrollable Chat */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Case Info */}
                <div className="p-4 bg-bg-secondary rounded-2xl border border-glass-border space-y-3">
                  <h4 className="text-xs font-black text-text-secondary uppercase tracking-wider">Dispute Details</h4>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-text-primary">{selectedDispute.reason}</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{selectedDispute.description}</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <span className="px-2 py-1 bg-accent-primary/10 text-accent-primary rounded-lg text-[10px] font-bold">
                      Category: {selectedDispute.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Messages Timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-text-secondary uppercase tracking-wider text-center">Resolution Chat</h4>
                  {(!selectedDispute.messages || selectedDispute.messages.length === 0) ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-text-secondary">No messages yet</p>
                    </div>
                  ) : (
                    selectedDispute.messages.map((m) => (
                      <div key={m.id} className={`flex flex-col ${m.sender_type === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-2 mb-1 px-2">
                          <span className="text-[10px] font-bold text-text-secondary">
                            {m.sender_type === 'user' ? 'You' : m.sender_type === 'admin' ? 'Support Agent' : 'Counterparty'}
                          </span>
                          <span className="text-[8px] text-text-secondary opacity-50">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          m.sender_type === 'user' 
                            ? 'bg-accent-primary text-white rounded-tr-none shadow-lg shadow-accent-primary/10' 
                            : m.sender_type === 'admin'
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-tl-none'
                            : 'bg-bg-secondary border border-glass-border text-text-primary rounded-tl-none'
                        }`}>
                          {m.message}
                        </div>
                      </div>
                    ))
                  )}
                  <div className="text-center pt-2">
                    <span className="text-[9px] text-text-secondary font-medium uppercase tracking-widest bg-bg-secondary px-3 py-1 rounded-full">
                      Wait for admin resolution
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-glass-border bg-bg-secondary/50 shrink-0">
                <div className="flex items-center gap-2">
                  <button className="p-2.5 bg-bg-card border border-glass-border rounded-xl text-text-secondary hover:text-accent-primary transition-colors">
                    <Paperclip size={20} />
                  </button>
                  <div className="relative flex-1">
                    <input 
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Reply to the investigation..."
                      className="w-full bg-bg-card border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    disabled={!reply.trim() || isSending}
                    className="p-2.5 bg-accent-primary text-white rounded-xl shadow-lg shadow-accent-primary/20 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
