import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MaintenanceScreen() {
  const [message, setMessage] = useState('We are performing scheduled maintenance. Please check back soon.');
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('kv_settings')
        .select('key, value')
        .in('key', ['maintenance_end_time', 'maintenance_message']);
      (data || []).forEach((s: any) => {
        if (s.key === 'maintenance_message' && s.value) setMessage(s.value);
        if (s.key === 'maintenance_end_time' && s.value) setEndTime(new Date(s.value));
      });
    })();
  }, []);

  useEffect(() => {
    if (!endTime) return;
    const tick = () => {
      const diff = Math.max(0, endTime.getTime() - Date.now());
      setRemaining({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md w-full">
        <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="w-24 h-24 mx-auto rounded-3xl bg-amber-500/10 flex items-center justify-center mb-8">
          <Wrench size={48} className="text-amber-400" />
        </motion.div>

        <h1 className="text-3xl font-black text-text-primary mb-3">Under Maintenance</h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-8">{message}</p>

        {endTime && (
          <div className="flex justify-center gap-4 mb-8">
            {[
              { label: 'Hours', val: remaining.h },
              { label: 'Minutes', val: remaining.m },
              { label: 'Seconds', val: remaining.s },
            ].map(t => (
              <div key={t.label} className="glass border border-glass-border rounded-2xl p-4 w-20">
                <p className="text-2xl font-black text-accent-primary">{pad(t.val)}</p>
                <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider mt-1">{t.label}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-text-secondary uppercase tracking-wider">
          We'll be back shortly. Thank you for your patience.
        </p>
      </motion.div>
    </div>
  );
}
