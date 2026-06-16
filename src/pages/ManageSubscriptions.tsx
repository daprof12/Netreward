import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, Filter, CreditCard, Clock, Store, 
  ChevronRight, Calendar, Info, Loader2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useAuthStore } from '@/stores/useAuthStore';

export default function ManageSubscriptions() {
  usePageTitle('Manage Subscriptions');
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const { subscriptions, loading, toggleAutoRenew } = useSubscriptions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sp' | 'isp'>('all');

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = sub.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sub.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || sub.merchant_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [subscriptions, searchQuery, filterType]);

  const activeCount = filteredSubscriptions.filter(s => s.status === 'active').length;

  return (
    <motion.div 
      className="space-y-6 pb-24 p-4 pt-8 min-h-screen relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-xl glass border border-glass-border flex items-center justify-center hover:bg-glass-bg active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-text-primary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Subscriptions</h1>
            <p className="text-xs text-text-secondary">{activeCount} active subscriptions</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-accent-primary/10 border border-accent-primary/20 rounded-xl px-4 py-4 mb-4">
        <Info size={20} className="text-accent-primary mt-0.5 shrink-0" />
        <p className="text-xs text-text-secondary leading-relaxed">
          Manage your automated payments for services and networks paid via Scan2Pay or DeepLink checkouts.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by merchant or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-primary/50 transition-colors"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'sp', 'isp'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${
                filterType === type 
                  ? 'bg-accent-primary text-primary-foreground border-accent-primary' 
                  : 'bg-bg-secondary text-text-secondary border-glass-border hover:border-text-secondary/30'
              }`}
            >
              {type === 'all' ? 'All' : type === 'sp' ? 'Services' : 'Networks'}
            </button>
          ))}
        </div>
      </div>

      {/* Subscription List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-text-secondary space-y-4">
            <Loader2 size={32} className="animate-spin text-accent-primary" />
            <p className="text-sm">Loading subscriptions...</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 glass rounded-2xl border border-glass-border p-6">
            <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center">
              <CreditCard size={28} className="text-text-secondary opacity-50" />
            </div>
            <div>
              <p className="font-bold text-lg mb-1">No subscriptions found</p>
              <p className="text-sm text-text-secondary">You don't have any active automated payments matching your filters.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredSubscriptions.map(sub => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass p-5 rounded-2xl border border-glass-border space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {sub.merchant_logo ? (
                      <img src={sub.merchant_logo} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                        <Store size={24} className="text-accent-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-text-primary">{sub.merchant_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-md">
                          {sub.category}
                        </span>
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                          <Clock size={12} /> {sub.merchant_type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-accent-primary text-lg">{sub.amount_nrt} NRT</p>
                    <p className="text-[10px] text-text-secondary">/ cycle</p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-y border-glass-border">
                  <div>
                    <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <Calendar size={14} className="text-text-secondary" />
                      Next Renewal
                    </p>
                    <p className="text-xs text-text-secondary mt-1 ml-5">
                      {new Date(sub.next_renewal_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-text-secondary">Auto-Renew</span>
                    <button
                      onClick={() => toggleAutoRenew(sub.id, !sub.auto_renew)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        sub.auto_renew ? 'bg-accent-primary' : 'bg-bg-secondary border border-glass-border'
                      }`}
                    >
                      <motion.div
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm`}
                        animate={{ x: sub.auto_renew ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>

                <Link
                  to={`/transactions?merchant=${sub.merchant_id}`}
                  className="w-full py-3 bg-bg-secondary flex items-center justify-center gap-2 rounded-xl text-sm font-bold hover:bg-glass-bg transition-colors"
                >
                  <History size={16} />
                  View History
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
