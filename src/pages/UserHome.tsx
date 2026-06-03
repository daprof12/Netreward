import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Zap, ArrowRight, TrendingUp, 
  Wallet, Bell, ChevronRight, Flame, Award, Users, QrCode, ArrowRightLeft, History,
  X, CheckCircle2, ArrowDownToLine, Clock, Globe, Wifi, MapPin
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWallet } from '@/hooks/useWallet';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useDevices } from '@/hooks/useDevices';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastStore } from '@/stores/useToastStore';
import { Loader2, Percent, Star, Activity as ActivityIcon } from 'lucide-react';
import { useP2PStore } from '@/stores/useP2PStore';
import NotificationBell from '@/components/ui/NotificationBell';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTelemetry } from '@/hooks/useTelemetry';
import EmptyState from '@/components/ui/EmptyState';
import EarningsDetailModal from '@/components/EarningsDetailModal';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import NrtAmount from '@/components/ui/NrtAmount';
import MarqueeText from '@/components/ui/MarqueeText';
import { formatNrtText } from '@/lib/formatNrt';

const quickActions = [
  { icon: ArrowRightLeft, label: 'P2P', to: '/wallet/deposit/p2p', color: '#3b82f6', bg: 'bg-blue-500/10' },
  { icon: QrCode, label: 'Scan2Pay', to: '/wallet/scan-to-pay', color: '#8b5cf6', bg: 'bg-purple-500/10' },
  { icon: Users, label: 'Referral', to: '/wallet/referral', color: '#10b981', bg: 'bg-emerald-500/10' },
  { icon: Bell, label: 'Support', to: '/support', color: '#f59e0b', bg: 'bg-amber-500/10' },
];

function SignalBars({ strength }: { strength: number }) {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`w-[3px] rounded-sm ${i <= strength ? 'bg-accent-primary' : 'bg-bg-secondary'}`}
          style={{ height: `${25 + i * 20}%` }}
        />
      ))}
    </div>
  );
}

// recentActivity will be fetched dynamically

function HomeSkeleton() {
  return (
    <div className="space-y-6 pb-24 p-4 pt-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-8 w-48 rounded-md" />
        </div>
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>
      <Skeleton className="h-36 w-full rounded-[20px]" />
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-48 w-full rounded-[20px]" />
    </div>
  );
}

export default function UserHome() {
  usePageTitle('Home');
  const { user, profile } = useAuthStore();
  const { wallet, isLoading: isWalletLoading, claimRewards, isClaiming } = useWallet();
  const { userEnrollments, isLoading: isCampaignsLoading } = useCampaigns();
  const { selectedCurrency, convertNrt } = useCurrencyStore();
  const { showToast } = useToastStore();
  const { offers } = useP2PStore();

  const userOffers = offers.filter(o => o.userId === user?.id || o.userName === (user?.user_metadata?.display_name || user?.email?.split('@')[0]));
  const hasOffers = userOffers.length > 0;
  const avgRating = hasOffers ? (userOffers.reduce((sum, o) => sum + (o.rating || 0), 0) / userOffers.length).toFixed(1) : null;

  const { data: devices } = useDevices();


  const { userHeatmap, isUserHeatmapLoading } = useTelemetry();
  const [recentActivityRaw, setRecentActivityRaw] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const [earningCampaign, setEarningCampaign] = useState<any | null>(null);

  const { data: campaignDurations } = useQuery({
    queryKey: ['campaign_durations', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data: devices } = await supabase.from('devices').select('id').eq('user_id', user.id);
      const deviceIds = devices?.map((d: any) => d.id) || [];
      if (deviceIds.length === 0) return {};
      const { data: sessions } = await supabase.from('device_data_sessions').select('campaign_id, duration_seconds').in('device_id', deviceIds);
      const map: Record<string, number> = {};
      for (const s of (sessions || [])) {
        map[s.campaign_id] = (map[s.campaign_id] || 0) + (s.duration_seconds || 0);
      }
      return map;
    },
    staleTime: 30000,
  });

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchActivities = async () => {
      if (!user?.id) return;
      
      const [sessionsRes, txRes] = await Promise.all([
        supabase.from('device_data_sessions')
          .select('campaign_id, session_end')
          .order('session_end', { ascending: false })
          .limit(20),
        supabase.from('transactions')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (sessionsRes.data) {
        setRecentActivityRaw(sessionsRes.data);
      }
      
      const activities: any[] = [];
      
      // Group earnings by campaign using userEnrollments
      if (userEnrollments) {
        userEnrollments.forEach((en: any) => {
          const earned = (en.nrt_earned || 0) + (en.unclaimed_nrt || 0);
          if (earned > 0) {
            activities.push({
              id: `en_${en.id}`,
              icon: Zap,
              type: 'earn',
              amount: earned,
              title: en.campaigns?.title || 'Unknown',
              time: new Date(en.updated_at || en.created_at || 0).getTime(),
              timeStr: new Date(en.updated_at || en.created_at || 0).toLocaleDateString(),
              color: '#10b981'
            });
          }
        });
      }
      
      if (txRes.data) {
        txRes.data.forEach((t: any) => {
          const isSender = t.sender_id === user.id;
          const action = isSender ? 'Sent' : 'Received';
          const icon = isSender ? ArrowRightLeft : QrCode;
          const color = isSender ? '#ef4444' : '#10b981';
          const title = t.tx_type === 'scan2pay' ? 'Scan2Pay' : 'Transfer';
          
          activities.push({
            id: `tx_${t.id}`,
            icon,
            type: 'tx',
            action,
            amount: Number(t.amount),
            title,
            time: new Date(t.created_at).getTime(),
            timeStr: new Date(t.created_at).toLocaleDateString(),
            color
          });
        });
      }
      
      activities.sort((a, b) => b.time - a.time);
      setRecentActivity(activities);
    };

    fetchActivities(); // initial fetch
    intervalId = setInterval(fetchActivities, 10000); // Poll every 10 seconds

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.id, userEnrollments]);

  const isLoading = isWalletLoading || isCampaignsLoading;

  const displayBalance = wallet?.nrt_balance ?? 0;
  
  // Filter for unique active items to prevent overcounting
  const activeEnrollments = userEnrollments?.filter((en: any) => en.status === 'active') || [];
  const uniqueCampaignIds = new Set(activeEnrollments.map((en: any) => en.campaign_id));
  const enrollmentCount = uniqueCampaignIds.size;
  
  const activeDevices = devices?.filter((d: any) => d.status === 'active') || [];
  const uniqueDeviceIds = new Set(activeDevices.map((d: any) => d.id));
  const deviceCount = uniqueDeviceIds.size;

  const totalEarned = userEnrollments?.reduce((sum: number, en: any) => sum + (en.nrt_earned || 0) + (en.unclaimed_nrt || 0), 0) ?? 0;
  const totalUnclaimed = userEnrollments?.reduce((sum: number, en: any) => sum + (en.unclaimed_nrt || 0), 0) ?? 0;

  async function handleClaim() {
    try {
      const result: any = await claimRewards();
      if (result?.success) {
        showToast(`Successfully claimed ${formatNrtText(result.net_amount)} NRT (Tax: ${formatNrtText(result.tax_amount)} ${result.tax_label})`, 'success');
      } else {
        showToast(result?.message || 'Failed to claim rewards', 'danger');
      }
    } catch (err: any) {
      showToast(err.message || 'Error claiming rewards', 'danger');
    }
  }

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-text-secondary">{greeting} 👋</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary capitalize">{displayName}</h1>
            <span className="px-2 py-0.5 bg-accent-primary/10 text-accent-primary text-[10px] font-black rounded-md border border-accent-primary/20 tracking-tighter">USER</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link to="/settings" className="flex flex-col items-end gap-1">
            <div className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md uppercase overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                displayName[0]
              )}
            </div>
            {hasOffers && (
              <div className="flex items-center gap-1 bg-accent-primary/10 px-2 py-0.5 rounded-full border border-accent-primary/20">
                <Star size={10} className="text-accent-primary fill-accent-primary" />
                <span className="text-[10px] font-bold text-accent-primary">{avgRating}</span>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative overflow-hidden rounded-[20px] p-5 shadow-xl"
        style={{
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 50%, #6366f1 100%)',
        }}
      >
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <Wallet size={140} strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-medium">Total Balance</p>
          <h2 className="text-3xl font-bold text-white mt-1 tracking-tight">
            <NrtAmount
              value={displayBalance}
              hideUnit
              className="text-3xl font-bold text-white tracking-tight"
            />
            <span className="text-lg ml-1.5 text-white/80">NRT</span>
          </h2>
          <p className="text-white/60 text-sm mt-1">
            ≈ {convertNrt(displayBalance).symbol}{convertNrt(displayBalance).amount} {selectedCurrency.split(' ')[0]}
          </p>

          <div className="flex gap-3 mt-5">
            <Link to="/wallet" className="flex-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="w-full bg-white/20 backdrop-blur-sm text-white font-semibold py-2.5 rounded-xl text-sm border border-white/10"
              >
                View Wallet
              </motion.button>
            </Link>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
              disabled={isClaiming || totalUnclaimed <= 0}
              className={`flex-1 flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl text-sm shadow-lg transition-all ${
                totalUnclaimed > 0 
                  ? 'bg-white text-purple-700 hover:bg-white/90' 
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              {isClaiming ? <Loader2 size={16} className="animate-spin" /> : totalUnclaimed > 0 ? <>Claim <NrtAmount value={totalUnclaimed} hideUnit className="font-semibold" /></> : 'Claim Rewards'}
            </motion.button>
          </div>
          {totalUnclaimed > 0 && (
            <p className="text-[10px] text-white/50 mt-2 text-center flex items-center justify-center gap-1">
              <Percent size={10} /> Tax will be deducted at source base on country
            </p>
          )}
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 border border-glass-border text-center">
          <p className="text-xs text-text-secondary">Campaigns</p>
          <p className="text-xl font-bold text-text-primary mt-0.5">{enrollmentCount}</p>
        </div>
        <div className="glass rounded-xl p-3 border border-glass-border text-center">
          <p className="text-xs text-text-secondary">Earned</p>
          <p className="text-xl font-bold text-accent-primary mt-0.5">
            <NrtAmount value={totalEarned} hideUnit className="text-xl font-bold text-accent-primary" />
          </p>
        </div>
        <div className="glass rounded-xl p-3 border border-glass-border text-center">
          <p className="text-xs text-text-secondary">Devices</p>
          <p className="text-xl font-bold text-text-primary mt-0.5">{deviceCount}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-base mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(({ icon: Icon, label, to, color, bg }) => (
            <Link key={label} to={to}>
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={`glass rounded-xl p-3 border border-glass-border flex flex-col items-center gap-2 cursor-pointer hover:bg-glass-bg/50 transition-colors`}
              >
                <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                  <Icon size={20} style={{ color }} />
                </div>
                <span className="text-[10px] font-semibold text-text-secondary">{label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Earnings Heatmap — GitHub-style */}
      <div className="glass rounded-[24px] p-5 border border-glass-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Flame size={16} className="text-orange-500" />
            Earnings Heatmap
          </h3>
          <div className="flex items-center gap-1 text-[9px] text-text-secondary">
            <span>Less</span>
            <div className="w-[10px] h-[10px] rounded-[2px] bg-bg-secondary" />
            <div className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: 'rgba(var(--accent-primary-rgb), 0.25)' }} />
            <div className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: 'rgba(var(--accent-primary-rgb), 0.5)' }} />
            <div className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: 'rgba(var(--accent-primary-rgb), 0.75)' }} />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-accent-primary" />
            <span>More</span>
          </div>
        </div>

        {isUserHeatmapLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-text-secondary" /></div>
        ) : (!userHeatmap || userHeatmap.length === 0) ? (
           <EmptyState 
             icon={<ActivityIcon size={24} />}
             title="No Activity Yet"
             message="Connect a device and join a campaign to start tracking your daily NRT earnings here."
             className="border-none bg-transparent"
           />
        ) : (
          <div className="flex gap-[3px] overflow-x-auto pb-2 scrollbar-hide">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] pr-1 shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="aspect-square w-5 flex items-center justify-end">
                  <span className="text-[9px] text-text-secondary leading-none">{day}</span>
                </div>
              ))}
            </div>
            {/* Grid — weeks x 7 days, fills full width */}
            <div className="flex gap-[3px] flex-1 min-w-0">
              {[...Array(16)].map((_, weekIndex) => (
                <div key={weekIndex} className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  {[...Array(7)].map((_, dayIndex) => {
                    const dataIndex = weekIndex * 7 + dayIndex;
                    const dayData = userHeatmap[dataIndex];
                    if (!dayData) return <div key={dayIndex} className="aspect-square w-full rounded-[2px] bg-bg-secondary/20" />;
                    
                    const intensity = dayData.intensity;
                    return (
                      <div
                        key={dayIndex}
                        title={`${dayData.activity_date}: ${dayData.value} NRT`}
                        className="aspect-square w-full rounded-[2px] transition-colors hover:ring-1 hover:ring-text-secondary/30"
                        style={{
                          backgroundColor: intensity === 4 ? 'var(--accent-primary)' :
                                           intensity === 3 ? 'rgba(var(--accent-primary-rgb), 0.75)' :
                                           intensity === 2 ? 'rgba(var(--accent-primary-rgb), 0.5)' :
                                           intensity === 1 ? 'rgba(var(--accent-primary-rgb), 0.25)' :
                                           'rgba(128, 128, 128, 0.15)'
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Campaigns Preview */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-semibold text-base">Active Campaigns</h3>
          {enrollmentCount > 0 && (
            <Link to="/campaigns?tab=joined" className="text-accent-primary text-xs font-medium flex items-center gap-0.5">
              View all <ArrowRight size={12} />
            </Link>
          )}
        </div>
        
        {enrollmentCount === 0 ? (
          <EmptyState 
            icon={<Zap size={24} />}
            title="No Active Campaigns"
            message="Join data-reward campaigns to start monetizing your internet usage."
            action={{ label: "Browse Campaigns", onClick: () => window.location.href = "/campaigns" }}
            className="py-6"
          />
        ) : (
          <div className="space-y-3">
            {([...(userEnrollments || [])].sort((a: any, b: any) => {
              const dateA = a.created_at || a.campaigns?.created_at || 0;
              const dateB = b.created_at || b.campaigns?.created_at || 0;
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            })).slice(0, 2).map((en: any, i: number) => {
              const camp = en.campaigns;
              return (
                <div 
                  onClick={() => {
                    setEarningCampaign(camp);
                  }}
                  key={en.id}
                  className="block"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(var(--accent-primary-rgb), 0.03)' }}
                    whileTap={{ scale: 0.98 }}
                    className="glass p-4 rounded-xl border border-glass-border cursor-pointer transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-xl font-bold shadow-inner uppercase overflow-hidden border border-glass-border">
                          {camp?.logo_url ? (
                            <img src={camp.logo_url} alt={camp?.title} className="w-full h-full object-cover" />
                          ) : (
                            camp?.title?.[0] || '?'
                          )}
                        </div>
                        {/* Creator Overlay Logo */}
                        {(camp as any)?.creator_logo && (camp as any).creator_logo !== camp?.logo_url && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-bg-primary overflow-hidden bg-bg-secondary shadow-sm">
                            <img src={(camp as any).creator_logo} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-text-primary text-sm flex items-center gap-2 min-w-0">
                              <MarqueeText text={camp?.title || 'Campaign'} className="flex-1" />
                              {recentActivityRaw?.some((s: any) => s.campaign_id === camp.id && (new Date().getTime() - new Date(s.session_end).getTime() < 15 * 60 * 1000)) && (
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-100"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-text-secondary mt-0.5 font-medium flex items-center gap-1 min-w-0">
                              <MarqueeText text={(camp as any)?.creator_name || 'NetReward Partner'} className="max-w-[100px] inline-block text-text-secondary" />
                              <span className="shrink-0">•</span>
                              <span className="shrink-0">{(camp as any)?.category || 'General'}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <p className="text-xs font-bold text-accent-primary">{Number(en.data_consumed_gb).toFixed(6)} GB</p>
                            <p className="text-[8px] text-text-secondary font-bold uppercase tracking-tighter">Consumed</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent-primary rounded-full transition-all duration-500" 
                              style={{ width: `${(camp?.budget_spent / camp?.total_budget) * 100 || 0}%` }} 
                            />
                          </div>
                          <span className="text-[10px] font-black text-accent-primary">
                            +<NrtAmount value={(en.nrt_earned || 0) + (en.unclaimed_nrt || 0)} hideUnit className="text-[10px] font-black text-accent-primary" /> NRT
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-semibold text-base">Recent Activity</h3>
        </div>
        
        {recentActivity.length === 0 ? (
          <EmptyState 
            icon={<History size={24} />}
            title="No Recent Activity"
            message="Your rewards and activity will appear here once you start using connected apps."
            className="py-6"
          />
        ) : (
          <div className="glass rounded-xl border border-glass-border divide-y divide-glass-border/50 overflow-hidden">
            {recentActivity.slice(0, visibleCount).map((activity, i) => {
              const ActivityIcon = activity.icon;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 p-3.5 hover:bg-glass-bg/30 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${activity.color}15` }}
                  >
                    <ActivityIcon size={16} style={{ color: activity.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary font-medium truncate flex items-center gap-1">
                      {activity.type === 'earn' ? (
                        <>Earned <NrtAmount value={activity.amount} hideUnit className="font-bold text-accent-primary" /> NRT from {activity.title}</>
                      ) : (
                        <>{activity.action} <NrtAmount value={activity.amount} hideUnit className="font-bold text-accent-primary" /> NRT via {activity.title}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-text-secondary whitespace-nowrap">{activity.timeStr}</span>
                  </div>
                </motion.div>
              );
            })}
            {recentActivity.length > visibleCount && (
              <button 
                onClick={() => setVisibleCount(prev => prev + 4)}
                className="w-full py-3 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors bg-glass-bg/10 flex items-center justify-center gap-1"
              >
                Load More <ArrowDownToLine size={12} />
              </button>
            )}
          </div>
        )}
      </div>
      {/* ── Earnings Detail Sheet ────────────────────────────────────────── */}
      <EarningsDetailModal
        earningCampaign={earningCampaign}
        onClose={() => setEarningCampaign(null)}
        enrollment={userEnrollments?.find((e: any) => e.campaign_id === earningCampaign?.id)}
        durationSecs={earningCampaign ? (campaignDurations?.[earningCampaign.id] || 0) : 0}
        isClaiming={isClaiming}
        handleClaim={handleClaim}
        recentActivity={recentActivityRaw || []}
      />
    </motion.div>
  );
}
