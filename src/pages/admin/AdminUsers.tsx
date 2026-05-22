import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, X, Smartphone, Users, ShieldCheck, Activity, RefreshCw, MapPin, Wallet, Gift, Loader2, UserPlus } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import NrtAmount from '@/components/ui/NrtAmount';

interface AdminUser {
  id: string;
  email: string;
  role: 'user' | 'sp' | 'isp' | 'admin';
  active_role: 'user' | 'sp' | 'isp' | 'admin';
  is_sp: boolean;
  is_isp: boolean;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  status: string;
  kyc_status: string;
  created_at: string;
  nrt_balance: number;
  device_count: number;
  referral_count: number;
  referral_bonus: number;
}

const ROLES = ['user', 'sp', 'isp', 'admin'] as const;
const STATUSES = ['active', 'suspended', 'pending'] as const;
const KYC = ['verified', 'pending', 'rejected', 'none'] as const;

const roleColor: Record<string, string> = { user: '#6366f1', sp: '#10B981', isp: '#3B82F6', admin: '#F59E0B' };
const statusColor: Record<string, string> = { active: '#10B981', suspended: '#EF4444', pending: '#F59E0B' };
const kycColor: Record<string, string> = { verified: '#10B981', pending: '#F59E0B', rejected: '#EF4444', none: '#6B7280' };

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider capitalize" style={{ backgroundColor: `${color}20`, color }}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, loading }: { label: string; value: string | number; sub: string; icon: any; color: string; loading?: boolean }) {
  return (
    <div className="glass p-4 rounded-2xl border border-glass-border">
      <div className="flex justify-between items-start mb-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-[10px] font-medium text-text-secondary whitespace-nowrap ml-2">{sub}</span>
      </div>
      <p className="text-xs text-text-secondary font-medium">{label}</p>
      {loading ? (
        <div className="h-7 flex items-center"><Loader2 size={16} className="animate-spin text-text-secondary" /></div>
      ) : (
        <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
      )}
    </div>
  );
}

export default function AdminUsers() {
  usePageTitle('Admin — Users');
  const { showToast } = useToastStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'sp' | 'isp'>('account');
  const [spKeys, setSpKeys] = useState<any>(null);
  const [ispKeys, setIspKeys] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, wallets(nrt_balance), devices(id), referrals:referrals!referrer_id(reward_nrt)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsers((data || []).map((u: any) => {
        const wallet = Array.isArray(u.wallets) ? u.wallets[0] : u.wallets;
        const referrals = Array.isArray(u.referrals) ? u.referrals : [];
        return {
          ...u,
          display_name: u.display_name || u.email?.split('@')[0] || '',
          nrt_balance: wallet?.nrt_balance || 0,
          device_count: u.devices?.length || 0,
          referral_count: referrals.length,
          referral_bonus: referrals.reduce((sum: number, r: any) => sum + (Number(r.reward_nrt) || 0), 0),
          kyc_status: u.kyc_status || 'none',
          status: u.status || 'active',
          country: u.country || 'Unknown',
        };
      }));
    } catch (e: any) { console.error('Fetch users:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q) || (u.country || '').toLowerCase().includes(q);
  }), [users, search]);

  const fetchKeys = async (user: AdminUser) => {
    setSpKeys(null);
    setIspKeys(null);
    if (user.is_sp) {
      // Fetch SP profile to get sp_profiles.id, then fetch services
      const { data: spProfile } = await supabase.from('sp_profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (spProfile) {
        const { data: svcData } = await supabase.from('services').select('id, name, api_key, category, status, verified').eq('sp_id', spProfile.id).order('created_at', { ascending: false });
        setSpKeys(svcData || []);
      }
    }
    if (user.is_isp) {
      // Fetch ISP profile to get isp_profiles.id, then fetch networks
      const { data: ispProfile } = await supabase.from('isp_profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (ispProfile) {
        const { data: netData } = await supabase.from('networks').select('id, name, api_key, category, verified').eq('isp_id', ispProfile.id).order('created_at', { ascending: false });
        setIspKeys(netData || []);
      }
    }
  };

  useEffect(() => {
    if (viewUser) {
      setActiveTab('account');
      fetchKeys(viewUser);
    }
  }, [viewUser]);

  const updateUser = async (id: string, updates: Record<string, unknown>) => {
    try {
      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } as AdminUser : u));
      showToast('User updated.', 'success');
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete user ${user.email}?`)) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast('User deleted.', 'success');
    } catch (e: any) { showToast(e.message || 'Delete failed', 'error'); }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">User Management</h1>
          <p className="text-sm text-text-secondary">{loading ? 'Loading...' : `${users.length} registered accounts`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="p-2 bg-bg-secondary border border-glass-border rounded-xl hover:bg-glass-bg transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-all">
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={users.length.toLocaleString()} sub="registered accounts" icon={Users} color="#3B82F6" loading={loading} />
        <KpiCard label="Verified Partners" value={users.filter(u => (u.is_sp || u.is_isp) && u.kyc_status === 'verified').length.toLocaleString()} sub="SPs & ISPs" icon={ShieldCheck} color="#10B981" loading={loading} />
        <KpiCard label="Active Status" value={users.filter(u => u.status === 'active').length.toLocaleString()} sub="currently active" icon={Activity} color="#8B5CF6" loading={loading} />
        <KpiCard label="Pending KYC" value={users.filter(u => u.kyc_status === 'pending').length.toLocaleString()} sub="requires review" icon={UserPlus} color="#F59E0B" loading={loading} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, or country..." className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-accent-primary transition-colors" />
        </div>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary/50 border-b border-glass-border">
              <tr>
                <th className="text-left px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-wider">Active Role</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-wider">Country</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-wider">Balance</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-wider">Referrals</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-wider">Bonus</th>
                <th className="text-left px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-wider">Devices</th>
                <th className="text-right px-6 py-4 text-[10px] font-black text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(user => (
                <tr key={user.id} onClick={() => setViewUser(user)} className="hover:bg-bg-secondary/30 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bg-secondary border border-glass-border flex items-center justify-center overflow-hidden shrink-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={14} className="text-text-secondary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-text-primary truncate">{user.display_name}</p>
                        <p className="text-[10px] text-text-secondary truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><Badge label={user.active_role || user.role} color={roleColor[user.active_role || user.role]} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate max-w-[80px]">{user.country}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-accent-primary">{Number(user.nrt_balance || 0).toLocaleString()} NRT</td>
                  <td className="px-6 py-4 text-text-primary font-medium">{user.referral_count}</td>
                  <td className="px-6 py-4 text-emerald-500 font-bold">+{user.referral_bonus.toFixed(1)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-bold text-text-primary">
                      <Smartphone size={12} className="text-accent-primary" />
                      {user.device_count}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {user.status === 'active' 
                        ? <button onClick={(e) => { e.stopPropagation(); updateUser(user.id, { status: 'suspended' }); }} className="px-2 py-1 bg-red-500/10 text-red-500 rounded-md text-[10px] font-bold">Suspend</button>
                        : <button onClick={(e) => { e.stopPropagation(); updateUser(user.id, { status: 'active' }); }} className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-[10px] font-bold">Activate</button>
                      }
                      <button onClick={(e) => { e.stopPropagation(); setEditUser({ ...user }); }} className="p-2 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(user); }} className="p-2 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View User Modal */}
      <AnimatePresence>
        {viewUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewUser(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              
              <div className="p-5 border-b border-glass-border flex justify-between items-center bg-bg-secondary shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent-primary/20 text-accent-primary flex items-center justify-center overflow-hidden border border-accent-primary/30">
                    {viewUser.avatar_url ? (
                      <img src={viewUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-black">{viewUser.display_name[0]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{viewUser.display_name}</h3>
                    <p className="text-xs text-text-secondary">{viewUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setViewUser(null)} className="p-1.5 rounded-full hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-glass-border bg-bg-secondary px-5 shrink-0 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'account' as const, label: 'Account Summary' },
                  ...(viewUser.is_sp ? [{ id: 'sp' as const, label: 'Service Provider' }] : []),
                  ...(viewUser.is_isp ? [{ id: 'isp' as const, label: 'ISP Network' }] : []),
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} 
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${activeTab === t.id ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { icon: Activity, label: 'Status', value: viewUser.status, color: statusColor[viewUser.status] },
                        { icon: Wallet, label: 'Balance', value: `${viewUser.nrt_balance.toLocaleString(undefined, { maximumFractionDigits: 7 })}`, color: '#6366f1' },
                        { icon: Gift, label: 'Referrals', value: viewUser.referral_count.toString(), color: '#10B981' },
                        { icon: Smartphone, label: 'Devices', value: viewUser.device_count.toString(), color: '#f59e0b' },
                      ].map(stat => (
                        <div key={stat.label} className="glass p-3 rounded-xl border border-glass-border flex flex-col items-center">
                          <stat.icon size={16} style={{ color: stat.color }} className="mb-1" />
                          <p className="text-[8px] text-text-secondary uppercase font-bold">{stat.label}</p>
                          <p className="text-sm font-black text-text-primary">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-text-secondary uppercase mb-3">Roles & Active Identity</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Standard User', active: true, color: roleColor.user, isActiveRole: (viewUser.active_role || viewUser.role) === 'user' },
                          { label: 'Service Provider', active: viewUser.is_sp, color: roleColor.sp, isActiveRole: (viewUser.active_role || viewUser.role) === 'sp' },
                          { label: 'ISP Network', active: viewUser.is_isp, color: roleColor.isp, isActiveRole: (viewUser.active_role || viewUser.role) === 'isp' },
                        ].map(r => (
                          <div key={r.label} className={`p-3 rounded-xl border relative ${r.active ? 'border-accent-primary/30 bg-accent-primary/5' : 'border-glass-border opacity-40'} flex flex-col items-center gap-2`}>
                            {r.isActiveRole && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent-primary shadow-[0_0_8px_rgba(var(--accent-primary-rgb),0.8)]" />}
                            <ShieldCheck size={20} style={{ color: r.active ? r.color : '#6B7280' }} />
                            <span className="text-[9px] font-black text-center leading-tight uppercase">{r.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="glass rounded-xl border border-glass-border overflow-hidden">
                      {[
                        { label: 'User ID', value: viewUser.id },
                        { label: 'Base Role', value: viewUser.role.toUpperCase() },
                        { label: 'Joined Date', value: new Date(viewUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
                        { label: 'Primary Email', value: viewUser.email },
                        { label: 'Region/Country', value: viewUser.country },
                        { label: 'KYC Status', value: viewUser.kyc_status.toUpperCase() },
                        { label: 'Total Referral Bonus', value: `${Number(viewUser.referral_bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} NRT` },
                      ].map((item, i) => (
                        <div key={item.label} className={`flex items-center justify-between p-3.5 ${i !== 6 ? 'border-b border-glass-border' : ''}`}>
                          <span className="text-[10px] font-black text-text-secondary uppercase">{item.label}</span>
                          <span className="text-xs font-bold text-text-primary">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'sp' && (
                  <div className="space-y-6">
                    <div className="glass p-5 rounded-xl border border-glass-border flex justify-between items-center bg-emerald-500/5">
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Service Provider Verification</p>
                        <Badge label={viewUser.kyc_status} color={kycColor[viewUser.kyc_status]} />
                      </div>
                      <ShieldCheck size={32} className="text-emerald-500 opacity-30" />
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-text-secondary uppercase px-1">Services & API Keys</h4>
                      {!spKeys || spKeys.length === 0 ? (
                        <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border text-center">
                          <p className="text-xs text-text-secondary">No services registered</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {spKeys.map((svc: any) => (
                            <div key={svc.id} className="bg-bg-secondary p-4 rounded-xl border border-glass-border space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-text-primary">{svc.name}</span>
                                <Badge label={svc.verified ? 'Verified' : svc.status} color={svc.verified ? '#10B981' : '#F59E0B'} />
                              </div>
                              <p className="text-[9px] text-text-secondary uppercase font-black">API Key</p>
                              <p className="text-xs font-mono text-text-primary break-all">{svc.api_key || 'Not generated'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'isp' && (
                  <div className="space-y-6">
                    <div className="glass p-5 rounded-xl border border-glass-border flex justify-between items-center bg-blue-500/5">
                      <div>
                        <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">ISP Network Authority</p>
                        <Badge label={viewUser.kyc_status} color={kycColor[viewUser.kyc_status]} />
                      </div>
                      <Activity size={32} className="text-blue-500 opacity-30" />
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-text-secondary uppercase px-1">Networks & API Keys</h4>
                      {!ispKeys || ispKeys.length === 0 ? (
                        <div className="bg-bg-secondary p-4 rounded-xl border border-glass-border text-center">
                          <p className="text-xs text-text-secondary">No networks registered</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {ispKeys.map((net: any) => (
                            <div key={net.id} className="bg-bg-secondary p-4 rounded-xl border border-glass-border space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-text-primary">{net.name}</span>
                                <Badge label={net.verified ? 'Verified' : 'Pending'} color={net.verified ? '#10B981' : '#F59E0B'} />
                              </div>
                              <p className="text-[9px] text-text-secondary uppercase font-black">API Key</p>
                              <p className="text-xs font-mono text-text-primary break-all">{net.api_key || 'Not generated'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-glass-border bg-bg-secondary shrink-0 flex gap-3">
                <button onClick={() => { setEditUser({ ...viewUser }); setViewUser(null); }} 
                  className="flex-1 py-3 bg-accent-primary text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-accent-primary/20">
                  <Edit2 size={14} /> Update Account Records
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal (Simplified logic, reuse styles) */}
      <AnimatePresence>
        {editUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditUser(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-glass-border flex justify-between items-center bg-bg-secondary">
                <h3 className="font-bold">Edit User Data</h3>
                <button onClick={() => setEditUser(null)} className="p-1 rounded-full hover:bg-glass-border"><X size={16} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-text-secondary uppercase mb-1.5 block">Display Name</label>
                  <input value={editUser.display_name} onChange={e => setEditUser({ ...editUser, display_name: e.target.value })} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-text-secondary uppercase mb-1.5 block">Base Role</label>
                    <select value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value as any })} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm outline-none">
                      {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-text-secondary uppercase mb-1.5 block">Active Role</label>
                    <select value={editUser.active_role} onChange={e => setEditUser({ ...editUser, active_role: e.target.value as any })} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm outline-none">
                      {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>
                  </div>
                   <div>
                    <label className="text-[10px] font-black text-text-secondary uppercase mb-1.5 block">Status</label>
                    <select value={editUser.status} onChange={e => setEditUser({ ...editUser, status: e.target.value as any })} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm outline-none">
                      {STATUSES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-text-secondary uppercase mb-1.5 block">KYC Status</label>
                    <select value={editUser.kyc_status} onChange={e => setEditUser({ ...editUser, kyc_status: e.target.value as any })} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm outline-none">
                      {KYC.map(k => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 p-3 bg-bg-secondary border border-glass-border rounded-xl">
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="checkbox" checked={editUser.is_sp} onChange={e => setEditUser({ ...editUser, is_sp: e.target.checked })} className="w-4 h-4 rounded accent-emerald-500 bg-bg-primary border-glass-border" />
                    SP Access
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                    <input type="checkbox" checked={editUser.is_isp} onChange={e => setEditUser({ ...editUser, is_isp: e.target.checked })} className="w-4 h-4 rounded accent-blue-500 bg-bg-primary border-glass-border" />
                    ISP Access
                  </label>
                </div>
              </div>
              <div className="p-4 border-t border-glass-border bg-bg-secondary flex gap-3">
                <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl bg-bg-primary border border-glass-border text-xs font-bold uppercase hover:bg-glass-bg transition-colors">Cancel</button>
                <button onClick={() => { updateUser(editUser.id, { display_name: editUser.display_name, status: editUser.status, kyc_status: editUser.kyc_status, role: editUser.role, active_role: editUser.active_role, is_sp: editUser.is_sp, is_isp: editUser.is_isp }); setEditUser(null); }} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white text-xs font-bold uppercase hover:opacity-90 transition-opacity">Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
