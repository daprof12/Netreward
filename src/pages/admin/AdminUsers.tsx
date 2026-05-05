import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit2, Trash2, X, Smartphone, Lock, KeySquare, Fingerprint, Users, ShieldCheck, Activity, UserPlus, Loader2, RefreshCw } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

interface AdminUser {
  id: string;
  email: string;
  role: 'user' | 'sp' | 'isp' | 'admin';
  display_name: string;
  country: string | null;
  status: string;
  kyc_status: string;
  created_at: string;
  nrt_balance: number;
  wallets?: { nrt_balance: number }[];
  kyc_submissions?: any[];
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

export default function AdminUsers() {
  usePageTitle('Admin — Users');
  const { showToast } = useToastStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', country: 'USA', role: 'user' as AdminUser['role'], status: 'active', kycStatus: 'none' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, wallets(nrt_balance)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers((data || []).map((u: any) => {
        // Supabase join might return an array or a single object for 1:1 relations
        const wallet = Array.isArray(u.wallets) ? u.wallets[0] : u.wallets;
        return {
          ...u,
          display_name: u.display_name || u.email?.split('@')[0] || '',
          nrt_balance: wallet?.nrt_balance || 0,
          kyc_status: u.kyc_status || 'none',
          status: u.status || 'active',
          country: u.country || 'Unknown',
        };
      }));
    } catch (e: any) { console.error('Fetch users:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const allCountries = useMemo(() => {
    const uniqueCountries = new Set(users.map(u => u.country || 'Unknown'));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [users]);

  const filtered = useMemo(() => users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.email.toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q) || (u.country || '').toLowerCase().includes(q);
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    const matchStatus = statusFilter === 'All' || u.status === statusFilter;
    const matchCountry = countryFilter === 'Global' || u.country === countryFilter;
    return matchQ && matchRole && matchStatus && matchCountry;
  }), [users, search, roleFilter, statusFilter, countryFilter]);

  const handleCreate = () => {
    if (!form.name || !form.email) { showToast('Name and email are required.', 'danger'); return; }
    showToast(`User ${form.email} created successfully.`, 'success');
    setShowCreateForm(false);
    setForm({ name: '', email: '', country: 'USA', role: 'user', status: 'active', kycStatus: 'none' });
  };

  const updateUser = async (id: string, updates: Record<string, unknown>) => {
    try {
      const { error } = await supabase.from('users').update(updates).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } as AdminUser : u));
      showToast('User updated.', 'success');
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast(`${user.email} deleted.`, 'success');
    } catch (e: any) { showToast(e.message || 'Delete failed', 'error'); }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    await updateUser(editUser.id, { display_name: editUser.display_name, role: editUser.role, status: editUser.status, country: editUser.country });
    setEditUser(null);
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">All Users</h1>
          <p className="text-sm text-text-secondary">{loading ? 'Loading...' : `${users.length} total users across all roles`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="p-2 bg-bg-secondary border border-glass-border rounded-xl hover:bg-glass-bg transition-colors" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Users', value: users.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: ShieldCheck, label: 'Verified SPs/ISPs', value: users.filter(u => ['sp', 'isp'].includes(u.role) && u.kyc_status === 'verified').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Activity, label: 'Active Status', value: users.filter(u => u.status === 'active').length.toString(), color: '#8B5CF6', bg: 'bg-violet-500/10' },
          { icon: UserPlus, label: 'Pending KYC', value: users.filter(u => u.kyc_status === 'pending').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass p-5 rounded-2xl border border-glass-border relative overflow-hidden group hover:border-accent-primary/30 transition-colors">
            <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">{label}</p>
            <h3 className="text-2xl font-black text-text-primary">{value}</h3>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Icon size={80} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by email, name, or country..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Roles</option>
          {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Country</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">KYC</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">NRT Balance</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(user => (
                <tr key={user.id} onClick={() => setViewUser(user)} className="hover:bg-bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-text-primary">{user.display_name}</p>
                      <p className="text-xs text-text-secondary">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge label={user.role} color={roleColor[user.role]} /></td>
                  <td className="px-4 py-3 text-text-secondary">{user.country}</td>
                  <td className="px-4 py-3"><Badge label={user.status} color={statusColor[user.status]} /></td>
                  <td className="px-4 py-3"><Badge label={user.kyc_status || 'none'} color={kycColor[user.kyc_status || 'none']} /></td>
                  <td className="px-4 py-3 font-bold text-accent-primary">{Number(user.nrt_balance || 0).toLocaleString()} NRT</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {user.status === 'active'
                        ? <button onClick={(e) => { e.stopPropagation(); updateUser(user.id, { status: 'suspended' }); }} className="px-2 py-1 text-[10px] font-bold bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors">Suspend</button>
                        : <button onClick={(e) => { e.stopPropagation(); updateUser(user.id, { status: 'active' }); }} className="px-2 py-1 text-[10px] font-bold bg-green-500/10 text-green-500 rounded-md hover:bg-green-500/20 transition-colors">Activate</button>
                      }
                      <button onClick={(e) => { e.stopPropagation(); setEditUser({ ...user }); }} className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(user); }} className="p-1.5 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-text-secondary">No users found matching your criteria.</div>
          )}
        </div>
      </div>

      {/* Edit User Drawer */}
      <AnimatePresence>
        {editUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setEditUser(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold">Edit User</h3>
                <button onClick={() => setEditUser(null)} className="p-1 rounded-full bg-bg-secondary"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: 'Name', key: 'display_name' as const, type: 'text' },
                  { label: 'Email', key: 'email' as const, type: 'email' },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">{label}</label>
                    <input type={type} value={editUser[key] as string}
                      onChange={e => setEditUser({ ...editUser, [key]: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
                    />
                  </div>
                ))}
                {[
                  { label: 'Role', key: 'role' as const, options: ROLES },
                  { label: 'Status', key: 'status' as const, options: STATUSES },
                  { label: 'KYC', key: 'kyc_status' as const, options: KYC },
                ].map(({ label, key, options }) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">{label}</label>
                    <select value={editUser[key] as string}
                      onChange={e => setEditUser({ ...editUser, [key]: e.target.value as any })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none">
                      {options.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-glass-border flex gap-3">
                <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-bold text-sm border border-glass-border">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm">Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create User Drawer */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreateForm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold">Create New User</h3>
                <button onClick={() => setShowCreateForm(false)} className="p-1 rounded-full bg-bg-secondary"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-3">
                {[{ label: 'Full Name', key: 'name' as const }, { label: 'Email', key: 'email' as const }].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">{label}</label>
                    <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Country</label>
                  <LocationSearch value={form.country} onChange={v => setForm({ ...form, country: v })} />
                </div>
              </div>
              <div className="p-4 border-t border-glass-border flex gap-3">
                <button onClick={() => setShowCreateForm(false)} className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-bold text-sm border border-glass-border">Cancel</button>
                <button onClick={handleCreate} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm">Create User</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View User Modal */}
      <AnimatePresence>
        {viewUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setViewUser(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              
              <div className="p-5 border-b border-glass-border flex justify-between items-center bg-bg-secondary shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center font-bold text-lg">
                    {viewUser.display_name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {viewUser.display_name} <Badge label={viewUser.role} color={roleColor[viewUser.role]} />
                    </h3>
                    <p className="text-xs text-text-secondary">{viewUser.email} · {viewUser.country}</p>
                  </div>
                </div>
                <button onClick={() => setViewUser(null)} className="p-1.5 rounded-full hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-xl border border-glass-border">
                    <p className="text-xs text-text-secondary uppercase tracking-wider font-bold mb-1">Available Balance</p>
                    <p className="text-2xl font-black text-accent-primary">{Number(viewUser.nrt_balance || 0).toLocaleString()} <span className="text-sm text-text-secondary font-medium">NRT</span></p>
                  </div>
                  <div className="glass p-4 rounded-xl border border-glass-border">
                    <p className="text-xs text-text-secondary uppercase tracking-wider font-bold mb-1">KYC Status</p>
                    <Badge label={viewUser.kyc_status || 'none'} color={kycColor[viewUser.kyc_status || 'none']} />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Account Info</h4>
                  <div className="glass rounded-xl border border-glass-border overflow-hidden">
                    {[
                      { label: 'Role', value: viewUser.role?.toUpperCase() },
                      { label: 'Status', value: viewUser.status },
                      { label: 'Joined', value: viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString() : 'N/A' },
                    ].map((item, i) => (
                      <div key={item.label} className={`flex items-center justify-between p-3 ${i !== 2 ? 'border-b border-glass-border' : ''}`}>
                        <span className="text-sm font-semibold">{item.label}</span>
                        <span className="text-sm text-text-secondary">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-glass-border bg-bg-secondary shrink-0 flex gap-3">
                <button onClick={() => { setEditUser({ ...viewUser }); setViewUser(null); }} className="flex-1 py-2.5 bg-accent-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <Edit2 size={16} /> Edit User Data
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
