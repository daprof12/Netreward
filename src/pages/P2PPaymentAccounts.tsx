import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Plus, Trash2, ShieldCheck, 
  Banknote, Smartphone, CreditCard, X, Globe
} from 'lucide-react';
import { useP2PStore } from '@/stores/useP2PStore';
import type { PaymentAccount } from '@/stores/useP2PStore';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import LocationSearch from '@/components/LocationSearch';
import * as z from 'zod';
import { AlertCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

const accountSchema = z.object({
  type: z.enum(['bank', 'mobile_money', 'fintech']),
  country: z.string().min(1, 'Location is required'),
  provider: z.string().min(2, 'Provider name is required'),
  accountName: z.string().min(2, 'Account name is required'),
  accountNumber: z.string().min(5, 'Account number must be at least 5 digits'),
});

export default function P2PPaymentAccounts() {
  usePageTitle('Payment Accounts');
  const navigate = useNavigate();
  const { paymentAccounts, addPaymentAccount, deletePaymentAccount } = useP2PStore();
  const { showToast } = useToastStore();
  const [localBanks, setLocalBanks] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('local_banks').select('*').eq('status', 'active').order('name');
      setLocalBanks(data || []);
    })();
  }, []);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAcc, setNewAcc] = useState<Partial<PaymentAccount>>({
    type: 'bank',
    provider: '',
    accountName: '',
    accountNumber: '',
    country: 'Nigeria',
  });

  const availableCountries = [...new Set(localBanks.map((b: any) => b.country))].sort();
  const filteredBanks = localBanks.filter((b: any) => b.country && newAcc.country?.includes(b.country) && b.status === 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAdd = () => {
    try {
      accountSchema.parse(newAcc);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(e => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
        showToast('Please fix the errors in the form', 'danger');
        return;
      }
    }

    addPaymentAccount(newAcc as any);
    setShowAddModal(false);
    showToast('Payment account added!', 'success');
    setNewAcc({ type: 'bank', provider: '', accountName: '', accountNumber: '', country: 'Nigeria' });
  };

  return (
    <motion.div
      className="min-h-screen pb-24 p-4 pt-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Payment Methods</h1>
            <p className="text-xs text-text-secondary">Used for P2P transactions</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="p-2 bg-accent-primary text-white rounded-full shadow-lg shadow-accent-primary/20"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {paymentAccounts.length > 0 ? (
          paymentAccounts.map((acc, i) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl border border-glass-border p-4 flex items-center gap-4 relative overflow-hidden"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                acc.type === 'bank' ? 'bg-blue-500/10 text-blue-400' : 
                acc.type === 'mobile_money' ? 'bg-amber-500/10 text-amber-400' : 'bg-purple-500/10 text-purple-400'
              }`}>
                {acc.type === 'bank' ? <Banknote size={24} /> : 
                 acc.type === 'mobile_money' ? <Smartphone size={24} /> : <CreditCard size={24} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-text-primary truncate">{acc.provider}</h3>
                  {acc.isVerified && <ShieldCheck size={14} className="text-emerald-400" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Globe size={10} className="text-text-secondary" />
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{acc.country}</span>
                </div>
                <p className="text-sm text-text-primary font-medium mt-1">{acc.accountName}</p>
                <p className="text-xs text-text-secondary mt-0.5 tracking-wider font-mono">{acc.accountNumber}</p>
              </div>

              <button 
                onClick={() => deletePaymentAccount(acc.id)}
                className="p-2 text-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 size={18} />
              </button>

              <div className="absolute top-0 right-0 p-1">
                 <span className={`text-[8px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded-bl-lg ${
                   acc.isVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                 }`}>
                   {acc.isVerified ? 'Verified' : 'Pending'}
                 </span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-bg-secondary/50 rounded-3xl border border-dashed border-glass-border">
            <p className="text-sm text-text-secondary">No payment methods added yet.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-accent-primary font-bold text-sm"
            >
              + Add Account
            </button>
          </div>
        )}
      </div>

      {/* Security Tip */}
      <div className="mt-8 p-4 glass border border-blue-500/20 rounded-2xl bg-blue-500/5">
        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Security Tip</h4>
        <p className="text-[11px] text-text-secondary leading-relaxed">
          Always ensure your account name matches your KYC verified name. Sellers may reject payments from names that don't match the trade participant.
        </p>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-glass-border rounded-3xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold text-lg">Add Account</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 bg-bg-secondary rounded-full">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['bank', 'mobile_money', 'fintech'] as const).map(t => (
                      <button 
                        key={t}
                        onClick={() => setNewAcc({ ...newAcc, type: t, provider: '' })}
                        className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${
                          newAcc.type === t ? 'bg-accent-primary/10 border-accent-primary text-accent-primary' : 'bg-bg-secondary border-glass-border text-text-secondary'
                        }`}
                      >
                        {t.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Location</label>
                  <LocationSearch
                    value={newAcc.country || ''}
                    onChange={val => setNewAcc({ ...newAcc, country: val, provider: '' })}
                    placeholder="Search country or city"
                    hasError={!!errors.country}
                  />
                  {errors.country && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.country}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Provider (Bank/Wallet Name)</label>
                  {newAcc.type === 'bank' ? (
                    <select 
                      value={newAcc.provider}
                      onChange={e => setNewAcc({ ...newAcc, provider: e.target.value })}
                      className={`w-full bg-bg-secondary border ${errors.provider ? 'border-red-500' : 'border-glass-border'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary`}
                    >
                      <option value="">Select a Bank</option>
                      {filteredBanks.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      value={newAcc.provider}
                      onChange={e => setNewAcc({ ...newAcc, provider: e.target.value })}
                      placeholder="e.g. PayPal, CashApp, OPay"
                      className={`w-full bg-bg-secondary border ${errors.provider ? 'border-red-500' : 'border-glass-border'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary`}
                    />
                  )}
                  {errors.provider && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.provider}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Account Name</label>
                  <input 
                    value={newAcc.accountName}
                    onChange={e => setNewAcc({ ...newAcc, accountName: e.target.value })}
                    placeholder="Matches your KYC"
                    className={`w-full bg-bg-secondary border ${errors.accountName ? 'border-red-500' : 'border-glass-border'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary`}
                  />
                  {errors.accountName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.accountName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase">Account Number / ID</label>
                  <input 
                    value={newAcc.accountNumber}
                    onChange={e => setNewAcc({ ...newAcc, accountNumber: e.target.value })}
                    placeholder="0000 0000 0000"
                    className={`w-full bg-bg-secondary border ${errors.accountNumber ? 'border-red-500' : 'border-glass-border'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary font-mono`}
                  />
                  {errors.accountNumber && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {errors.accountNumber}</p>}
                </div>

                <button 
                  onClick={handleAdd}
                  className="w-full py-4 bg-accent-primary text-white font-bold rounded-2xl shadow-lg shadow-accent-primary/20 mt-2"
                >
                  Save Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
