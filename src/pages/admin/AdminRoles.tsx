import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Shield, Loader2, Users, Key } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

const ALL_PERMISSIONS = ['users', 'transactions', 'wallets', 'earnings', 'campaigns', 'services', 'networks', 'devices', 'referrals', 'support', 'crm', 'p2p', 'config', 'system', 'fees', 'api'];

const PermGrid = ({ perms, onChange }: { perms: string[]; onChange: (p: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {ALL_PERMISSIONS.map(p => (
      <button key={p} onClick={() => onChange(togglePerm(perms, p))}
        className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors border ${perms.includes(p) ? 'bg-accent-primary/20 border-accent-primary text-accent-primary' : 'bg-bg-secondary border-glass-border text-text-secondary'}`}>
        {p}
      </button>
    ))}
  </div>
);

const RoleDrawer = ({ title, data, onSave, onClose, onChange }: any) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    onClick={onClose}>
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
      className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-glass-border flex justify-between items-center">
        <h3 className="font-bold">{title}</h3>
        <button onClick={onClose} className="p-1 rounded-full bg-bg-secondary"><X size={16} /></button>
      </div>
      <div className="p-4 space-y-4">
        {[{ label: 'Role Name', key: 'name' }, { label: 'Admin Email', key: 'email' }].map(({ label, key }) => (
          <div key={key}>
            <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">{label}</label>
            <input value={data[key]} onChange={e => onChange({ ...data, [key]: e.target.value })}
              className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
          </div>
        ))}
        <div>
          <label className="text-xs font-bold text-text-secondary mb-2 block uppercase tracking-wider">Permissions</label>
          <PermGrid perms={data.permissions} onChange={p => onChange({ ...data, permissions: p })} />
        </div>
      </div>
      <div className="p-4 border-t border-glass-border flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-bold text-sm border border-glass-border">Cancel</button>
        <button onClick={onSave} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm">Save</button>
      </div>
    </motion.div>
  </motion.div>
);

const togglePerm = (perms: string[], perm: string) =>
  perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm];

export default function AdminRoles() {
  usePageTitle('Admin — Roles');
  const { showToast } = useToastStore();
  const [adminRoles, setAdminRoles] = useState<any[]>([]);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', permissions: [] as string[], status: 'active' as const });

  useEffect(() => {
    (async () => {
      try {
        const [rolesRes, usersRes] = await Promise.all([
          supabase.from('admin_roles').select('*').order('created_at', { ascending: false }),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin')
        ]);
        setAdminRoles((rolesRes.data || []).map((r: any) => ({
          ...r, name: r.name || r.role_name || '', permissions: r.permissions || [], createdAt: r.created_at,
        })));
        setAdminCount(usersRes.count || 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email) { showToast('Name and email required.', 'danger'); return; }
    try {
      const newRole = { id: crypto.randomUUID(), role_name: form.name, name: form.name, email: form.email, permissions: form.permissions, status: form.status, created_at: new Date().toISOString() };
      const { error } = await supabase.from('admin_roles').insert(newRole);
      if (error) throw error;
      setAdminRoles(prev => [...prev, { ...newRole, createdAt: newRole.created_at }]);
      showToast('Admin role created.', 'success');
      setShowCreate(false);
      setForm({ name: '', email: '', permissions: [], status: 'active' });
    } catch (e: any) { showToast(e.message || 'Create failed', 'error'); }
  };

  const handleSave = async () => {
    if (!editRole) return;
    try {
      const { error } = await supabase.from('admin_roles').update({ role_name: editRole.name, name: editRole.name, email: editRole.email, permissions: editRole.permissions, status: editRole.status }).eq('id', editRole.id);
      if (error) throw error;
      setAdminRoles(prev => prev.map(r => r.id === editRole.id ? { ...r, ...editRole } : r));
      showToast('Role updated.', 'success');
      setEditRole(null);
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const handleDelete = async (role: any) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await supabase.from('admin_roles').delete().eq('id', role.id);
      setAdminRoles(prev => prev.filter(r => r.id !== role.id));
      showToast('Role deleted.', 'success');
    } catch (e: any) { showToast(e.message || 'Delete failed', 'error'); }
  };

  const updateRoleStatus = async (id: string, status: string) => {
    try {
      await supabase.from('admin_roles').update({ status }).eq('id', id);
      setAdminRoles(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Admin Roles</h1>
          <p className="text-sm text-text-secondary">Manage administrative access and permissions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20">
          <Plus size={16} /> Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Roles', value: adminRoles.length.toString(), sub: 'permission groups', color: '#3B82F6', icon: Shield },
          { label: 'Active Admins', value: adminCount.toString(), sub: 'privileged users', color: '#10B981', icon: Users },
          { label: 'Permissions', value: ALL_PERMISSIONS.length.toString(), sub: 'system-wide', color: '#8b5cf6', icon: Key },
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminRoles.map(role => (
          <div key={role.id} className="bg-bg-card border border-glass-border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary"><Shield size={20} /></div>
                <div>
                  <h3 className="font-bold text-text-primary">{role.name}</h3>
                  <p className="text-xs text-text-secondary">{role.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${role.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{role.status}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.includes('all') ? (
                <span className="px-2 py-0.5 bg-accent-primary/10 text-accent-primary text-[10px] font-bold rounded-md">ALL ACCESS</span>
              ) : role.permissions.map(p => (
                <span key={p} className="px-2 py-0.5 bg-bg-secondary text-text-secondary text-[10px] font-bold rounded-md capitalize">{p}</span>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditRole({ ...role })} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-bg-secondary border border-glass-border rounded-lg text-xs font-bold text-text-secondary hover:text-accent-primary transition-colors">
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => updateRoleStatus(role.id, role.status === 'active' ? 'disabled' : 'active')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${role.status === 'active' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                {role.status === 'active' ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => handleDelete(role)} className="p-1.5 text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showCreate && <RoleDrawer title="Create Admin Role" data={form} onSave={handleCreate} onClose={() => setShowCreate(false)} onChange={setForm} />}
        {editRole && <RoleDrawer title="Edit Admin Role" data={editRole} onSave={handleSave} onClose={() => setEditRole(null)} onChange={setEditRole} />}
      </AnimatePresence>
    </motion.div>
  );
}
