import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Wallet, CheckCircle, XCircle, AlertCircle, Clock, FileText, X, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import LocationSearch from '@/components/LocationSearch';
import { useToastStore } from '@/stores/useToastStore';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount_nrt: number;
  amount_fiat: number;
  fee_fiat?: number;
  currency: string;
  status: string;
  withdrawal_type?: 'fiat' | 'crypto';
  crypto_address?: string;
  created_at: string;
  processed_at: string | null;
  payment_method_id: string;
  users?: { email: string };
  user_payment_methods?: {
    account_number: string;
    account_name: string;
    platform_banks?: { name: string };
  };
  // Mapped UI fields
  userEmail: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  country: string;
}

interface DepositTransaction {
  id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  user_email: string;
  country: string;
}

export default function AdminWithdrawals() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [deposits, setDeposits] = useState<DepositTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'deposits'>('withdrawals');
  const [treasuryBalance, setTreasuryBalance] = useState(0);
  const [liquidityPools, setLiquidityPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [selectedReq, setSelectedReq] = useState<WithdrawalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToastStore();

  // Disbursement mode: 'auto' or 'manual'
  const [disbursementMode, setDisbursementMode] = useState('manual');
  const [opayDeposits, setOpayDeposits] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('kv_settings').select('value').eq('key', 'withdrawal_disbursement_mode').single();
      if (data?.value) setDisbursementMode(data.value);
    })();
  }, []);

  const toggleDisbursementMode = async () => {
    const newMode = disbursementMode === 'manual' ? 'auto' : 'manual';
    await supabase.from('kv_settings').upsert({ key: 'withdrawal_disbursement_mode', value: newMode });
    setDisbursementMode(newMode);
    showToast(`Disbursement mode set to ${newMode}`, 'success');
  };

  const fetchLiquidity = useCallback(async () => {
    try {
      const { data: treasury } = await supabase.from('admin_treasury').select('nrt_balance').limit(1).maybeSingle();
      if (treasury) setTreasuryBalance(treasury.nrt_balance || 0);

      const { data: pools } = await supabase.from('gateway_liquidity').select('*').order('provider_name');
      if (pools) setLiquidityPools(pools);
    } catch (e) {
      console.error('Fetch liquidity:', e);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          users(email, country),
          user_payment_methods(
            account_number,
            account_name,
            platform_banks(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      setRequests((data || []).map((r: any) => ({
        ...r,
        userEmail: r.users?.email || 'Unknown',
        country: r.users?.country || 'Unknown',
        accountName: r.user_payment_methods?.account_name || 'N/A',
        accountNumber: r.user_payment_methods?.account_number || 'N/A',
        bankName: r.user_payment_methods?.platform_banks?.name || 'N/A'
      })));
    } catch (e: any) {
      console.error('Fetch withdrawals:', e);
      showToast('Failed to load withdrawals', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchDeposits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, amount, description, status, created_at,
          wallets(users(email, country))
        `)
        .ilike('description', 'Instant Purchase%')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      setDeposits((data || []).map((d: any) => ({
        id: d.id,
        amount: d.amount,
        description: d.description,
        status: d.status,
        created_at: d.created_at,
        user_email: d.wallets?.users?.email || 'Unknown',
        country: d.wallets?.users?.country || 'Unknown'
      })));

      // Also fetch OPay payments
      const { data: opayData } = await supabase
        .from('opay_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setOpayDeposits(opayData || []);
    } catch (e) {
      console.error('Fetch deposits:', e);
    }
  }, []);

  useEffect(() => { 
    fetchRequests(); 
    fetchDeposits();
    fetchLiquidity();
  }, [fetchRequests, fetchDeposits, fetchLiquidity]);

  const filteredWithdrawals = useMemo(() => requests.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.userEmail.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.accountName.toLowerCase().includes(q) || r.country.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchCountry = countryFilter === 'Global' || r.country === countryFilter;
    return matchQ && matchStatus && matchCountry;
  }), [requests, search, statusFilter, countryFilter]);

  const filteredDeposits = useMemo(() => deposits.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.user_email.toLowerCase().includes(q) || d.id.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.country.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    const matchCountry = countryFilter === 'Global' || d.country === countryFilter;
    return matchQ && matchStatus && matchCountry;
  }), [deposits, search, statusFilter, countryFilter]);

  const handleAction = async (id: string, targetStatus: string) => {
    if (!confirm(`Are you sure you want to mark this withdrawal as ${targetStatus}?`)) return;
    
    setActionLoading(true);
    try {
      const reason = targetStatus === 'rejected' ? 'Rejected by admin' : (targetStatus === 'failed' ? 'Processing failed' : null);
      
      // If it's a crypto withdrawal and we're processing it, trigger the edge function first
      if (selectedReq?.withdrawal_type === 'crypto' && targetStatus === 'completed') {
        const { data: mintData } = await supabase.from('kv_settings').select('value').eq('key', 'nrt_mint_address').single();
        if (!mintData || !mintData.value) throw new Error('NRT Mint Address not configured');

        // Fetch user wallet ID
        const { data: walletData } = await supabase.from('wallets').select('id').eq('user_id', selectedReq.user_id).single();
        if (!walletData) throw new Error('User wallet not found');

        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('dispense-nrt', {
          body: {
            amount_nrt: selectedReq.amount_nrt,
            solana_address: selectedReq.crypto_address,
            nrt_mint_address: mintData.value,
            user_id: selectedReq.user_id,
            wallet_id: walletData.id
          }
        });

        if (edgeError || !edgeData?.success) {
          throw new Error(edgeError?.message || edgeData?.error || 'Failed to dispense tokens on-chain');
        }
      }

      const { data, error } = await supabase.rpc('admin_process_withdrawal', {
        p_withdrawal_id: id,
        p_status: targetStatus,
        p_reason: reason
      });

      if (error) throw error;
      if (data && data.success) {
        showToast(`Withdrawal marked as ${targetStatus}${data.refunded ? ' (NRT Refunded)' : ''}`, 'success');
        fetchRequests();
        fetchLiquidity();
        setSelectedReq(null);
      } else {
        throw new Error('Action failed on backend');
      }
    } catch (e: any) {
      console.error('Process error:', e);
      showToast(e.message || 'Failed to process withdrawal', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-500/20 text-green-500">Completed</span>;
      case 'pending': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/20 text-amber-500">Pending</span>;
      case 'failed': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-red-500/20 text-red-500">Failed</span>;
      case 'rejected': return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gray-500/20 text-gray-400">Rejected</span>;
      default: return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-bg-secondary text-text-secondary">{status}</span>;
    }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black">Fiat Management</h1>
          <p className="text-sm text-text-secondary">Treasury, Liquidity, and automated transactions</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Disbursement Mode Toggle */}
          <div className="flex items-center gap-2 bg-bg-secondary border border-glass-border rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-text-secondary">Disbursement:</span>
            <button onClick={toggleDisbursementMode}
              className={`relative w-20 h-7 rounded-full transition-colors ${disbursementMode === 'auto' ? 'bg-emerald-500' : 'bg-gray-600'}`}>
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${disbursementMode === 'auto' ? 'translate-x-[52px]' : 'translate-x-0.5'}`} />
              <span className={`absolute inset-0 flex items-center text-[10px] font-black text-white ${disbursementMode === 'auto' ? 'justify-start pl-2' : 'justify-end pr-2'}`}>
                {disbursementMode === 'auto' ? 'AUTO' : 'MANUAL'}
              </span>
            </button>
          </div>
          <div className="flex bg-bg-secondary p-1 rounded-xl border border-glass-border">
            {[
              { id: 'withdrawals', label: 'Withdrawals' },
              { id: 'deposits', label: 'Instant Purchases' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-2xl border border-glass-border bg-gradient-to-br from-accent-primary/20 to-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center"><Wallet size={16} className="text-accent-primary" /></div>
            <p className="text-xs font-bold text-accent-primary uppercase tracking-wider">Platform Treasury</p>
          </div>
          <h3 className="text-2xl font-black text-text-primary mt-1">{treasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} NRT</h3>
          <p className="text-[10px] text-text-secondary mt-1">Total accumulated wealth</p>
        </div>
        
        {[
          { icon: Clock, label: 'Pending Requests', value: requests.filter(r => r.status === 'pending').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
          { icon: CheckCircle, label: 'Completed', value: requests.filter(r => r.status === 'completed').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: AlertCircle, label: 'Failed/Rejected', value: requests.filter(r => ['failed', 'rejected'].includes(r.status)).length.toString(), color: '#EF4444', bg: 'bg-red-500/10' },
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {liquidityPools.map(pool => (
          <div key={pool.id} className="glass p-4 rounded-2xl border border-glass-border flex justify-between items-center">
            <div>
              <p className="text-xs text-text-secondary font-medium">{pool.provider_name} Pool</p>
              <p className="text-lg font-bold text-text-primary mt-0.5">{pool.currency} {pool.fiat_balance.toLocaleString()}</p>
            </div>
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${pool.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {pool.status}
            </span>
          </div>
        ))}
        {liquidityPools.length === 0 && (
          <div className="col-span-3 text-center text-sm text-text-secondary py-4 glass rounded-2xl border border-glass-border">No gateway liquidity pools configured.</div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, name, country or ID..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none">
          <LocationSearch value={countryFilter} onChange={setCountryFilter} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none min-w-[150px]">
          <option value="All">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'withdrawals' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border bg-bg-secondary">
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Bank Details</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-text-secondary">Loading withdrawals...</td></tr>
                ) : filteredWithdrawals.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-text-secondary">No withdrawals found.</td></tr>
                ) : (
                  filteredWithdrawals.map(req => (
                    <tr key={req.id} onClick={() => setSelectedReq(req)} className="hover:bg-bg-secondary/50 transition-colors cursor-pointer">
                      <td className="px-4 py-3 text-text-secondary">{new Date(req.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-text-primary font-medium">{req.userEmail}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-text-secondary/60" />
                          {req.country}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-text-primary">
                          {req.withdrawal_type === 'crypto' ? 'Crypto Transfer' : `${req.amount_fiat.toLocaleString()} ${req.currency}`}
                        </div>
                        <div className="text-xs text-text-secondary">{req.amount_nrt.toLocaleString()} NRT deducted</div>
                      </td>
                      <td className="px-4 py-3">
                        {req.withdrawal_type === 'crypto' ? (
                          <>
                            <div className="text-accent-primary font-mono text-[10px] break-all">{req.crypto_address}</div>
                            <div className="text-[10px] text-text-secondary uppercase">Solana Network</div>
                          </>
                        ) : (
                          <>
                            <div className="text-text-primary">{req.bankName}</div>
                            <div className="text-xs text-text-secondary">{req.accountNumber} ({req.accountName})</div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleAction(req.id, 'completed')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors" title="Approve">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handleAction(req.id, 'rejected')} className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Reject">
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border bg-bg-secondary">
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">NRT Received</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Method</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">OPay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-text-secondary">Loading purchases...</td></tr>
                  ) : filteredDeposits.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-text-secondary">No instant purchases found.</td></tr>
                  ) : (
                    filteredDeposits.map(dep => {
                      // Find matching OPay payment if any
                      const opayMatch = opayDeposits.find(op => dep.description?.includes('OPay') && op.amount_nrt && Math.abs(op.amount_nrt - dep.amount) < 0.01);
                      return (
                        <tr key={dep.id} className="hover:bg-bg-secondary/50 transition-colors">
                          <td className="px-4 py-3 text-text-secondary">{new Date(dep.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3 text-text-primary font-medium">{dep.user_email}</td>
                          <td className="px-4 py-3 text-text-secondary">
                            <div className="flex items-center gap-1">
                              <MapPin size={12} className="text-text-secondary/60" />
                              {dep.country}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-accent-primary font-bold">{dep.amount.toLocaleString()} NRT</td>
                          <td className="px-4 py-3 text-text-secondary text-xs">{dep.description}</td>
                          <td className="px-4 py-3">
                            {getStatusBadge(dep.status)}
                          </td>
                          <td className="px-4 py-3">
                            {opayMatch ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${opayMatch.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : opayMatch.status === 'PENDING' || opayMatch.status === 'INITIAL' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{opayMatch.status}</span>
                            ) : (
                              <span className="text-text-secondary/40 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              
              {/* OPay Payments Table */}
              {opayDeposits.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-text-secondary mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-black">OP</div>
                    OPay Payment Records ({opayDeposits.length})
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-glass-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-glass-border bg-bg-secondary">
                          <th className="text-left px-3 py-2 text-[10px] font-bold text-text-secondary uppercase">Date</th>
                          <th className="text-left px-3 py-2 text-[10px] font-bold text-text-secondary uppercase">Reference</th>
                          <th className="text-left px-3 py-2 text-[10px] font-bold text-text-secondary uppercase">Fiat</th>
                          <th className="text-left px-3 py-2 text-[10px] font-bold text-text-secondary uppercase">NRT</th>
                          <th className="text-left px-3 py-2 text-[10px] font-bold text-text-secondary uppercase">Status</th>
                          <th className="text-left px-3 py-2 text-[10px] font-bold text-text-secondary uppercase">OPay TxID</th>
                          <th className="text-left px-3 py-2 text-[10px] font-bold text-text-secondary uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass-border">
                        {opayDeposits.map(op => (
                          <tr key={op.id} className="hover:bg-bg-secondary/50">
                            <td className="px-3 py-2 text-xs text-text-secondary">{new Date(op.created_at).toLocaleString()}</td>
                            <td className="px-3 py-2 text-xs font-mono text-text-primary">{op.reference}</td>
                            <td className="px-3 py-2 text-xs font-bold">{op.currency} {op.amount_fiat?.toLocaleString()}</td>
                            <td className="px-3 py-2 text-xs font-bold text-accent-primary">{op.amount_nrt?.toFixed(2)}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                op.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                                op.status === 'FAIL' || op.status === 'CLOSE' ? 'bg-red-500/20 text-red-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>{op.status}</span>
                            </td>
                            <td className="px-3 py-2 text-[10px] font-mono text-text-secondary">{op.opay_transaction_id || '—'}</td>
                            <td className="px-3 py-2">
                              {(op.status === 'INITIAL' || op.status === 'PENDING') && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const { data, error } = await supabase.functions.invoke('opay-query-status', {
                                        body: { reference: op.reference, order_no: op.order_no }
                                      });
                                      if (error) throw error;
                                      showToast(`OPay status: ${data?.opay_response?.data?.status || 'Unknown'}`, 'info');
                                      fetchDeposits(); // Refresh
                                    } catch (e: any) {
                                      showToast(e.message || 'Query failed', 'danger');
                                    }
                                  }}
                                  className="px-2 py-1 bg-accent-primary/10 text-accent-primary text-[10px] font-bold rounded-lg hover:bg-accent-primary/20 transition-colors"
                                >
                                  Verify
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail & Action Modal */}
      <AnimatePresence>
        {selectedReq && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !actionLoading && setSelectedReq(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              
              <div className="p-5 border-b border-glass-border flex justify-between items-start bg-bg-secondary">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <FileText size={20} className="text-accent-primary" /> Withdrawal Details
                  </h3>
                  <p className="text-sm text-text-secondary mt-1 font-mono text-[10px] break-all">ID: {selectedReq.id}</p>
                </div>
                <button disabled={actionLoading} onClick={() => setSelectedReq(null)} className="p-1.5 rounded-full hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center glass p-4 rounded-xl border border-glass-border">
                  <div>
                    <p className="text-xs text-text-secondary">
                      {selectedReq.withdrawal_type === 'crypto' ? 'Crypto Withdrawal' : 'Net Fiat Payout'}
                    </p>
                    <p className="text-2xl font-black text-text-primary">
                      {selectedReq.withdrawal_type === 'crypto' ? `${selectedReq.amount_nrt.toLocaleString()} NRT` : `${selectedReq.amount_fiat.toLocaleString()} ${selectedReq.currency}`}
                    </p>
                    {selectedReq.withdrawal_type === 'fiat' && selectedReq.fee_fiat > 0 && (
                      <p className="text-xs text-green-500 font-medium">+ {selectedReq.fee_fiat.toLocaleString()} {selectedReq.currency} (1.5% Fee Kept)</p>
                    )}
                  </div>
                  {getStatusBadge(selectedReq.status)}
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">User Email</p>
                      <p className="font-medium">{selectedReq.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Requested At</p>
                      <p className="font-medium">{new Date(selectedReq.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="bg-bg-secondary/50 p-3 rounded-xl border border-glass-border mt-2 space-y-2 text-sm">
                    {selectedReq.withdrawal_type === 'crypto' ? (
                      <>
                        <p className="font-bold text-accent-primary uppercase text-[10px] tracking-wider mb-2">Solana Destination</p>
                        <div className="flex justify-between flex-col gap-1">
                          <span className="text-text-secondary">Wallet Address:</span>
                          <span className="font-mono text-xs break-all text-accent-primary">{selectedReq.crypto_address}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-accent-primary uppercase text-[10px] tracking-wider mb-2">Bank Transfer Details</p>
                        <div className="flex justify-between"><span className="text-text-secondary">Bank Name:</span><span className="font-bold">{selectedReq.bankName}</span></div>
                        <div className="flex justify-between"><span className="text-text-secondary">Account Name:</span><span className="font-bold">{selectedReq.accountName}</span></div>
                        <div className="flex justify-between"><span className="text-text-secondary">Account No:</span><span className="font-mono font-bold tracking-wider">{selectedReq.accountNumber}</span></div>
                      </>
                    )}
                  </div>
                </div>

                {selectedReq.status === 'pending' && (
                  <div className="pt-4 mt-4 border-t border-glass-border space-y-3">
                    <button 
                      onClick={() => handleAction(selectedReq.id, 'completed')} 
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={18} /> 
                      {selectedReq.withdrawal_type === 'crypto' ? 'Approve & Send via Solana' : 'Mark as Completed'}
                    </button>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAction(selectedReq.id, 'failed')} 
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 bg-bg-secondary hover:bg-glass-border text-red-400 py-2.5 rounded-xl font-bold transition-colors border border-red-500/20 disabled:opacity-50"
                      >
                        <AlertCircle size={16} /> Fail (Refund)
                      </button>
                      <button 
                        onClick={() => handleAction(selectedReq.id, 'rejected')} 
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 bg-bg-secondary hover:bg-glass-border text-text-secondary py-2.5 rounded-xl font-bold transition-colors border border-glass-border disabled:opacity-50"
                      >
                        <XCircle size={16} /> Reject (Refund)
                      </button>
                    </div>
                  </div>
                )}
                
                {selectedReq.status !== 'pending' && selectedReq.processed_at && (
                  <div className="pt-4 mt-4 border-t border-glass-border">
                    <p className="text-xs text-center text-text-secondary">
                      This request was marked as <strong className="uppercase">{selectedReq.status}</strong> on {new Date(selectedReq.processed_at).toLocaleString()}
                    </p>
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
