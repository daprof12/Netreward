import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Activity, Users, Zap, DollarSign, BarChart3, TrendingUp as TrendingUpIcon, Key, CheckCircle2, Code, MapPin, PieChart as PieIcon, Info, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSpStore } from '@/stores/useSpStore';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal';
import NotificationBell from '@/components/ui/NotificationBell';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';
import AnalyticsChart from '@/components/ui/AnalyticsChart';
import { useTelemetry } from '@/hooks/useTelemetry';
import EmptyState from '@/components/ui/EmptyState';
import { usePageTitle } from '@/hooks/usePageTitle';

type TimeFilter = '24H' | '7D' | '3M' | 'All';

// Removed mockChartData in favor of live DB aggregated stats

export default function SpDashboard() {
  usePageTitle('SP Dashboard');
  const { user, profile, refreshProfile, signOut, setHasOnboarded } = useAuthStore();
  const { campaigns, services, profileLogo, profileId: spProfileId } = useSpStore();
  const { convertNrt, getCurrencyDetails } = useCurrencyStore();
  const { campaignStats, fetchCampaignStats, isLoading: isStatsLoading } = useAnalyticsStore();
  const { spTelemetry, spHeatmap, isSpHeatmapLoading, isSpTelemetryLoading } = useTelemetry();

  const [chartView, setChartView] = useState<'campaigns' | 'checkout' | 'cashback'>('campaigns');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24H');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isTestingSdk, setIsTestingSdk] = useState(false);
  const [sdkStatus, setSdkStatus] = useState<'verified' | 'test_pending' | 'not_integrated'>('verified');
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);

  useEffect(() => {
    refreshProfile();
    if (spProfileId) {
      fetchCampaignStats(spProfileId, timeFilter === '24H' ? 1 : timeFilter === '7D' ? 7 : 90);
    }
  }, [spProfileId, timeFilter, refreshProfile, fetchCampaignStats]);

  const runningCampaigns = campaigns.filter(c => c.status === 'active');

  const handleLogout = async () => {
    await signOut();
    setHasOnboarded(false);
  };

  const chartData = campaignStats.map(s => ({
    name: new Date(s.date).toLocaleDateString(undefined, { weekday: 'short' }),
    value: chartView === 'campaigns' ? s.total_users_reached : 
           chartView === 'cashback' ? Number(s.total_nrt_distributed) * 0.1 : 
           Number(s.total_nrt_distributed),
  }));

  // Aggregated totals
  const totalNrtDistributed = campaignStats.reduce((sum, stat) => sum + Number(stat.total_nrt_distributed || 0), 0);
  const totalUsersReached = campaignStats.reduce((sum, stat) => sum + Number(stat.total_users_reached || 0), 0);
  const revenueNrt = totalNrtDistributed * 0.10;

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-text-secondary">{profile?.display_name || 'Partner Portal'} 👋</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary capitalize">{profile?.display_name || user?.email?.split('@')[0] || 'Partner'}</h1>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded-md border border-blue-500/20 tracking-tighter">SP</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link to="/settings" className="w-10 h-10 rounded-full bg-accent-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md uppercase overflow-hidden border-2 border-glass-border">
            {profileLogo ? (
              <img src={profileLogo} alt="" className="w-full h-full object-cover" />
            ) : (
              user?.email?.[0]
            )}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <Activity size={20} className="text-accent-primary mb-2" />
          <p className="text-xs text-text-secondary font-medium">NRT Distributed</p>
          <h3 className="text-xl font-bold text-text-primary">
            {isStatsLoading ? <Loader2 size={16} className="animate-spin text-text-secondary" /> : totalNrtDistributed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </h3>
        </div>
        <Link to="/campaigns?tab=campaigns" className="glass p-4 rounded-2xl border border-glass-border active:scale-95 transition-transform block">
          <Zap size={20} className="text-[#F59E0B] mb-2" />
          <p className="text-xs text-text-secondary font-medium">Active Campaigns</p>
          <h3 className="text-xl font-bold text-text-primary">{runningCampaigns.length}</h3>
        </Link>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <Users size={20} className="text-[#3B82F6] mb-2" />
          <p className="text-xs text-text-secondary font-medium">Users Reached</p>
          <h3 className="text-xl font-bold text-text-primary">
            {isStatsLoading ? <Loader2 size={16} className="animate-spin text-text-secondary" /> : totalUsersReached.toLocaleString()}
          </h3>
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <DollarSign size={20} className="text-[#10B981] mb-2" />
          <p className="text-xs text-text-secondary font-medium">Revenue (10%)</p>
          <h3 className="text-xl font-bold text-text-primary">
            {isStatsLoading ? (
              <Loader2 size={16} className="animate-spin text-text-secondary" />
            ) : (
              `${getCurrencyDetails().symbol}${((revenueNrt * getCurrencyDetails().rate)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            )}
          </h3>
        </div>
      </div>

      {/* SDK Integration Status Card */}
      <div className="bg-bg-card border border-glass-border rounded-[20px] p-5 mt-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
        
        {profile?.kyc_status !== 'verified' ? (
          <div className="flex flex-col text-center items-center py-4">
            <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
              <Code size={32} className="text-text-secondary opacity-50" />
            </div>
            <h3 className="font-bold text-lg mb-2">SDK Not Connected</h3>
            <p className="text-sm text-text-secondary max-w-md mx-auto mb-6 leading-relaxed">
              NetReward Tracker SDK must be active for your campaigns to correctly report data usage. Setup to get your unique API key to track user data used on your connected platforms or service and get <strong className="text-accent-primary">{useSystemStore.getState().settings.spCashbackPercentage}%</strong> of NRT user earned.
            </p>
            <Link to="/settings/kyc" state={{ targetRole: 'sp' }} className="w-full sm:w-auto px-8 py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg active:scale-95 transition-all inline-block text-center">
              Get Started with Verification
            </Link>
          </div>
        ) : (
          <>
            {/* Top row: Status + Connected indicator (absolute positioned) */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Code size={18} className="text-accent-primary" />
                  SDK Integration
                </h3>
                <p className="text-xs text-text-secondary mt-1 max-w-[250px]">
                  NetReward Tracker SDK must be active for your campaigns to correctly report data usage. Earn {useSystemStore.getState().settings.spCashbackPercentage}% NRT back.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${
                  sdkStatus === 'verified' ? 'bg-green-500/10 text-green-500' : 
                  sdkStatus === 'test_pending' ? 'bg-amber-500/10 text-amber-500' : 
                  'bg-red-500/10 text-red-500'
                }`}>
                  {sdkStatus.replace('_', ' ')}
                </span>
                {sdkStatus === 'verified' && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                )}
              </div>
            </div>

            {/* Service API Key Carousel */}
            <div className="flex flex-col gap-3">
              {services.length > 0 ? (
                <>
                  <div className="flex items-center justify-between bg-bg-secondary/50 rounded-xl p-3 border border-glass-border">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
                        {services[activeServiceIndex]?.logoUrl ? (
                          <img src={services[activeServiceIndex].logoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Key size={14} className="text-accent-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5 truncate">
                          {services[activeServiceIndex]?.name || 'Service'}
                        </p>
                        <code className="text-xs font-mono text-text-primary">
                          {services[activeServiceIndex]?.apiKey 
                            ? `${services[activeServiceIndex].apiKey.slice(0, 12)}••••${services[activeServiceIndex].apiKey.slice(-4)}`
                            : 'No API key'}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Dot indicators */}
                  {services.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5">
                      {services.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveServiceIndex(i)}
                          className={`transition-all duration-200 rounded-full ${
                            i === activeServiceIndex 
                              ? 'w-4 h-1.5 bg-accent-primary' 
                              : 'w-1.5 h-1.5 bg-text-secondary/30 hover:bg-text-secondary/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between bg-bg-secondary/50 rounded-xl p-3 border border-glass-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center">
                      <Key size={14} className="text-accent-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">No Services</p>
                      <p className="text-xs text-text-secondary">Create a service to get your API key</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Activity size={14} />
                  <span>Last Ping: <strong className="text-text-primary">{sdkStatus === 'verified' ? 'Just now' : 'Never'}</strong></span>
                </div>
                <Link to="/documentation/sdk" className="text-accent-primary font-bold hover:underline">View Documentation</Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Advanced Analytics Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Campaign ROI & Performance */}
        <div className="glass rounded-[24px] p-6 border border-glass-border space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <TrendingUpIcon size={20} className="text-accent-primary" />
              Campaign ROI
            </h3>
            <button className="p-2 hover:bg-bg-secondary rounded-full transition-colors text-text-secondary"><Info size={16} /></button>
          </div>
          
          {isSpTelemetryLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-text-secondary" /></div>
          ) : (!spTelemetry || spTelemetry.length === 0) ? (
            <EmptyState 
              icon={<TrendingUpIcon size={24} />}
              title="Insufficient Data"
              message="Ensure your SDK is integrated correctly to start tracking campaign ROI."
              className="border-none bg-transparent"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-secondary/30 p-4 rounded-2xl border border-glass-border">
                  <p className="text-[10px] text-text-secondary font-black uppercase mb-1">Avg. Conversion</p>
                  <h4 className="text-xl font-black text-text-primary">
                    {(spTelemetry.reduce((sum, t) => sum + (t.views > 0 ? (t.conversions/t.views)*100 : 0), 0) / spTelemetry.length).toFixed(1)}%
                  </h4>
                  <p className="text-[10px] text-green-500 font-bold mt-1">Live tracking active</p>
                </div>
                <div className="bg-bg-secondary/30 p-4 rounded-2xl border border-glass-border">
                  <p className="text-[10px] text-text-secondary font-black uppercase mb-1">Cost per Reward</p>
                  <h4 className="text-xl font-black text-text-primary">
                    {(spTelemetry.reduce((sum, t) => sum + (t.conversions > 0 ? t.total_cost_nrt/t.conversions : 0), 0) / spTelemetry.length).toFixed(3)} NRT
                  </h4>
                  <p className="text-[10px] text-blue-500 font-bold mt-1">Efficient Range</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-text-secondary uppercase">Top Regions</p>
                {Object.entries(
                  spTelemetry.reduce((acc, t) => {
                    acc[t.country] = (acc[t.country] || 0) + t.views;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([country, views], i) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${i===0 ? 'bg-green-500' : i===1 ? 'bg-blue-500' : 'bg-purple-500'}`} />
                      <span className="text-sm font-semibold">{country}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-text-secondary">{views} views</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Demographic Breakdown */}
        <div className="glass rounded-[24px] p-6 border border-glass-border space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <PieIcon size={20} className="text-accent-primary" />
              Audience Insights
            </h3>
          </div>

          {isSpTelemetryLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-text-secondary" /></div>
          ) : (!spTelemetry || spTelemetry.length === 0) ? (
            <EmptyState 
              icon={<Users size={24} />}
              title="Insufficient Data"
              message="Demographic breakdowns will appear here once campaigns begin receiving tracking payloads."
              className="border-none bg-transparent"
            />
          ) : (() => {
            const totalViews = spTelemetry.reduce((s, t) => s + t.views, 0);
            if (totalViews === 0) return <EmptyState icon={<Users size={24}/>} title="No views yet" message="Your campaigns have not generated tracking events." className="border-none bg-transparent" />;
            
            const mobile = spTelemetry.filter(t => t.device_type === 'Mobile App').reduce((s, t) => s + t.views, 0);
            const ext = spTelemetry.filter(t => t.device_type === 'Chrome Extension').reduce((s, t) => s + t.views, 0);
            const desktop = spTelemetry.filter(t => t.device_type === 'Desktop App').reduce((s, t) => s + t.views, 0);
            
            const categories = Array.from(new Set(spTelemetry.map(t => t.interest_category).filter(Boolean)));
            
            return (
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 uppercase text-text-secondary">
                    <span>Device Types</span>
                    <span>% Total</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Mobile App', value: ((mobile/totalViews)*100).toFixed(1), color: 'bg-accent-primary' },
                      { label: 'Chrome Extension', value: ((ext/totalViews)*100).toFixed(1), color: 'bg-[#3B82F6]' },
                      { label: 'Desktop App', value: ((desktop/totalViews)*100).toFixed(1), color: 'bg-[#8B5CF6]' },
                    ].map(item => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{item.label}</span>
                          <span className="font-bold">{item.value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-glass-border">
                   <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
                      <MapPin size={14} />
                      <span className="font-bold uppercase">Top Interest Categories</span>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {categories.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-bg-secondary border border-glass-border rounded-full text-[10px] font-bold text-text-primary">
                          {tag}
                        </span>
                      ))}
                   </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Activity Heatmap — GitHub-style */}
      <div className="glass rounded-[24px] p-5 border border-glass-border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-sm">Platform Activity</h3>
            <p className="text-[10px] text-text-secondary">NRT distribution over the last 16 weeks</p>
          </div>
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

        {isSpHeatmapLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-text-secondary" /></div>
        ) : (!spHeatmap || spHeatmap.length === 0 || spHeatmap.every(d => d.intensity === 0)) ? (
           <EmptyState 
             icon={<Activity size={24} />}
             title="No Platform Activity"
             message="Your platform activity will appear here once users start engaging with your campaigns."
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
                    const dayData = spHeatmap[dataIndex];
                    if (!dayData) return <div key={dayIndex} className="aspect-square w-full rounded-[2px] bg-bg-secondary/20" />;
                    
                    const intensity = dayData.intensity;
                    return (
                      <div
                        key={dayIndex}
                        title={`${dayData.activity_date}: ${dayData.value} NRT Distributed`}
                        className="aspect-square w-full rounded-[2px] transition-colors hover:ring-1 hover:ring-text-secondary/30"
                        style={{
                          backgroundColor: intensity === 4 ? 'var(--accent-primary)' :
                                           intensity === 3 ? 'rgba(var(--accent-primary-rgb), 0.75)' :
                                           intensity === 2 ? 'rgba(var(--accent-primary-rgb), 0.5)' :
                                           intensity === 1 ? 'rgba(var(--accent-primary-rgb), 0.25)' :
                                           'var(--bg-secondary)'
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

      <div className="glass rounded-[20px] p-5 border border-glass-border mt-6">
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Analytics</h3>
            <div className="flex gap-1 bg-bg-secondary p-1 rounded-lg">
              <button
                onClick={() => setChartType('area')}
                className={`p-1.5 rounded-md transition-colors ${chartType === 'area' ? 'bg-accent-primary text-white' : 'text-text-secondary'}`}
              >
                <TrendingUpIcon size={14} />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-accent-primary text-white' : 'text-text-secondary'}`}
              >
                <BarChart3 size={14} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setChartView('campaigns')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${chartView === 'campaigns' ? 'bg-[#3B82F6] text-white' : 'bg-bg-secondary text-text-secondary'}`}
            >
              Campaign
            </button>
            <button
              onClick={() => setChartView('checkout')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${chartView === 'checkout' ? 'bg-[#10B981] text-white' : 'bg-bg-secondary text-text-secondary'}`}
            >
              Checkout
            </button>
            <button
              onClick={() => setChartView('cashback')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${chartView === 'cashback' ? 'bg-[#8B5CF6] text-white' : 'bg-bg-secondary text-text-secondary'}`}
            >
              Cashback
            </button>
          </div>
        </div>

        <div className="h-48 w-full relative">
          {isStatsLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-card/50 backdrop-blur-[1px] rounded-xl">
              <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
            </div>
          )}
          {chartData.length === 0 || chartData.every(d => d.value === 0) ? (
            <div className="absolute inset-0 flex items-center justify-center border border-glass-border rounded-xl">
              <EmptyState 
                icon={<BarChart3 size={24} />}
                title="No Analytics Data"
                message="Your timeline data will populate once your campaigns are active."
                className="border-none bg-transparent"
              />
            </div>
          ) : (
            <AnalyticsChart 
              data={chartData}
              type={chartType}
              color={chartView === 'campaigns' ? '#3B82F6' : chartView === 'checkout' ? '#10B981' : '#8B5CF6'}
              yAxisFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString()}
              tooltipFormatter={(val) => chartView === 'campaigns' ? `${val} Users` : `${val.toFixed(2)} NRT`}
            />
          )}
        </div>

        {/* Time filter bar */}
        <div className="flex bg-bg-secondary p-1 rounded-lg mt-4">
          {(['24H', '7D', '3M', 'All'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                timeFilter === f 
                  ? 'bg-accent-primary text-white shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 mt-6">
        <div className="flex justify-between items-end">
          <h3 className="font-semibold text-lg">Live Campaigns</h3>
          <Link to="/campaigns?tab=campaigns" className="text-accent-primary text-sm font-medium">Manage</Link>
        </div>

        {runningCampaigns.length === 0 ? (
          <div className="glass p-8 rounded-xl border border-glass-border flex flex-col items-center justify-center text-center">
            <Zap size={32} className="text-text-secondary mb-3 opacity-20" />
            <p className="text-sm text-text-secondary">No active campaigns running.</p>
            <Link to="/campaigns?tab=campaigns" className="text-accent-primary text-xs font-bold mt-2">Create one now</Link>
          </div>
        ) : (
          runningCampaigns.slice(0, 3).map((camp) => (
            <Link 
              key={camp.id} 
              to="/campaigns?tab=campaigns"
              className="glass p-4 rounded-xl border border-glass-border flex justify-between items-center active:scale-[0.98] transition-transform"
            >
              <div>
                <h4 className="font-semibold text-text-primary text-sm">{camp.name}</h4>
                <p className="text-xs text-text-secondary mt-1">
                  <span className="w-2 h-2 inline-block rounded-full bg-accent-primary animate-pulse mr-1"></span> 
                  Running
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-accent-primary text-sm">{camp.spentNrt} NRT</p>
                <p className="text-xs text-text-secondary">budget spent</p>
              </div>
            </Link>
          ))
        )}
      </div>

      <LogoutConfirmModal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={handleLogout} 
      />
    </motion.div>
  );
}
