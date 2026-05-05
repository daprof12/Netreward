import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Snowflake, LogOut, Loader2 } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';

export default function AdminEmergency() {
  const { showToast } = useToastStore();
  const [tokenFrozen, setTokenFrozen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('kv_settings')
        .select('value')
        .eq('key', 'token_frozen')
        .single();
      setTokenFrozen(data?.value === 'true' || data?.value === true);
    } catch (e) { /* setting may not exist yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleFreeze = async () => {
    const newValue = !tokenFrozen;
    if (newValue && !confirm('CRITICAL: Freezing the token stops ALL NRT transactions. Proceed?')) return;
    try {
      const { error } = await supabase.from('kv_settings').upsert(
        { key: 'token_frozen', value: String(newValue), category: 'emergency', updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      setTokenFrozen(newValue);
      showToast(newValue ? 'Token frozen!' : 'Token unfrozen.', 'warning');
    } catch (e: any) { showToast(e.message || 'Toggle failed', 'error'); }
  };

  const handleForceLogout = () => {
    if (!confirm('CRITICAL: Force logout all active user sessions? Admins will remain logged in.')) return;
    showToast('All users have been forcefully logged out.', 'success');
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-accent-primary" size={32} /></div>;

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black text-red-500 flex items-center gap-2"><AlertTriangle /> Emergency Controls</h1>
        <p className="text-sm text-text-secondary">High-impact actions for critical situations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <Snowflake size={32} />
          </div>
          <h3 className="font-black text-lg mb-2">Token Freeze</h3>
          <p className="text-sm text-text-secondary mb-6">Instantly halt all deposits, withdrawals, checkouts, and P2P trades. The token value will be locked.</p>
          <button onClick={handleFreeze} className={`w-full py-3 rounded-xl font-bold transition-all ${!tokenFrozen ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:opacity-90' : 'bg-bg-secondary text-text-primary border border-glass-border hover:bg-bg-secondary/80'}`}>
            {!tokenFrozen ? 'FREEZE TOKEN GLOBALLY' : 'UNFREEZE TOKEN'}
          </button>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <LogOut size={32} />
          </div>
          <h3 className="font-black text-lg mb-2">Force Global Logout</h3>
          <p className="text-sm text-text-secondary mb-6">Invalidate all active user, SP, and ISP sessions. Forces everyone to log in again. Admins are exempt.</p>
          <button onClick={handleForceLogout} className="w-full py-3 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/20 hover:opacity-90 transition-all">
            FORCE LOGOUT ALL USERS
          </button>
        </div>
      </div>
    </motion.div>
  );
}
