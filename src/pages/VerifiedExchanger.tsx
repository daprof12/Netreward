import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Exchanger {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  badge: string | null;
  badge_color: string | null;
  country: string;
  volume_24h: number;
  rating: number;
}

export default function VerifiedExchanger() {
  const navigate = useNavigate();
  const [exchangers, setExchangers] = useState<Exchanger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('exchangers')
        .select('*')
        .eq('status', 'verified')
        .order('volume_24h', { ascending: false });
      setExchangers(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Verified Exchangers</h1>
          <p className="text-xs text-text-secondary">Trusted platforms for buying NRT</p>
        </div>
      </div>

      {/* Trust note */}
      <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-400">
        <ShieldCheck size={14} />
        All listed exchangers are verified by the NetReward team
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-accent-primary" size={28} /></div>
      ) : exchangers.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm">No verified exchangers available yet.</div>
      ) : (
        <div className="space-y-3">
          {exchangers.map((ex, i) => (
            <motion.a
              key={ex.id}
              href={ex.website_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-xl border border-glass-border p-4 flex items-center gap-4 cursor-pointer hover:bg-glass-bg/50 transition-colors block"
            >
              <div className="w-14 h-14 rounded-xl bg-bg-secondary flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                {ex.logo_url ? <img src={ex.logo_url} className="w-full h-full object-cover" alt={ex.name} /> : '🏛️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-text-primary">{ex.name}</h3>
                  {ex.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ex.badge_color}`}>
                      {ex.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{ex.description}</p>
              </div>
              <ExternalLink size={16} className="text-text-secondary shrink-0" />
            </motion.a>
          ))}
        </div>
      )}

      <p className="text-xs text-text-secondary text-center leading-relaxed">
        NetReward is not responsible for third-party exchanger terms or rates. Always verify before transacting.
      </p>
    </motion.div>
  );
}
