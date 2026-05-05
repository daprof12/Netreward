import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Copy, Check, Share2, Users,
  Gift, TrendingUp, Inbox, X, MessageCircle, Send,
} from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── Social share targets ────────────────────────────────────────────────────

function buildShareTargets(link: string, code: string) {
  const msg = encodeURIComponent(
    `Join NetReward and earn NRT rewards for every MB of data you use! 🎉\nUse my referral code: ${code}\n${link}`,
  );
  const msgShort = encodeURIComponent(`Join NetReward — earn NRT rewards! Use my code: ${code}`);
  return [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      color: '#25D366',
      bg: 'bg-[#25D366]/10',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.855L0 24l6.335-1.514A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.884 0-3.66-.495-5.2-1.362L3 21.88l1.268-3.718A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
      ),
      url: `https://wa.me/?text=${msg}`,
    },
    {
      id: 'twitter',
      label: 'X / Twitter',
      color: '#000000',
      bg: 'bg-neutral-500/10',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.634 5.903-5.634zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${msgShort}&url=${encodeURIComponent(link)}`,
    },
    {
      id: 'telegram',
      label: 'Telegram',
      color: '#2AABEE',
      bg: 'bg-[#2AABEE]/10',
      icon: <Send size={20} />,
      url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msg}`,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      color: '#1877F2',
      bg: 'bg-[#1877F2]/10',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    },
    {
      id: 'sms',
      label: 'SMS',
      color: '#10b981',
      bg: 'bg-emerald-500/10',
      icon: <MessageCircle size={20} />,
      url: `sms:?body=${msg}`,
    },
  ];
}

// ── Component ───────────────────────────────────────────────────────────────

export default function Referral() {
  usePageTitle('Referrals');
  const navigate = useNavigate();
  const { referrals, referralCode, isLoading, totalReferred, totalEarned, pendingRewards } = useReferrals();
  const [copied, setCopied] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  const referralLink = `https://netreward.online/join?ref=${referralCode}`;
  const shareTargets = buildShareTargets(referralLink, referralCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // Fallback for older browsers / non-HTTPS
      const el = document.createElement('textarea');
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleInvite = async () => {
    // Try native Web Share API first (mobile browsers show OS share sheet)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join NetReward',
          text: `Join NetReward and earn NRT rewards! Use my referral code: ${referralCode}`,
          url: referralLink,
        });
        return;
      } catch (err: any) {
        // User dismissed share sheet — don't open our custom sheet
        if (err?.name === 'AbortError') return;
      }
    }
    // Fall back to custom share sheet
    setShowShareSheet(true);
  };

  const handleSocialShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-24 p-4 pt-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-[20px]" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="space-y-6 pb-24 p-4 pt-8"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {/* Header */}
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

        {/* Referral link card */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">Your Referral Code</p>
          <div className="glass rounded-xl border border-glass-border p-4 space-y-3">
            {/* Code display */}
            <div className="text-center">
              <span className="text-3xl font-black text-accent-primary tracking-widest">{referralCode}</span>
            </div>

            {/* Link + copy */}
            <div className="bg-bg-secondary rounded-lg px-3 py-2 flex items-center gap-2">
              <p className="text-xs text-text-secondary flex-1 truncate font-mono">{referralLink}</p>
              <button
                id="copy-referral-link"
                onClick={handleCopy}
                className="text-text-secondary hover:text-accent-primary transition-all duration-300 shrink-0"
                title="Copy link"
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
                    <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Copy size={16} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* Action buttons row */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="copy-referral-btn"
                onClick={handleCopy}
                className="py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.span
                      key="copied"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-emerald-400"
                    >
                      <Check size={15} strokeWidth={3} /> Copied!
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5"
                    >
                      <Copy size={15} /> Copy Link
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <button
                id="invite-friends-btn"
                onClick={handleInvite}
                className="py-3 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              >
                <Share2 size={15} /> Invite Friends
              </button>
            </div>
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

      {/* ── Custom Share Sheet (bottom drawer) ── */}
      <AnimatePresence>
        {showShareSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setShowShareSheet(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary rounded-t-3xl border-t border-glass-border p-6 pb-10 space-y-5 shadow-2xl"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-glass-border rounded-full mx-auto -mt-1" />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Share Your Link</h3>
                  <p className="text-xs text-text-secondary">Invite friends to earn 5 NRT per referral</p>
                </div>
                <button
                  onClick={() => setShowShareSheet(false)}
                  className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Social platform grid */}
              <div className="grid grid-cols-5 gap-3">
                {shareTargets.map(target => (
                  <button
                    key={target.id}
                    id={`share-${target.id}`}
                    onClick={() => { handleSocialShare(target.url); setShowShareSheet(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-glass-border ${target.bg} transition-all active:scale-[0.93]`}
                    style={{ color: target.color }}
                  >
                    {target.icon}
                    <span className="text-[9px] font-semibold text-text-secondary leading-tight text-center">
                      {target.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Copy link row */}
              <div className="bg-bg-secondary rounded-xl p-3 flex items-center gap-3 border border-glass-border">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-text-secondary mb-0.5">Your referral link</p>
                  <p className="text-xs font-mono text-text-primary truncate">{referralLink}</p>
                </div>
                <button
                  id="share-copy-link-btn"
                  onClick={() => { handleCopy(); setShowShareSheet(false); }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-accent-primary text-primary-foreground text-xs font-bold rounded-lg transition-all active:scale-[0.97]"
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
