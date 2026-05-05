import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Check, Share2, Users, Gift, TrendingUp, Inbox } from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { Skeleton } from '@/components/ui/skeleton';

export default function Referral() {
  const navigate = useNavigate();
  const { referrals, referralCode, isLoading, totalReferred, totalEarned, pendingRewards } = useReferrals();
  const [copied, setCopied] = useState(false);

  const referralLink = `https://netreward.app/join?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24 p-4 pt-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-[20px]" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">Referral Program</h1>
          <p className="text-xs text-text-secondary">Earn NRT for every friend you invite</p>
        </div>
      </div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[20px] p-6 shadow-xl text-center space-y-2"
        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
      >
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <Gift size={160} strokeWidth={1} />
        </div>
        <Gift size={40} className="text-white mx-auto relative z-10" />
        <h2 className="text-2xl font-bold text-white relative z-10">Earn 5 NRT</h2>
        <p className="text-white/80 text-sm relative z-10">for every friend who joins and earns their first reward</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Referred', value: String(totalReferred), color: '#3b82f6' },
          { icon: TrendingUp, label: 'Total Earned', value: `${totalEarned.toFixed(1)} NRT`, color: 'var(--accent-primary)' },
          { icon: Gift, label: 'Pending', value: `${pendingRewards.toFixed(1)} NRT`, color: '#f59e0b' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-xl p-3 border border-glass-border text-center">
            <Icon size={18} style={{ color }} className="mx-auto mb-1" />
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="font-bold text-text-primary text-sm mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div>
        <p className="text-sm font-medium text-text-secondary mb-2">Your Referral Code</p>
        <div className="glass rounded-xl border border-glass-border p-4 space-y-3">
          <div className="text-center">
            <span className="text-3xl font-black text-accent-primary tracking-widest">{referralCode}</span>
          </div>
          <div className="bg-bg-secondary rounded-lg px-3 py-2 flex items-center gap-2">
            <p className="text-xs text-text-secondary flex-1 truncate font-mono">{referralLink}</p>
            <button 
              onClick={handleCopy}
              className="text-text-secondary hover:text-accent-primary transition-all duration-300"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"
                  >
                    <Check size={10} strokeWidth={3} /> Copied
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Copy size={16} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
          <button className="w-full py-3 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2">
            <Share2 size={16} />
            Invite Friends
          </button>
        </div>
      </div>

      {/* How it works */}
      <div>
        <p className="text-sm font-semibold mb-3">How It Works</p>
        <div className="space-y-2">
          {[
            { step: '1', text: 'Share your unique referral code or link with friends' },
            { step: '2', text: 'Friend signs up and earns their first NRT reward' },
            { step: '3', text: 'You receive 5 NRT instantly in your wallet' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3 glass rounded-xl p-3 border border-glass-border">
              <div className="w-7 h-7 rounded-full bg-accent-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                {step}
              </div>
              <p className="text-xs text-text-secondary leading-relaxed pt-0.5">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referred users */}
      <div>
        <p className="text-sm font-semibold mb-3">Referred Users</p>
        <div className="glass rounded-xl border border-glass-border divide-y divide-glass-border/50 overflow-hidden">
          {referrals.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox size={32} className="mx-auto mb-3 text-text-secondary opacity-20" />
              <p className="text-sm text-text-secondary">No referrals yet</p>
              <p className="text-xs text-text-secondary mt-1">Share your code to start earning!</p>
            </div>
          ) : (
            referrals.map((ref, i) => {
              const name = (ref as any).referred_user?.display_name || (ref as any).referred_user?.email?.split('@')[0] || 'User';
              return (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 p-3.5"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold text-xs">
                    {name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">{name}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-accent-primary">+{Number(ref.reward_nrt).toFixed(2)} NRT</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      ref.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {ref.status}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
