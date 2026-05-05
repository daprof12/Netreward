import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Power, Snowflake, LogOut, AlertTriangle, Upload,
  Loader2, RefreshCw, Clock, Shield, Globe, Smartphone, Monitor
} from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';

type Section = 'maintenance' | 'emergency' | 'updates';

export default function AdminSystemOps() {
  const { showToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>('maintenance');

  // Maintenance state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [countdownHours, setCountdownHours] = useState(1);
  const [countdownMinutes, setCountdownMinutes] = useState(0);
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are performing scheduled maintenance. Please check back soon.');
  const [maintenanceEndTime, setMaintenanceEndTime] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0 });

  // Emergency state
  const [tokenFrozen, setTokenFrozen] = useState(false);

  // Update state
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateChangelog, setUpdateChangelog] = useState('');
  const [updatePlatforms, setUpdatePlatforms] = useState({ web: true, android: false, ios: false, extension: false });
  const [pushing, setPushing] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('kv_settings')
        .select('key, value')
        .in('key', ['maintenance_mode', 'maintenance_end_time', 'maintenance_message', 'token_frozen', 'latest_app_version', 'latest_changelog']);

      (data || []).forEach((s: any) => {
        if (s.key === 'maintenance_mode') setMaintenanceMode(s.value === 'true');
        if (s.key === 'maintenance_end_time' && s.value) setMaintenanceEndTime(new Date(s.value));
        if (s.key === 'maintenance_message' && s.value) setMaintenanceMessage(s.value);
        if (s.key === 'token_frozen') setTokenFrozen(s.value === 'true');
        if (s.key === 'latest_app_version' && s.value) setUpdateVersion(s.value);
        if (s.key === 'latest_changelog' && s.value) setUpdateChangelog(s.value);
      });
    } catch (e) { /* settings may not exist */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    if (!maintenanceMode || !maintenanceEndTime) return;
    const tick = () => {
      const diff = Math.max(0, maintenanceEndTime.getTime() - Date.now());
      setRemaining({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [maintenanceMode, maintenanceEndTime]);

  const upsertSetting = async (key: string, value: string, category = 'system') => {
    const { error } = await supabase.from('kv_settings').upsert(
      { key, value, category, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) throw error;
  };

  // ── Maintenance ──────────────────────────────────────────
  const handleToggleMaintenance = () => {
    if (!maintenanceMode) {
      setShowMaintenanceModal(true);
    } else {
      executeMaintenanceToggle(false);
    }
  };

  const executeMaintenanceToggle = async (newValue: boolean) => {
    try {
      await upsertSetting('maintenance_mode', String(newValue));
      if (newValue) {
        const endTime = new Date(Date.now() + (countdownHours * 3600000) + (countdownMinutes * 60000)).toISOString();
        await upsertSetting('maintenance_end_time', endTime);
        await upsertSetting('maintenance_message', maintenanceMessage);
        setMaintenanceEndTime(new Date(endTime));
      } else {
        await upsertSetting('maintenance_end_time', '');
        setMaintenanceEndTime(null);
      }
      setMaintenanceMode(newValue);
      setShowMaintenanceModal(false);
      showToast(newValue ? 'Maintenance mode ON — all users notified.' : 'Maintenance mode OFF — system is live.', 'success');
    } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  // ── Emergency: Token Freeze ──────────────────────────────
  const handleFreeze = async () => {
    const newValue = !tokenFrozen;
    if (newValue && !confirm('CRITICAL: Freezing the token stops ALL NRT transactions (deposits, withdrawals, checkout, P2P). Proceed?')) return;
    try {
      await upsertSetting('token_frozen', String(newValue), 'emergency');
      setTokenFrozen(newValue);
      showToast(newValue ? '🧊 Token FROZEN globally.' : '✅ Token UNFROZEN.', newValue ? 'warning' : 'success');
    } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  // ── Emergency: Force Logout ──────────────────────────────
  const handleForceLogout = async () => {
    if (!confirm('CRITICAL: This will invalidate ALL active sessions for users, SPs, and ISPs. Admins remain logged in. Proceed?')) return;
    try {
      await upsertSetting('force_logout_at', new Date().toISOString(), 'emergency');
      showToast('Force logout triggered. All non-admin sessions invalidated.', 'warning');
    } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
  };

  // ── Software Update Push ─────────────────────────────────
  const handlePushUpdate = async () => {
    if (!updateVersion.trim()) { showToast('Enter a version number.', 'error'); return; }
    if (!confirm(`Push update v${updateVersion} to all selected platforms?`)) return;
    setPushing(true);
    try {
      await upsertSetting('latest_app_version', updateVersion.trim());
      await upsertSetting('latest_changelog', updateChangelog.trim());
      await upsertSetting('update_platforms', JSON.stringify(updatePlatforms));
      await upsertSetting('update_pushed_at', new Date().toISOString());
      showToast(`Update v${updateVersion} pushed! All users will be notified.`, 'success');
    } catch (e: any) { showToast(e.message || 'Push failed', 'error'); }
    finally { setPushing(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-accent-primary" size={32} /></div>;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent-primary" />
            System Operations
          </h1>
          <p className="text-sm text-text-secondary">Maintenance, emergency controls, and software updates</p>
        </div>
        <button onClick={fetchSettings} className="p-2 bg-bg-secondary rounded-lg hover:bg-glass-border transition-colors text-text-secondary">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Live Status Indicators */}
      <div className="flex flex-wrap gap-3">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${maintenanceMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          <div className={`w-2 h-2 rounded-full ${maintenanceMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {maintenanceMode ? 'MAINTENANCE ACTIVE' : 'SYSTEM ONLINE'}
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${tokenFrozen ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          <div className={`w-2 h-2 rounded-full ${tokenFrozen ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`} />
          {tokenFrozen ? 'TOKEN FROZEN' : 'TOKEN ACTIVE'}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl w-fit border border-glass-border">
        {([
          { key: 'maintenance' as Section, label: 'Maintenance', icon: Wrench },
          { key: 'emergency' as Section, label: 'Emergency', icon: AlertTriangle },
          { key: 'updates' as Section, label: 'Software Updates', icon: Upload },
        ]).map(t => (
          <button key={t.key} onClick={() => setSection(t.key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${section === t.key ? 'bg-accent-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ MAINTENANCE SECTION ═══ */}
      {section === 'maintenance' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-bg-card border border-glass-border rounded-xl p-6 max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${maintenanceMode ? 'bg-amber-500/20 text-amber-400' : 'bg-bg-secondary text-text-secondary'}`}>
                <Wrench size={24} />
              </div>
              <div>
                <h2 className="font-black text-lg text-text-primary">{maintenanceMode ? 'Maintenance Mode is ON' : 'System is Online'}</h2>
                <p className="text-xs text-text-secondary">{maintenanceMode ? 'Users see a maintenance screen with countdown.' : 'The platform is fully accessible.'}</p>
              </div>
            </div>

            {/* Live Countdown Timer (Visible only when active) */}
            {maintenanceMode && maintenanceEndTime && (
              <div className="mb-6 p-6 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-4">Time Remaining</p>
                <div className="flex justify-center gap-4">
                  {[
                    { label: 'Hours', val: remaining.h },
                    { label: 'Minutes', val: remaining.m },
                    { label: 'Seconds', val: remaining.s },
                  ].map(t => (
                    <div key={t.label} className="bg-bg-primary border border-glass-border rounded-xl p-3 w-20">
                      <p className="text-2xl font-black text-amber-500">{String(t.val).padStart(2, '0')}</p>
                      <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider mt-1">{t.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Countdown Timer Inputs */}
            {!maintenanceMode && (
              <div className="space-y-4 mb-6 p-4 bg-bg-secondary rounded-xl border border-glass-border">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2"><Clock size={12} /> Set Countdown Duration</p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-text-secondary font-bold uppercase block mb-1">Hours</label>
                    <input type="number" min={0} max={72} value={countdownHours} onChange={e => setCountdownHours(Number(e.target.value))}
                      className="w-full bg-bg-primary border border-glass-border rounded-xl px-4 py-2.5 text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-text-secondary font-bold uppercase block mb-1">Minutes</label>
                    <input type="number" min={0} max={59} value={countdownMinutes} onChange={e => setCountdownMinutes(Number(e.target.value))}
                      className="w-full bg-bg-primary border border-glass-border rounded-xl px-4 py-2.5 text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary font-bold uppercase block mb-1">Message shown to users</label>
                  <textarea rows={2} value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)}
                    className="w-full bg-bg-primary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary resize-none" />
                </div>
              </div>
            )}

            <button onClick={handleToggleMaintenance}
              className={`flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold transition-all active:scale-[0.98] ${maintenanceMode ? 'bg-bg-secondary text-text-primary border border-glass-border hover:bg-glass-border' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:opacity-90'}`}>
              <Power size={20} /> {maintenanceMode ? 'Turn Off Maintenance' : 'Activate Maintenance Mode'}
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══ EMERGENCY SECTION ═══ */}
      {section === 'emergency' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Token Freeze */}
          <div className={`border rounded-xl p-6 ${tokenFrozen ? 'bg-red-500/5 border-red-500/30' : 'bg-bg-card border-glass-border'}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${tokenFrozen ? 'bg-red-500/20 text-red-400' : 'bg-bg-secondary text-text-secondary'}`}>
              <Snowflake size={28} />
            </div>
            <h3 className="font-black text-lg text-text-primary mb-1">Token Freeze</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Instantly halt <span className="text-text-primary font-bold">all</span> deposits, withdrawals, checkouts, and P2P trades. The token value will be locked at current rate.
            </p>
            <button onClick={handleFreeze}
              className={`w-full py-3 rounded-xl font-bold transition-all active:scale-[0.98] ${!tokenFrozen ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:opacity-90' : 'bg-bg-secondary text-emerald-400 border border-glass-border hover:bg-glass-border'}`}>
              {!tokenFrozen ? '🧊 FREEZE TOKEN GLOBALLY' : '✅ UNFREEZE TOKEN'}
            </button>
          </div>

          {/* Force Logout */}
          <div className="bg-bg-card border border-glass-border rounded-xl p-6">
            <div className="w-14 h-14 rounded-2xl bg-bg-secondary text-text-secondary flex items-center justify-center mb-4">
              <LogOut size={28} />
            </div>
            <h3 className="font-black text-lg text-text-primary mb-1">Force Global Logout</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Invalidate <span className="text-text-primary font-bold">all</span> active user, SP, and ISP sessions. Forces everyone to log in again. Admins are exempt.
            </p>
            <button onClick={handleForceLogout}
              className="w-full py-3 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/20 hover:opacity-90 transition-all active:scale-[0.98]">
              ⚡ FORCE LOGOUT ALL USERS
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══ SOFTWARE UPDATES SECTION ═══ */}
      {section === 'updates' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
          <div className="bg-bg-card border border-glass-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                <Upload size={24} />
              </div>
              <div>
                <h2 className="font-black text-lg text-text-primary">Push Software Update</h2>
                <p className="text-xs text-text-secondary">All users on selected platforms will receive a notification to update.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-text-secondary font-bold uppercase block mb-1">Version Number</label>
                <input type="text" placeholder="e.g. 2.1.0" value={updateVersion} onChange={e => setUpdateVersion(e.target.value)}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary" />
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-bold uppercase block mb-1">Changelog / What's New</label>
                <textarea rows={4} placeholder="Describe what changed..." value={updateChangelog} onChange={e => setUpdateChangelog(e.target.value)}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary resize-none" />
              </div>

              <div>
                <label className="text-[10px] text-text-secondary font-bold uppercase block mb-2">Target Platforms</label>
                <div className="flex flex-wrap gap-3">
                  {([
                    { key: 'web', label: 'Web App', icon: Monitor },
                    { key: 'android', label: 'Android', icon: Smartphone },
                    { key: 'ios', label: 'iOS', icon: Smartphone },
                    { key: 'extension', label: 'Chrome Extension', icon: Globe },
                  ] as const).map(p => (
                    <button key={p.key} onClick={() => setUpdatePlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${updatePlatforms[p.key] ? 'bg-accent-primary/10 border-accent-primary/40 text-accent-primary' : 'bg-bg-secondary border-glass-border text-text-secondary hover:text-text-primary'}`}>
                      <p.icon size={14} /> {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handlePushUpdate} disabled={pushing}
              className="w-full mt-6 py-3.5 rounded-xl font-bold bg-accent-primary text-white shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {pushing ? <><Loader2 size={18} className="animate-spin" /> Pushing...</> : <><Upload size={18} /> Push Update to All Users</>}
            </button>
          </div>
        </motion.div>
      )}
      {/* Maintenance Confirmation Modal */}
      <AnimatePresence>
        {showMaintenanceModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bg-card border border-glass-border rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-black text-text-primary mb-2">Activate Maintenance Mode?</h2>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                This will immediately block all non-admin users from accessing the platform. They will see the maintenance screen with the countdown timer you configured. Are you sure you want to proceed?
              </p>
              
              <div className="flex gap-3">
                <button onClick={() => setShowMaintenanceModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-bg-secondary text-text-primary hover:bg-glass-border transition-colors">
                  Cancel
                </button>
                <button onClick={() => executeMaintenanceToggle(true)} className="flex-1 py-3 rounded-xl font-bold bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:opacity-90 transition-opacity">
                  Yes, Activate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
