import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Wifi, MapPin, ArrowDownToLine, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import NrtAmount from '@/components/ui/NrtAmount';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function SignalBars({ strength = 4 }: { strength?: number }) {
  return (
    <div className="flex items-end gap-[2px] h-3.5">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`w-[3px] rounded-t-sm transition-colors duration-500 ${
            i <= strength ? 'bg-accent-primary' : 'bg-glass-border'
          }`}
          style={{ height: `${25 + i * 25}%` }}
        />
      ))}
    </div>
  );
}

interface EarningsDetailModalProps {
  earningCampaign: any | null;
  onClose: () => void;
  enrollment: any;
  durationSecs: number;
  isClaiming: boolean;
  handleClaim: () => void;
  recentActivity: any[];
}

export default function EarningsDetailModal({
  earningCampaign,
  onClose,
  enrollment,
  durationSecs,
  isClaiming,
  handleClaim,
  recentActivity,
}: EarningsDetailModalProps) {
  const totalData = enrollment?.data_consumed_gb || 0;
  const nrtEarned = (enrollment?.nrt_earned || 0) + (enrollment?.unclaimed_nrt || 0);

  const { signalPercentage } = useNetworkStatus();
  const strength = signalPercentage
    ? (signalPercentage > 75 ? 4 : signalPercentage > 50 ? 3 : signalPercentage > 25 ? 2 : 1)
    : 4;

  const durationFormatted = durationSecs >= 3600
    ? `${(durationSecs / 3600).toFixed(1)} hrs`
    : durationSecs >= 60
      ? `${Math.floor(durationSecs / 60)} min ${durationSecs % 60}s`
      : `${durationSecs}s`;

  return (
    <AnimatePresence>
      {earningCampaign && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border overflow-y-auto max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Scrollable body */}
            <div className="p-5 space-y-5 flex-1 overflow-y-auto">

              {/* Header */}
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Earnings Detail</h3>
                <button onClick={onClose} className="p-1.5 bg-bg-secondary rounded-full">
                  <X size={16} />
                </button>
              </div>

              {/* App card */}
              <div className="glass rounded-xl border border-glass-border p-4 space-y-4">
                {/* App identity */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-bg-secondary text-accent-primary font-bold text-xl uppercase overflow-hidden border border-glass-border">
                    {earningCampaign.logo_url ? (
                      <img src={earningCampaign.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      earningCampaign.target_app?.[0] || '?'
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary">{earningCampaign.target_app}</h4>
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                      <Globe size={10} className="text-accent-primary" />
                      {earningCampaign.category || 'General'}
                    </p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 flex items-center gap-1.5">
                    {recentActivity?.some((s: any) => s.campaign_id === earningCampaign.id && (new Date().getTime() - new Date(s.session_end).getTime() < 15 * 60 * 1000)) && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-100"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                    )}
                    active
                  </span>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  You are earning rewards by using {earningCampaign.target_app}. Keep the app open to maximize your earnings.
                </p>

                {/* ISP + Signal */}
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Wifi size={12} className="text-accent-primary" />
                    <span>Tracking Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Signal</span>
                    <SignalBars strength={strength} />
                  </div>
                </div>

                {/* Locations List */}
                {earningCampaign.target_locations && earningCampaign.target_locations.length > 0 && (
                  <div className="pt-2 border-t border-glass-border/50">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
                      <MapPin size={10} /> Target Regions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {earningCampaign.target_locations.map((loc: any, idx: number) => (
                        <div key={idx} className="px-2 py-1 bg-bg-secondary rounded-md text-[10px] font-medium text-text-primary border border-glass-border">
                          {loc.name?.split(',')[0]} <span className="text-accent-primary">({loc.radiusKm}km)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data breakdown */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <ArrowDownToLine size={12} className="text-accent-primary" />
                    <span>Total Data Tracked: <span className="text-text-primary font-semibold">{Number(totalData).toFixed(6)} GB</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Clock size={12} className="text-accent-primary" />
                    <span>Duration: <span className="text-text-primary font-semibold">{durationFormatted}</span></span>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex items-center justify-between pt-2 border-t border-glass-border/50">
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider">Total Data</p>
                    <p className="font-bold text-text-primary">{Number(totalData).toFixed(6)} GB</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider">NRT Earned</p>
                    <p className="font-bold text-accent-primary"><NrtAmount value={nrtEarned} /></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider">Rate</p>
                    <div className="flex items-baseline font-bold text-text-primary">
                      <NrtAmount value={earningCampaign?.reward_rate_per_gb} hideUnit />
                      <span className="text-[10px] text-text-secondary ml-1">NRT/GB</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>{/* end scrollable body */}

            {/* Pinned bottom actions — always visible */}
            <div className="flex gap-3 px-5 pt-4 pb-10 border-t border-glass-border/50">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-bg-secondary text-text-primary font-semibold border border-glass-border"
              >
                Close
              </button>
              <button
                onClick={handleClaim}
                disabled={isClaiming || (enrollment?.unclaimed_nrt || 0) <= 0}
                className="flex-1 py-3 rounded-xl bg-accent-primary text-primary-foreground font-semibold shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isClaiming ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Claim Rewards
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
