import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Power, Loader2 } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';

export default function AdminMaintenance() {
  const { showToast } = useToastStore();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSetting = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('kv_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
      setMaintenanceMode(data?.value === 'true' || data?.value === true);
    } catch (e) { /* setting may not exist yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSetting(); }, [fetchSetting]);

  const handleToggle = async () => {
    const newValue = !maintenanceMode;
    if (newValue && !confirm('Enable maintenance mode? This will show a maintenance screen to all users except admins.')) return;
    try {
      const { error } = await supabase.from('kv_settings').upsert(
        { key: 'maintenance_mode', value: String(newValue), category: 'system', updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      setMaintenanceMode(newValue);
      showToast(newValue ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.', 'success');
    } catch (e: any) { showToast(e.message || 'Toggle failed', 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-accent-primary" size={32} /></div>;

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Maintenance</h1>
        <p className="text-sm text-text-secondary">Control global platform access</p>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl p-8 max-w-2xl mx-auto mt-12 text-center">
        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 transition-colors ${maintenanceMode ? 'bg-amber-500/20 text-amber-500' : 'bg-bg-secondary text-text-secondary'}`}>
          <Wrench size={48} />
        </div>
        
        <h2 className="text-2xl font-black mb-2">{maintenanceMode ? 'Maintenance Mode is ON' : 'System is Online'}</h2>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          {maintenanceMode 
            ? 'Users currently see a maintenance screen. Only admins can access the platform.'
            : 'The platform is currently fully accessible to all users.'}
        </p>

        <button onClick={handleToggle}
          className={`flex items-center justify-center gap-3 w-full max-w-xs mx-auto py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${maintenanceMode ? 'bg-bg-secondary text-text-primary hover:bg-bg-secondary/80 border border-glass-border' : 'bg-amber-500 text-white shadow-xl shadow-amber-500/20 hover:opacity-90'}`}>
          <Power size={24} /> {maintenanceMode ? 'Turn Off Maintenance' : 'Turn On Maintenance'}
        </button>
      </div>
    </motion.div>
  );
}
