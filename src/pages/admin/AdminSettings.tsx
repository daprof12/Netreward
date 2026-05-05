import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, ToggleLeft, Lock,
  Mail, Clock, ChevronRight, Loader2,
  Globe, Check, X, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'features', label: 'Feature Flags', icon: ToggleLeft },
  { id: 'restrictions', label: 'Restrictions', icon: Lock },
];

interface FeatureFlag {
  id: string;
  feature_key: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
  restricted_countries: string[];
  config: Record<string, any>;
}

export default function AdminSettings() {
  usePageTitle('Admin — Settings');
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<any>(null);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [securityConfig, setSecurityConfig] = useState({
    requirePinForSensitive: false,
    sessionTimeout: 30,
    ipWhitelist: '',
  });
  const [editingFeature, setEditingFeature] = useState<FeatureFlag | null>(null);
  const [countryInput, setCountryInput] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [rolesRes, featuresRes, settingsRes] = await Promise.all([
          supabase.from('admin_roles').select('*').eq('email', user?.email).maybeSingle(),
          supabase.from('feature_flags').select('*').order('display_name'),
          supabase.from('kv_settings').select('value').eq('key', 'admin_security_config').maybeSingle(),
        ]);
        setAdminRole(rolesRes.data);
        setFeatures((featuresRes.data || []).map((f: any) => ({
          ...f,
          restricted_countries: f.restricted_countries || [],
          config: f.config || {},
        })));
        if (settingsRes.data?.value) {
          const parsed = typeof settingsRes.data.value === 'string' ? JSON.parse(settingsRes.data.value) : settingsRes.data.value;
          setSecurityConfig(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user?.email]);

  const toggleFeature = async (id: string, currentState: boolean) => {
    try {
      await supabase.from('feature_flags').update({ is_enabled: !currentState }).eq('id', id);
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, is_enabled: !currentState } : f));
      showToast(`Feature ${!currentState ? 'enabled' : 'disabled'}`, 'success');
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const saveSecurityConfig = async () => {
    try {
      await supabase.from('kv_settings').upsert({
        key: 'admin_security_config',
        value: securityConfig,
      }, { onConflict: 'key' });
      showToast('Security settings saved', 'success');
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
  };

  const saveFeatureRestrictions = async () => {
    if (!editingFeature) return;
    try {
      await supabase.from('feature_flags').update({
        restricted_countries: editingFeature.restricted_countries,
        config: editingFeature.config,
      }).eq('id', editingFeature.id);
      setFeatures(prev => prev.map(f => f.id === editingFeature.id ? editingFeature : f));
      setEditingFeature(null);
      showToast('Restrictions saved', 'success');
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
  };

  const addCountry = () => {
    if (!editingFeature || !countryInput.trim()) return;
    const code = countryInput.trim().toUpperCase();
    if (editingFeature.restricted_countries.includes(code)) return;
    setEditingFeature({
      ...editingFeature,
      restricted_countries: [...editingFeature.restricted_countries, code],
    });
    setCountryInput('');
  };

  const removeCountry = (code: string) => {
    if (!editingFeature) return;
    setEditingFeature({
      ...editingFeature,
      restricted_countries: editingFeature.restricted_countries.filter(c => c !== code),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Admin Settings</h1>
        <p className="text-sm text-text-secondary">Manage your profile, security, and platform feature controls</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-secondary p-1 rounded-xl overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-bg-card text-accent-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-bg-card border border-glass-border rounded-2xl p-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-accent-primary/20">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-text-primary">{adminRole?.name || adminRole?.role_name || 'Super Admin'}</h2>
                <p className="text-sm text-text-secondary mt-0.5">{user?.email || 'admin@netreward.online'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 bg-accent-primary/10 text-accent-primary text-[10px] font-bold rounded-md uppercase">
                    {adminRole?.status || 'active'}
                  </span>
                  <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-md uppercase">
                    Admin
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-glass-border rounded-2xl divide-y divide-glass-border">
            {[
              { icon: Mail, label: 'Email', value: user?.email || '—' },
              { icon: Shield, label: 'Role', value: adminRole?.name || adminRole?.role_name || 'Super Admin' },
              { icon: Clock, label: 'Last Login', value: new Date().toLocaleDateString() },
              { icon: Globe, label: 'Permissions', value: (adminRole?.permissions || []).includes('all') ? 'Full Access' : `${(adminRole?.permissions || []).length} modules` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center text-text-secondary">
                    <Icon size={16} />
                  </div>
                  <span className="text-sm font-medium text-text-secondary">{label}</span>
                </div>
                <span className="text-sm font-bold text-text-primary">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* SECURITY TAB */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-bg-card border border-glass-border rounded-2xl p-5 space-y-5">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <Shield size={18} className="text-accent-primary" /> Admin Security
            </h3>

            {/* PIN for sensitive actions */}
            <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-bold text-text-primary">Require PIN for Sensitive Actions</p>
                <p className="text-xs text-text-secondary mt-0.5">Token freeze, user deletion, emergency controls</p>
              </div>
              <button
                onClick={() => setSecurityConfig(prev => ({ ...prev, requirePinForSensitive: !prev.requirePinForSensitive }))}
                className={`w-12 h-7 rounded-full relative transition-colors ${
                  securityConfig.requirePinForSensitive ? 'bg-accent-primary' : 'bg-glass-border'
                }`}
              >
                <motion.div
                  className="w-5 h-5 bg-white rounded-full absolute top-1 shadow"
                  animate={{ left: securityConfig.requirePinForSensitive ? 26 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Session timeout */}
            <div className="p-4 bg-bg-secondary rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-text-primary">Session Timeout</p>
                <span className="text-sm font-mono font-bold text-accent-primary">{securityConfig.sessionTimeout}m</span>
              </div>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={securityConfig.sessionTimeout}
                onChange={e => setSecurityConfig(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-glass-border rounded-lg appearance-none cursor-pointer accent-accent-primary"
              />
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>5 min</span><span>30 min</span><span>60 min</span><span>120 min</span>
              </div>
            </div>

            {/* IP Whitelist */}
            <div className="p-4 bg-bg-secondary rounded-xl space-y-2">
              <p className="text-sm font-bold text-text-primary">IP Whitelist (optional)</p>
              <p className="text-xs text-text-secondary">Comma-separated IPs allowed for admin access</p>
              <input
                value={securityConfig.ipWhitelist}
                onChange={e => setSecurityConfig(prev => ({ ...prev, ipWhitelist: e.target.value }))}
                placeholder="192.168.1.1, 10.0.0.1"
                className="w-full bg-bg-card border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary font-mono"
              />
            </div>

            <button
              onClick={saveSecurityConfig}
              className="w-full py-3 bg-accent-primary text-white font-bold rounded-xl shadow-lg shadow-accent-primary/20"
            >
              Save Security Settings
            </button>
          </div>
        </motion.div>
      )}

      {/* FEATURE FLAGS TAB */}
      {activeTab === 'features' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {features.length === 0 ? (
            <div className="text-center py-16 bg-bg-card border border-glass-border rounded-2xl">
              <p className="text-text-secondary">No feature flags configured</p>
              <p className="text-xs text-text-secondary mt-1">Run migration 00033 to seed default flags</p>
            </div>
          ) : (
            features.map(f => (
              <div key={f.id} className="bg-bg-card border border-glass-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-text-primary truncate">{f.display_name}</h4>
                      {f.restricted_countries.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold rounded">
                          {f.restricted_countries.length} restricted
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{f.description || f.feature_key}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => { setEditingFeature(f); setCountryInput(''); }}
                      className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                      title="Edit restrictions"
                    >
                      <Globe size={14} />
                    </button>
                    <button
                      onClick={() => toggleFeature(f.id, f.is_enabled)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        f.is_enabled ? 'bg-emerald-500' : 'bg-glass-border'
                      }`}
                    >
                      <motion.div
                        className="w-4 h-4 bg-white rounded-full absolute top-1 shadow"
                        animate={{ left: f.is_enabled ? 24 : 4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* RESTRICTIONS TAB */}
      {activeTab === 'restrictions' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-bg-card border border-glass-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <Lock size={18} className="text-accent-primary" /> Platform Restrictions
            </h3>
            <p className="text-xs text-text-secondary">
              Manage country-level and feature-level restrictions. Use the Feature Flags tab to toggle individual features,
              then click the <Globe size={12} className="inline text-accent-primary" /> icon to set country restrictions for each feature.
            </p>

            {/* Summary of restricted features */}
            <div className="space-y-2">
              {features.filter(f => f.restricted_countries.length > 0).length === 0 ? (
                <div className="text-center py-8 bg-bg-secondary rounded-xl border border-glass-border">
                  <Check size={32} className="mx-auto text-emerald-400 mb-2" />
                  <p className="text-sm font-bold text-text-primary">No Active Restrictions</p>
                  <p className="text-xs text-text-secondary mt-1">All features are available globally</p>
                </div>
              ) : (
                features.filter(f => f.restricted_countries.length > 0).map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-bg-secondary rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-text-primary">{f.display_name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {f.restricted_countries.map(c => (
                          <span key={c} className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-bold rounded">{c}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditingFeature(f); setCountryInput(''); }}
                      className="px-3 py-1.5 text-xs font-bold text-accent-primary bg-accent-primary/10 rounded-lg"
                    >
                      Edit
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Disabled features */}
            {features.filter(f => !f.is_enabled).length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Disabled Features</h4>
                <div className="flex flex-wrap gap-2">
                  {features.filter(f => !f.is_enabled).map(f => (
                    <span key={f.id} className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-500/20">
                      {f.display_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Country Restriction Modal */}
      <AnimatePresence>
        {editingFeature && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setEditingFeature(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{editingFeature.display_name}</h3>
                  <p className="text-xs text-text-secondary">Country restrictions</p>
                </div>
                <button onClick={() => setEditingFeature(null)} className="p-1 rounded-full bg-bg-secondary">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <input
                    value={countryInput}
                    onChange={e => setCountryInput(e.target.value)}
                    placeholder="Country code (e.g. NG, US, CN)"
                    className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary uppercase"
                    onKeyDown={e => e.key === 'Enter' && addCountry()}
                  />
                  <button
                    onClick={addCountry}
                    className="px-4 py-2.5 bg-accent-primary text-white font-bold rounded-xl text-sm"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {editingFeature.restricted_countries.length === 0 ? (
                    <p className="text-xs text-text-secondary italic">No country restrictions — available globally</p>
                  ) : (
                    editingFeature.restricted_countries.map(c => (
                      <span key={c} className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-500/20">
                        {c}
                        <button onClick={() => removeCountry(c)} className="hover:text-white">
                          <X size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-400 text-xs">
                    <AlertTriangle size={14} />
                    <span>Users in restricted countries will not be able to access this feature</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-glass-border flex gap-3">
                <button onClick={() => setEditingFeature(null)} className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-bold text-sm border border-glass-border">
                  Cancel
                </button>
                <button onClick={saveFeatureRestrictions} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm">
                  Save Restrictions
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
