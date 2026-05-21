import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Filter, Play, CheckCircle2, Loader2, X,
  Tv, Music, Globe, MapPin, TrendingUp, Info,
  ChevronRight, Wifi, ArrowDownToLine, ArrowUpFromLine, Clock,
  Gamepad2, Link2
} from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastStore } from '@/stores/useToastStore';
import { useAuthStore } from '@/stores/useAuthStore';
import SpCampaignsView from './SpCampaignsView';
import IspCampaignsView from './IspCampaignsView';
import { useClaimRewards } from '@/hooks/useRewardEngine';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import NrtAmount from '@/components/ui/NrtAmount';
import { useGamingAccounts, GAMING_PLATFORMS, type GamingPlatform } from '@/hooks/useGamingAccounts';
import { PlatformLogoCircle } from '@/components/ui/PlatformLogos';

// No static mock data needed here anymore

const SERVICE_CATEGORIES = ['All', 'Streaming', 'AI Service', 'Gaming', 'Social', 'Browsing', 'Cloud', 'Broadband', 'Telecommunication', 'Satellite', 'Fiber', 'Mobile Network', 'Other'];
const STATUSES = ['All', 'active', 'paused', 'completed'];
const LOCATIONS = ['All', 'Global', 'North America', 'Europe', 'Africa', 'Asia'];

function SignalBars({ strength }: { strength: number }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
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

export default function Campaigns() {
  usePageTitle('Campaigns');
  const { role } = useAuthStore();
  const { showToast } = useToastStore();

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = (queryParams.get('tab') as 'all' | 'joined') || 'all';

  // 1. ALL HOOKS MUST BE AT THE TOP
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'joined'>(initialTab);
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRewardMin, setFilterRewardMin] = useState<number | null>(null);
  const [filterRewardMax, setFilterRewardMax] = useState<number | null>(null);
  const [filterLocation, setFilterLocation] = useState('All');

  // Join / earning state
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [earningCampaign, setEarningCampaign] = useState<any | null>(null);

  // Data fetching
  const { activeCampaigns, userEnrollments, isLoading, joinCampaign, isJoining } = useCampaigns();
  const { claimRewards, isClaiming } = useClaimRewards();

  // Gaming accounts guard
  const { gamingAccounts, linkedPlatforms, linkAccount, isLinking, isLoading: isLoadingGaming } = useGamingAccounts();
  const [showGamingPrompt, setShowGamingPrompt] = useState(false);
  const [pendingGamingCampaignId, setPendingGamingCampaignId] = useState<string | null>(null);
  const [gamingPlatformSelect, setGamingPlatformSelect] = useState<GamingPlatform>('playstation');
  const [gamingUsernameInput, setGamingUsernameInput] = useState('');
  const availableGamingPlatforms = (Object.keys(GAMING_PLATFORMS) as GamingPlatform[]).filter(p => !linkedPlatforms.has(p));

  // Robust category matcher — handles 'Gaming', 'Game', 'Games' etc.
  const isGamingCategory = (cat?: string) => {
    if (!cat) return false;
    const n = cat.toLowerCase().trim();
    return n === 'gaming' || n === 'game' || n === 'games';
  };

  const { data: recentActivity } = useQuery({
    queryKey: ['recent_activity_campaigns', useAuthStore.getState().user?.id],
    queryFn: async () => {
      const user = useAuthStore.getState().user;
      if (!user) return [];
      const { data } = await supabase
        .from('device_data_sessions')
        .select('campaign_id, session_end, duration_seconds')
        .order('session_end', { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Aggregated duration per campaign for the user's devices
  const { data: campaignDurations } = useQuery({
    queryKey: ['campaign_durations', useAuthStore.getState().user?.id],
    queryFn: async () => {
      const user = useAuthStore.getState().user;
      if (!user) return {};
      // Get user's device IDs
      const { data: devices } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', user.id);
      const deviceIds = devices?.map((d: any) => d.id) || [];
      if (deviceIds.length === 0) return {};
      // Sum duration_seconds per campaign across all user devices
      const { data: sessions } = await supabase
        .from('device_data_sessions')
        .select('campaign_id, duration_seconds')
        .in('device_id', deviceIds);
      const map: Record<string, number> = {};
      for (const s of (sessions || [])) {
        map[s.campaign_id] = (map[s.campaign_id] || 0) + (s.duration_seconds || 0);
      }
      return map;
    },
    staleTime: 30000,
  });

  // 2. CONDITIONAL RENDERING AFTER HOOKS
  if (role === 'sp') {
    return <SpCampaignsView />;
  }

  if (role === 'isp') {
    return <IspCampaignsView />;
  }

  const joinedCampaignIds = new Set(userEnrollments?.map((en: any) => en.campaign_id) || []);

  const campaignsList = (activeCampaigns || []).map(camp => ({
    ...camp,
    joined: joinedCampaignIds.has(camp.id)
  }));

  const rates = (activeCampaigns || []).map(c => c.reward_rate_per_gb || 0);
  const globalMin = rates.length > 0 ? Math.min(...rates) : 0;
  const globalMax = rates.length > 0 ? Math.max(...rates) : 10;

  const currentMin = filterRewardMin !== null ? filterRewardMin : globalMin;
  const currentMax = filterRewardMax !== null ? filterRewardMax : globalMax;

  const hasActiveFilters =
    filterCategory !== 'All' || filterStatus !== 'All' || filterLocation !== 'All' ||
    filterRewardMin !== null || filterRewardMax !== null;

  const filtered = campaignsList
    .filter(c => activeTab === 'joined' ? c.joined : !c.joined)
    .filter(c => {
      const q = (filterSearch || searchQuery).toLowerCase();
      if (q && !c.title.toLowerCase().includes(q) && !c.target_app.toLowerCase().includes(q)) return false;
      if (filterCategory !== 'All') {
        if (c.category?.toLowerCase().trim() !== filterCategory.toLowerCase().trim()) return false;
      }
      if (filterStatus !== 'All' && c.status !== filterStatus) return false;
      if (filterRewardMin !== null && c.reward_rate_per_gb < filterRewardMin) return false;
      if (filterRewardMax !== null && c.reward_rate_per_gb > filterRewardMax) return false;
      return true;
    })
    .sort((a, b) => {
      if (activeTab === 'joined') {
        const enA = userEnrollments?.find((e: any) => e.campaign_id === a.id);
        const enB = userEnrollments?.find((e: any) => e.campaign_id === b.id);
        const dateA = enA?.created_at || a.created_at || 0;
        const dateB = enB?.created_at || b.created_at || 0;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const handleJoin = async (id: string, category?: string) => {
    // Gaming campaign guard: check if user has linked gaming accounts
    if (isGamingCategory(category) && !isLoadingGaming && gamingAccounts.length === 0) {
      setPendingGamingCampaignId(id);
      setGamingPlatformSelect(availableGamingPlatforms[0] || 'playstation');
      setGamingUsernameInput('');
      setShowGamingPrompt(true);
      return;
    }

    setJoiningId(id);
    try {
      await joinCampaign(id);
      showToast('Joined! Open the app to start earning NRT.', 'success');
    } catch (err: any) {
      // If already joined, just show success
      if (err.message?.includes('unique_violation') || err.code === '23505') {
        showToast('You are already in this campaign!', 'success');
      } else {
        showToast(err.message || 'Failed to join campaign', 'danger');
      }
    } finally {
      setJoiningId(null);
    }
  };

  const handleLinkAndJoin = async () => {
    if (!gamingUsernameInput.trim() || !pendingGamingCampaignId) return;
    try {
      await linkAccount({ platform: gamingPlatformSelect, username: gamingUsernameInput });
      setShowGamingPrompt(false);
      // Now join the campaign
      setJoiningId(pendingGamingCampaignId);
      await joinCampaign(pendingGamingCampaignId);
      showToast('Account linked & campaign joined!', 'success');
    } catch (err: any) {
      if (err.code === '23505') {
        showToast('Platform already linked', 'warning');
      } else {
        showToast(err.message || 'Failed', 'danger');
      }
    } finally {
      setJoiningId(null);
      setPendingGamingCampaignId(null);
    }
  };

  const handleClaim = async () => {
    try {
      const res = await claimRewards();
      if (res?.success) {
        showToast(`Successfully claimed $<NrtAmount value={res.net_amount} />!`, 'success');
        setEarningCampaign(null);
      } else {
        showToast(res?.message || 'Failed to claim rewards', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Claim failed', 'danger');
    }
  };

  const clearFilters = () => {
    setFilterCategory('All');
    setFilterStatus('All');
    setFilterLocation('All');
    setFilterRewardMin(0);
    setFilterRewardMax(10);
    setFilterSearch('');
  };

  return (
    <motion.div
      className="space-y-5 pb-24 p-4 pt-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
        <button
          onClick={() => setShowFilters(true)}
          className={`flex items-center gap-1.5 px-3 py-2 glass rounded-full border transition-colors ${hasActiveFilters
            ? 'border-accent-primary text-accent-primary'
            : 'border-glass-border text-text-secondary'
            }`}
        >
          <Filter size={16} />
          <span className="text-xs font-semibold">Filter</span>
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-accent-primary" />}
        </button>
      </div>

      {/* Search bar */}
      <div className="relative glass rounded-xl border border-glass-border flex items-center px-4 py-2.5">
        <Search size={16} className="text-text-secondary mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder:text-text-secondary"
        />
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-secondary p-1 rounded-lg">
        {(['all', 'joined'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary'
              }`}
          >
            {tab === 'all' ? 'Available' : 'Joined'}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {isLoading
          ? [1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          : (
            <AnimatePresence>
              {filtered.map(campaign => {
                const isThisJoining = joiningId === campaign.id;
                const budgetPct = (campaign.budget_spent / campaign.total_budget) * 100;

                return (
                  <motion.div
                    layout
                    key={campaign.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass p-4 rounded-xl border border-glass-border flex flex-col gap-3 relative overflow-hidden"
                  >
                    <div className="flex gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-xl font-bold shadow-inner uppercase overflow-hidden border border-glass-border">
                          {campaign.logo_url ? (
                            <img src={campaign.logo_url} alt={campaign.title} className="w-full h-full object-cover" />
                          ) : (
                            campaign.title[0]
                          )}
                        </div>
                        {/* Creator Overlay Logo */}
                        {campaign.creator_logo && campaign.creator_logo !== campaign.logo_url && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-bg-primary overflow-hidden bg-bg-secondary shadow-sm">
                            <img src={campaign.creator_logo} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-text-primary text-base truncate flex items-center gap-2">
                              {campaign.title}
                              {campaign.joined && recentActivity?.some((s: any) => s.campaign_id === campaign.id && (new Date().getTime() - new Date(s.session_end).getTime() < 5 * 60 * 1000)) && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-text-secondary font-medium truncate flex items-center gap-1">
                              {campaign.creator_name} • <span className="text-accent-primary/80">{campaign.category || 'General'}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-sm font-black text-accent-primary leading-none">{campaign.reward_rate_per_gb}</span>
                            <span className="text-[8px] font-bold text-text-secondary uppercase tracking-tighter">NRT / GB</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Budget bar */}
                    <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full bg-accent-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>

                    {/* CTA */}
                    {campaign.joined ? (
                      <div className="flex flex-col gap-2">
                        {/* Instruction message */}
                        <div className="flex items-start gap-2 bg-accent-primary/5 border border-accent-primary/20 rounded-lg px-3 py-2.5">
                          <Info size={14} className="text-accent-primary mt-0.5 shrink-0" />
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Open <span className="font-semibold text-accent-primary">{campaign.target_app}</span> and use the service to start earning NRT based on your data consumption.
                          </p>
                        </div>
                        {/* View Earnings button */}
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setEarningCampaign(campaign)}
                          className="flex items-center justify-center gap-2 bg-accent-primary/10 text-accent-primary py-2.5 rounded-lg text-sm font-semibold border border-accent-primary/30 hover:bg-accent-primary/20 transition-colors"
                        >
                          <TrendingUp size={16} />
                          View Your Earnings
                          <ChevronRight size={14} />
                        </motion.button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoin(campaign.id, campaign.category)}
                        disabled={isJoining || isThisJoining}
                        className="flex items-center justify-center gap-2 bg-accent-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-accent-primary/20 active:scale-[0.98] transition-transform disabled:opacity-70"
                      >
                        <span key={isThisJoining ? 'joining' : 'idle'} className="flex items-center gap-2">
                          {isThisJoining
                            ? <><Loader2 size={16} className="animate-spin" /> Joining...</>
                            : <><Play size={16} /> Join Campaign</>
                          }
                        </span>
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )
        }

        {!isLoading && filtered.length === 0 && (
          <div className="text-center text-text-secondary py-10">
            No campaigns found.
          </div>
        )}
      </div>

      {/* ── Filter Bottom Sheet ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] p-5 border-t border-glass-border space-y-5 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Sheet header */}
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="p-1.5 bg-bg-secondary rounded-full">
                  <X size={16} />
                </button>
              </div>

              {/* Search */}
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">Search</p>
                <div className="relative glass rounded-xl border border-glass-border flex items-center px-3 py-2">
                  <Search size={14} className="text-text-secondary mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Campaign or service name..."
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder:text-text-secondary"
                  />
                </div>
              </div>

              {/* Service Category */}
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">Service Category</p>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterCategory === cat
                        ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                        : 'bg-bg-secondary border-glass-border text-text-secondary'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(st => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-colors ${filterStatus === st
                        ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                        : 'bg-bg-secondary border-glass-border text-text-secondary'
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reward Range */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-sm font-medium text-text-secondary">Reward Range</p>
                  <span className="text-xs text-accent-primary font-bold">
                    {currentMin.toFixed(2)} – <NrtAmount value={currentMax} />/GB
                  </span>
                </div>
                <div className="relative h-2 mx-2">
                  {/* Track Background */}
                  <div className="absolute inset-0 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-accent-primary transition-all duration-75"
                      style={{
                        left: `${((currentMin - globalMin) / (globalMax - globalMin || 1)) * 100}%`,
                        right: `${100 - ((currentMax - globalMin) / (globalMax - globalMin || 1)) * 100}%`
                      }}
                    />
                  </div>

                  {/* Min Thumb */}
                  <input
                    type="range"
                    min={globalMin}
                    max={globalMax}
                    step={0.01}
                    value={currentMin}
                    onChange={e => setFilterRewardMin(Math.min(Number(e.target.value), currentMax - 0.01))}
                    className="absolute inset-0 w-full -top-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-accent-primary [&::-webkit-slider-thumb]:shadow-md z-20"
                  />

                  {/* Max Thumb */}
                  <input
                    type="range"
                    min={globalMin}
                    max={globalMax}
                    step={0.01}
                    value={currentMax}
                    onChange={e => setFilterRewardMax(Math.max(Number(e.target.value), currentMin + 0.01))}
                    className="absolute inset-0 w-full -top-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-accent-primary [&::-webkit-slider-thumb]:shadow-md z-30"
                  />
                </div>
                <div className="flex justify-between items-center mt-3 text-[10px] text-text-secondary">
                  <span>Min: {globalMin.toFixed(2)}</span>
                  <span>Max: {globalMax.toFixed(2)}</span>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
                  <MapPin size={13} /> Location
                </p>
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map(loc => (
                    <button
                      key={loc}
                      onClick={() => setFilterLocation(loc)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${filterLocation === loc
                        ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                        : 'bg-bg-secondary border-glass-border text-text-secondary'
                        }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 rounded-xl bg-bg-secondary text-text-primary font-semibold border border-glass-border"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-3 rounded-xl bg-accent-primary text-primary-foreground font-semibold shadow-lg shadow-accent-primary/20"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Earnings Detail Sheet ────────────────────────────────────────── */}
      <AnimatePresence>
        {earningCampaign && (() => {
          const enrollment = userEnrollments?.find((e: any) => e.campaign_id === earningCampaign.id);
          const totalData = enrollment?.data_consumed_gb || 0;
          const nrtEarned = (enrollment?.nrt_earned || 0) + (enrollment?.unclaimed_nrt || 0);

          const durationSecs = campaignDurations?.[earningCampaign.id] || 0;
          const durationFormatted = durationSecs >= 3600
            ? `${(durationSecs / 3600).toFixed(1)} hrs`
            : durationSecs >= 60
              ? `${Math.floor(durationSecs / 60)} min ${durationSecs % 60}s`
              : `${durationSecs}s`;

          const foregroundData = totalData * 0.8; // Approximate for UI
          const backgroundData = totalData * 0.2; // Approximate for UI

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setEarningCampaign(null)}
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
                    <button onClick={() => setEarningCampaign(null)} className="p-1.5 bg-bg-secondary rounded-full">
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
                        {recentActivity?.some((s: any) => s.campaign_id === earningCampaign.id && (new Date().getTime() - new Date(s.session_end).getTime() < 5 * 60 * 1000)) && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
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
                        <SignalBars strength={4} />
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
                        <span>Total Data Tracked: <span className="text-text-primary font-semibold">{totalData.toFixed(6)} GB</span></span>
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
                        <p className="font-bold text-text-primary">{totalData.toFixed(6)} GB</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider">NRT Earned</p>
                        <p className="font-bold text-accent-primary"><NrtAmount value={nrtEarned} /></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-text-secondary uppercase tracking-wider">Rate</p>
                        <p className="font-bold text-text-primary">{earningCampaign.reward_rate_per_gb} NRT/GB</p>
                      </div>
                    </div>
                  </div>

                </div>{/* end scrollable body */}

                {/* Pinned bottom actions — always visible */}
                <div className="flex gap-3 px-5 pt-4 pb-10 border-t border-glass-border/50">
                  <button
                    onClick={() => setEarningCampaign(null)}
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
          );
        })()}
      </AnimatePresence>

      {/* ── Gaming Account Link Prompt ───────────────────────────────────── */}
      <AnimatePresence>
        {showGamingPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowGamingPrompt(false); setPendingGamingCampaignId(null); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Link Gaming Account</h3>
                  <button onClick={() => { setShowGamingPrompt(false); setPendingGamingCampaignId(null); }} className="p-1.5 bg-bg-secondary rounded-full">
                    <X size={16} />
                  </button>
                </div>

                {/* Info */}
                <div className="flex items-start gap-3 bg-accent-primary/5 border border-accent-primary/20 rounded-xl px-4 py-3">
                  <Gamepad2 size={20} className="text-accent-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">This is a Gaming campaign</p>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      Link at least one gaming platform so the publisher can match your gameplay data and reward you with NRT.
                    </p>
                  </div>
                </div>

                {/* Platform Selector */}
                <div>
                  <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider mb-3">Select Platform</p>
                  <div className="grid grid-cols-2 gap-2">
                    {availableGamingPlatforms.map(platform => {
                      const meta = GAMING_PLATFORMS[platform];
                      const isSelected = gamingPlatformSelect === platform;
                      return (
                        <button
                          key={platform}
                          onClick={() => { setGamingPlatformSelect(platform); setGamingUsernameInput(''); }}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'bg-accent-primary/10 border-accent-primary ring-1 ring-accent-primary'
                              : 'glass border-glass-border hover:bg-glass-bg'
                          }`}
                        >
                          <PlatformLogoCircle platform={platform} size={28} iconSize={12} />
                          <span className="font-semibold text-xs text-text-primary truncate">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Username Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider">
                    {GAMING_PLATFORMS[gamingPlatformSelect]?.usernameLabel || 'Username'}
                  </label>
                  <input
                    type="text"
                    value={gamingUsernameInput}
                    onChange={e => setGamingUsernameInput(e.target.value)}
                    placeholder={GAMING_PLATFORMS[gamingPlatformSelect]?.usernamePlaceholder || 'Enter username'}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="px-5 pt-4 pb-10 border-t border-glass-border/50">
                <button
                  onClick={handleLinkAndJoin}
                  disabled={isLinking || isJoining || !gamingUsernameInput.trim()}
                  className="w-full py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {isLinking || isJoining ? (
                    <><Loader2 size={16} className="animate-spin" /> Linking & Joining...</>
                  ) : (
                    <><Link2 size={16} /> Link & Join Campaign</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
