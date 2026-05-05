import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users2, Zap, ShieldCheck, Wallet } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

const methods = [
  {
    id: 'p2p',
    to: '/wallet/deposit/p2p',
    icon: Users2,
    iconColor: '#3b82f6',
    iconBg: 'bg-blue-500/10',
    title: 'P2P',
    subtitle: 'Buy directly from other users',
    badge: 'Best Rate',
    badgeColor: 'bg-blue-500/10 text-blue-400',
  },
  {
    id: 'instant',
    to: '/wallet/deposit/instant',
    icon: Zap,
    iconColor: '#f59e0b',
    iconBg: 'bg-amber-500/10',
    title: 'Instant Purchase',
    subtitle: 'Quick buy at platform rate',
    badge: 'Fastest',
    badgeColor: 'bg-amber-500/10 text-amber-400',
  },
  {
    id: 'exchanger',
    to: '/wallet/deposit/exchanger',
    icon: ShieldCheck,
    iconColor: '#10b981',
    iconBg: 'bg-emerald-500/10',
    title: 'Verified Exchanger',
    subtitle: 'Buy via trusted exchange platforms',
    badge: 'Trusted',
    badgeColor: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    id: 'address',
    to: '/wallet/deposit/address',
    icon: Wallet,
    iconColor: '#8b5cf6',
    iconBg: 'bg-purple-500/10',
    title: 'My NRT Wallet',
    subtitle: 'Receive NRT to your unique address',
    badge: null,
    badgeColor: '',
  },
];

export default function DepositHub() {
  usePageTitle('Deposit');
  const navigate = useNavigate();

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-bg-secondary rounded-full hover:bg-glass-bg transition-colors"
        >
          <ChevronLeft size={20} className="text-text-primary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buy NRT</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Method to purchase for your local currency
          </p>
        </div>
      </div>

      {/* Method cards */}
      <div className="space-y-3">
        {methods.map(({ id, to, icon: Icon, iconColor, iconBg, title, subtitle, badge, badgeColor }, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link to={to}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="glass rounded-xl border border-glass-border p-4 flex items-center gap-4 cursor-pointer hover:bg-glass-bg/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
                  <Icon size={24} style={{ color: iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-text-primary">{title}</h3>
                    {badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
                </div>
                <ChevronRight size={18} className="text-text-secondary shrink-0" />
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Notice */}
      <div className="glass rounded-xl border border-glass-border p-4 text-xs text-text-secondary leading-relaxed">
        <span className="font-semibold text-text-primary">Important:</span> All purchases are
        subject to network fees. NRT will be credited to your wallet within the timeframe
        specified by your chosen method.
      </div>
    </motion.div>
  );
}
