import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Lock, Unlock, QrCode, Wallet, Coins, RefreshCw, Loader2 } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

interface AdminWallet {
  id: string;
  user_id: string;
  nrt_balance: number;
  solana_public_key: string | null;
  status: string;
  users?: { email: string; country: string | null; role: string };
  // Mapped
  userEmail: string;
  country: string;
  role: string;
  nrtBalance: number;
  solanaAddress: string;
}

export default function AdminWallets() {
  usePageTitle('Admin — Wallets');
  const { showToast } = useToastStore();
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedWallet, setSelectedWallet] = useState<AdminWallet | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*, users!wallets_user_id_fkey(email, country, role)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWallets((data || []).map((w: any) => ({
        ...w,
        userEmail: w.users?.email || 'Unknown',
        country: w.users?.country || 'Global',
        role: w.users?.role || 'user',
        nrtBalance: Number(w.nrt_balance || 0),
        solanaAddress: w.solana_public_key || 'No address assigned',
      })));
    } catch (e: any) { console.error('Fetch wallets:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allCountries = useMemo(() => {
    const uniqueCountries = new Set(wallets.map(w => w.country));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [wallets]);

  const filtered = wallets.filter(w => {
    const q = search.toLowerCase();
    const matchQ = !q || w.userEmail.toLowerCase().includes(q) || w.solanaAddress.toLowerCase().includes(q) || w.country.toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || w.country === countryFilter;
    const matchStatus = statusFilter === 'All' || w.status === statusFilter;
    const matchRole = roleFilter === 'All' || w.role === roleFilter;
    return matchQ && matchCountry && matchStatus && matchRole;
  });

  const handleFreeze = async (id: string, frozen: boolean) => {
    try {
      const { error } = await supabase.from('wallets').update({ status: frozen ? 'frozen' : 'active' }).eq('id', id);
      if (error) throw error;
      setWallets(prev => prev.map(w => w.id === id ? { ...w, status: frozen ? 'frozen' : 'active' } : w));
      showToast(`Wallet ${frozen ? 'frozen' : 'unfrozen'}.`, 'success');
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Wallets & NRT Addresses</h1>
        <p className="text-sm text-text-secondary">{wallets.length} wallets · {wallets.reduce((s, w) => s + w.nrtBalance, 0).toLocaleString()} NRT total</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Wallet, label: 'Total Wallets', value: wallets.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: Coins, label: 'Total Balance', value: `${wallets.reduce((s, w) => s + w.nrtBalance, 0).toLocaleString()} NRT`, color: '#8b5cf6', bg: 'bg-purple-500/10' },
          { icon: Unlock, label: 'Active', value: wallets.filter(w => w.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Lock, label: 'Frozen', value: wallets.filter(w => w.status === 'frozen').length.toString(), color: '#EF4444', bg: 'bg-red-500/10' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, address, or country..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Roles</option>
          <option value="user">User</option>
          <option value="sp">Service Provider</option>
          <option value="isp">ISP</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map(w => (
          <div key={w.id} className="bg-bg-card border border-glass-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-text-primary">{w.userEmail}</p>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${w.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{w.status}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-bg-secondary text-text-secondary">{w.role}</span>
              </div>
              <p className="text-xs font-mono text-text-secondary truncate">{w.solana_public_key ? `NRT-${w.solana_public_key}` : w.solanaAddress}</p>
              <div className="flex items-center gap-4 text-xs text-text-secondary">
                <span>📍 {w.country}</span>
                <span className="font-bold text-accent-primary">{w.nrtBalance.toLocaleString()} NRT</span>
              </div>
            </div>
             <div className="flex items-center gap-2">
              <button onClick={() => setSelectedWallet(w)}
                className="p-2 bg-bg-secondary border border-glass-border rounded-lg text-text-secondary hover:text-accent-primary transition-colors">
                <QrCode size={16} />
              </button>
              <button onClick={() => handleFreeze(w.id, w.status === 'active')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${w.status === 'active' ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20'}`}>
                {w.status === 'active' ? <><Lock size={12} /> Freeze</> : <><Unlock size={12} /> Unfreeze</>}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No wallets found.</div>}
      </div>

      <AnimatePresence>
        {selectedWallet && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedWallet(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-bg-card border border-glass-border rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-accent-primary" />
              
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto text-accent-primary">
                  <Wallet size={40} />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold">NRT Wallet Details</h3>
                  <p className="text-sm text-text-secondary truncate">{selectedWallet.userEmail}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl mx-auto w-fit shadow-xl border-4 border-accent-primary/20">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedWallet.solanaAddress}`} 
                    alt="Wallet QR" 
                    className="w-40 h-40"
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <div className="bg-bg-secondary rounded-xl p-3 border border-glass-border">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Solana Public Key (NRT Address)</p>
                    <p className="text-xs font-mono text-accent-primary break-all">{selectedWallet.solana_public_key ? `NRT-${selectedWallet.solana_public_key}` : selectedWallet.solanaAddress}</p>
                  </div>
                  
                  <div className="flex justify-between text-sm bg-bg-secondary p-3 rounded-xl border border-glass-border">
                    <span className="text-text-secondary">Balance</span>
                    <span className="font-bold text-accent-primary">{selectedWallet.nrtBalance.toLocaleString()} NRT</span>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedWallet(null)}
                  className="w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl hover:bg-glass-bg transition-colors"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
