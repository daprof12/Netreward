import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Wifi, Signal, Filter, X,
  Tv, Music, Globe, Gamepad2, MessageCircle, Video,
  ArrowDownToLine, ArrowUpFromLine, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { useUserDeviceStats, useDeviceAppUsage, useDeviceById } from '@/hooks/useDeviceAnalytics';
type TimeFilter = '24H' | '7D' | '1M' | 'ALL';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/hooks/usePageTitle';

function SignalBars({ strength }: { strength: number }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`w-[3px] rounded-sm transition-colors ${
            i <= strength ? 'bg-accent-primary' : 'bg-bg-secondary'
          }`}
          style={{ height: `${25 + i * 20}%` }}
        />
      ))}
    </div>
  );
}

export default function DeviceDetail() {
  usePageTitle('Device Details');
  const { deviceId } = useParams<{ deviceId: string }>();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24H');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterISP, setFilterISP] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const { data: stats } = useUserDeviceStats(timeFilter);
  const currentData = stats?.chartData || [];
  const summary = stats?.summary || { totalData: '0.00 GB', totalNrt: '0.00 NRT' };

  const { data: appUsage = [] } = useDeviceAppUsage(deviceId || '');
  const { data: deviceInfo, isLoading: isDeviceLoading } = useDeviceById(deviceId || '');
  const deviceName = deviceInfo?.device_name || 'Device';
  const deviceStatus = deviceInfo?.status || 'offline';
  const deviceIsp = deviceInfo?.isp_name || 'Unknown ISP';

  // Get unique filter options dynamically from data
  const categories = ['All', ...Array.from(new Set(appUsage.map(a => a.campaign_id ? 'Service' : 'App')))];
  const isps = ['All', ...Array.from(new Set([deviceInfo?.isp_name || 'Unknown ISP']))];
  const statuses = ['All', ...Array.from(new Set(appUsage.map(a => a.status)))];

  const filteredApps = appUsage.filter(app => {
    if (filterStatus !== 'All' && app.status !== filterStatus) return false;
    return true;
  });

  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const handleClaim = (appId: string) => {
    setClaimedIds(prev => new Set(prev).add(appId));
  };

  const totalNrt = filteredApps.reduce((sum, a) => sum + Number(a.nrt_earned || 0), 0);
  
  // Mock icons temporarily until we have dynamic icons based on campaign
  const getAppIcon = (name: string) => {
    if (name.includes('Net') || name.includes('Stream')) return { icon: Tv, color: '#E50914' };
    if (name.includes('Game')) return { icon: Gamepad2, color: '#9D4DFF' };
    if (name.includes('Social')) return { icon: MessageCircle, color: '#25D366' };
    return { icon: Globe, color: '#007AFF' };
  };
  const totalData = filteredApps.reduce((sum, a) => sum + Number(a.total_data_gb || 0), 0);

  return (
    <motion.div
      className="space-y-5 pb-24 p-4 pt-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/devices" className="p-2 bg-bg-secondary rounded-full hover:bg-glass-bg transition-colors">
          <ChevronLeft size={20} className="text-text-primary" />
        </Link>
        <div>
          {isDeviceLoading ? (
            <Skeleton className="h-6 w-32 rounded-md" />
          ) : (
            <h1 className="text-xl font-bold tracking-tight">{deviceName}</h1>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <Wifi size={12} className={deviceStatus === 'active' ? 'text-accent-primary' : 'text-text-secondary'} />
            <span className="text-xs text-text-secondary flex items-center gap-1.5">
              {deviceStatus === 'active' && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
              )}
              {deviceStatus === 'active' ? 'Active' : 'Offline'} • {deviceIsp}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-3 border border-glass-border text-center">
          <p className="text-xs text-text-secondary">Total Data</p>
          <p className="text-lg font-bold text-text-primary">{totalData.toFixed(1)} GB</p>
        </div>
        <div className="glass rounded-xl p-3 border border-glass-border text-center">
          <p className="text-xs text-text-secondary">NRT Earned</p>
          <p className="text-lg font-bold text-accent-primary">{totalNrt.toFixed(2)} NRT</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass rounded-[20px] p-5 border border-glass-border">
        <div className="flex bg-bg-secondary p-1 rounded-lg mb-4">
          {(['24H', '7D', '1M', 'ALL'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                timeFilter === f
                  ? 'bg-accent-primary text-primary-foreground shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="h-44 w-full relative">
          {(!currentData || currentData.length === 0 || currentData.every(d => d.data === 0 && d.nrt === 0)) ? (
            <div className="absolute inset-0 flex items-center justify-center border border-glass-border rounded-xl">
              <EmptyState 
                icon={<Activity size={24} />}
                title="No Device Data"
                message="Keep your device connected to start tracking data usage and NRT earnings."
                className="border-none bg-transparent"
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradDataDetail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNrtDetail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--glass-border)' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [
                    name === 'data' ? `${value} GB` : `${value} NRT`,
                    name === 'data' ? 'Data' : 'NRT Earned'
                  ]}
                />
                <Area type="monotone" dataKey="data" stroke="var(--accent-primary)" strokeWidth={2} fill="url(#gradDataDetail)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-primary)' }} />
                <Area type="monotone" dataKey="nrt" stroke="#a78bfa" strokeWidth={2} fill="url(#gradNrtDetail)" dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-primary)' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-primary"></div>
            <span className="text-xs text-text-secondary">Data (GB)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#a78bfa]"></div>
            <span className="text-xs text-text-secondary">NRT Earned</span>
          </div>
        </div>
      </div>

      {/* App Usage Header + Filter Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">App Usage</h3>
        <button 
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-lg border border-glass-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <Filter size={14} />
          Filters
          {(filterCategory !== 'All' || filterISP !== 'All' || filterStatus !== 'All') && (
            <span className="w-2 h-2 rounded-full bg-accent-primary"></span>
          )}
        </button>
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] p-5 border-t border-glass-border space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="p-1.5 bg-bg-secondary rounded-full">
                  <X size={16} />
                </button>
              </div>

              {/* Category */}
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">Service Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        filterCategory === cat
                          ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                          : 'bg-bg-secondary border-glass-border text-text-secondary'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* ISP */}
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">ISP</p>
                <div className="flex flex-wrap gap-2">
                  {isps.map(isp => (
                    <button
                      key={isp}
                      onClick={() => setFilterISP(isp)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        filterISP === isp
                          ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                          : 'bg-bg-secondary border-glass-border text-text-secondary'
                      }`}
                    >
                      {isp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {statuses.map(st => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                        filterStatus === st
                          ? 'bg-accent-primary/20 border-accent-primary text-accent-primary'
                          : 'bg-bg-secondary border-glass-border text-text-secondary'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear + Apply */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setFilterCategory('All');
                    setFilterISP('All');
                    setFilterStatus('All');
                  }}
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

      {/* App Usage List */}
      <div className="space-y-3">
        {filteredApps.map((app, i) => {
          const isClaimed = claimedIds.has(app.campaign_id);
          const { icon: AppIcon, color: iconColor } = getAppIcon(app.app_name);

          return (
            <motion.div
              key={app.campaign_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-xl border border-glass-border p-4 space-y-3"
            >
              {/* Top Row: Icon + Name + Duration */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                    style={{ backgroundColor: `${iconColor}20` }}
                  >
                    <AppIcon size={20} style={{ color: iconColor }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-text-primary text-sm">{app.app_name}</h4>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-500 border-blue-500/20`}>
                        Service
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{Math.floor(app.duration_seconds / 60)}m</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                    app.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : app.status === 'idle'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-bg-secondary text-text-secondary'
                  }`}>
                    {app.status === 'active' && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                      </span>
                    )}
                    {app.status}
                  </span>
                </div>
              </div>

              {/* Middle Row: ISP + Signal + Data Breakdown */}
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Signal size={10} /> ISP Data
                  </span>
                  <SignalBars strength={app.status === 'active' ? 4 : 1} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <ArrowDownToLine size={10} className="text-accent-primary" /> {app.total_data_gb ? (app.total_data_gb * 0.8).toFixed(2) : '0.00'} GB
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowUpFromLine size={10} className="text-[#a78bfa]" /> {app.total_data_gb ? (app.total_data_gb * 0.2).toFixed(2) : '0.00'} GB
                  </span>
                </div>
              </div>

              {/* Bottom Row: Total + NRT + Claim */}
              <div className="flex items-center justify-between pt-1 border-t border-glass-border/50">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider">Total</p>
                    <p className="text-sm font-bold text-text-primary">{Number(app.total_data_gb).toFixed(2)} GB</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider">Earned</p>
                    <p className="text-sm font-bold text-accent-primary">{Number(app.nrt_earned).toFixed(3)} NRT</p>
                  </div>
                </div>
                <motion.button
                  whileTap={!isClaimed ? { scale: 0.95 } : {}}
                  disabled={isClaimed}
                  onClick={() => handleClaim(app.campaign_id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    isClaimed
                      ? 'bg-bg-secondary text-text-secondary border border-glass-border'
                      : 'bg-accent-primary text-primary-foreground shadow-md shadow-accent-primary/20'
                  }`}
                >
                  {isClaimed ? 'Claimed ✓' : 'Claim'}
                </motion.button>
              </div>
            </motion.div>
          );
        })}

        {filteredApps.length === 0 && (
          <div className="text-center text-text-secondary py-10">
            No apps match the current filters.
          </div>
        )}
      </div>
    </motion.div>
  );
}
