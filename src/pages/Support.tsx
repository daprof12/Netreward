import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Plus, MessageSquare, ChevronLeft, Send, AlertCircle, Loader2, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useToastStore } from '@/stores/useToastStore';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/hooks/usePageTitle';

const supportSchema = z.object({
  category: z.string().min(1, 'Please select a category'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(10, 'Please provide more details (at least 10 characters)'),
});

type SupportFormValues = z.infer<typeof supportSchema>;

export default function Support() {
  usePageTitle('Support');
  const [view, setView] = useState<'list' | 'create'>('list');
  const { tickets, isLoading, createTicket, isCreating } = useSupportTickets();
  const { showToast } = useToastStore();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SupportFormValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      category: 'Rewards & Earnings',
      subject: '',
      description: ''
    }
  });

  const onSubmit = async (data: SupportFormValues) => {
    try {
      await createTicket(data);
      showToast('Ticket submitted successfully', 'success');
      reset();
      setView('list');
    } catch (error: any) {
      showToast(error.message || 'Failed to submit ticket', 'danger');
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
      <div className="space-y-6 pb-24 p-4 pt-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-[20px]" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 bg-bg-secondary rounded-full hover:bg-glass-bg transition-colors">
            <ChevronLeft size={20} className="text-text-primary" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Support Center</h1>
        </div>
        
        {view === 'list' && (
          <button 
            onClick={() => setView('create')}
            className="p-2 bg-accent-primary text-primary-foreground rounded-full shadow-lg shadow-accent-primary/20"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="glass p-5 rounded-[20px] border border-glass-border flex items-center gap-4 mb-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary shrink-0">
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Need Help?</h3>
                <p className="text-sm text-text-secondary leading-tight mt-1">Our support team usually responds within 24 hours.</p>
              </div>
            </div>

            <h3 className="font-semibold text-lg mt-6">Your Tickets</h3>
            
            {tickets.length === 0 ? (
              <div className="glass rounded-xl border border-glass-border p-8 text-center">
                <Inbox size={32} className="mx-auto mb-3 text-text-secondary opacity-20" />
                <p className="text-sm text-text-secondary">No support tickets yet</p>
                <p className="text-xs text-text-secondary mt-1">Tap + to create your first ticket</p>
              </div>
            ) : (
              tickets.map((ticket, i) => {
                const statusLabel = ticket.status === 'open' ? 'Open' : 
                                    ticket.status === 'in_progress' ? 'In Progress' : 
                                    ticket.status === 'resolved' ? 'Resolved' : 'Closed';
                return (
                  <div key={ticket.id} className="glass p-4 rounded-xl border border-glass-border cursor-pointer hover:bg-glass-bg/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-text-secondary">{ticket.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        ticket.status === 'open' ? 'bg-accent-primary/10 text-accent-primary' : 
                        ticket.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-bg-secondary text-text-secondary'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                    <h4 className="font-semibold text-text-primary text-sm mb-3">{ticket.subject}</h4>
                    <div className="flex justify-between items-center text-xs text-text-secondary">
                      <span>{formatDate(ticket.created_at)}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={12} /> {ticket.category}</span>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass rounded-[20px] p-5 border border-glass-border shadow-lg"
          >
            <h3 className="font-semibold text-lg mb-4">Create New Ticket</h3>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
                <select 
                  {...register('category')}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl p-3 text-text-primary outline-none focus:border-accent-primary appearance-none"
                >
                  <option value="Rewards & Earnings">Rewards & Earnings</option>
                  <option value="Device Connection">Device Connection</option>
                  <option value="Account Settings">Account Settings</option>
                  <option value="P2P Dispute">P2P Dispute</option>
                  <option value="Other">Other</option>
                </select>
                {errors.category && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.category.message}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Subject</label>
                <input 
                  type="text" 
                  placeholder="Brief summary of your issue"
                  {...register('subject')}
                  className={`w-full bg-bg-secondary border ${errors.subject ? 'border-red-500' : 'border-glass-border'} rounded-xl p-3 text-text-primary outline-none focus:border-accent-primary`}
                />
                {errors.subject && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.subject.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea 
                  placeholder="Please provide as much detail as possible..."
                  rows={5}
                  {...register('description')}
                  className={`w-full bg-bg-secondary border ${errors.description ? 'border-red-500' : 'border-glass-border'} rounded-xl p-3 text-text-primary outline-none focus:border-accent-primary resize-none`}
                ></textarea>
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    reset();
                    setView('list');
                  }}
                  className="flex-1 bg-bg-secondary text-text-primary font-semibold py-3.5 rounded-xl border border-glass-border"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 flex items-center justify-center gap-2 bg-accent-primary text-primary-foreground font-semibold py-3.5 rounded-xl shadow-lg shadow-accent-primary/20 disabled:opacity-50"
                >
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {isCreating ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
