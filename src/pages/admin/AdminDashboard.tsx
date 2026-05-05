import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Target, Smartphone, TrendingUp, Activity, Globe, Calendar, ShieldCheck, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { adminDashboardApi } from '@/lib/adminApi';
import { supabase } from '@/lib/supabase';
import LocationSearch from '@/components/LocationSearch';
import { usePageTitle } from '@/hooks/usePageTitle';

const USER_ROLE_COLORS: Record<string, string> = { user: '#6366f1', sp: '#10B981', isp: '#3B82F6', admin: '#F59E0B' };
const ROLE_LABELS: Record<string, string> = { user: 'Standard', sp: 'SP', isp: 'ISP', admin: 'Admin' };

function KpiCard({ label, value, sub, icon: Icon, color, loading }: { label: string; value: string; sub: string; icon: typeof Users; color: string; loading?: boolean }) {
  return (
    <div className="glass p-4 rounded-2xl border border-glass-border">
      <div className="flex justify-between items-start mb-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className="text-[10px] font-medium text-text-secondary whitespace-nowrap ml-2">{sub}</span>
      </div>
      <p className="text-xs text-text-secondary font-medium">{label}</p>
      {loading ? (
        <div className="h-7 flex items-center"><Loader2 size={16} className="animate-spin text-text-secondary" /></div>
      ) : (
        <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  usePageTitle('Admin Dashboard');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ totalUsers: 0, activeCampaigns: 0, activeDevices: 0, openDisputes: 0 });
  const [userRoleData, setUserRoleData] = useState<{ name: string; value: number }[]>([]);
  const [countryData, setCountryData] = useState<{ country: string; users: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [country, setCountry] = useState('Global');
  const [dateRange, setDateRange] = useState('Last 7D');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const location = country === 'Global' ? undefined : country;
      
      const [kpiData, roleData, geoData, activityData] = await Promise.all([
        adminDashboardApi.fetchKPIs(), // In the future, pass location to filter server-side
        adminDashboardApi.fetchUsersByRole(),
        adminDashboardApi.fetchUsersByCountry(),
        adminDashboardApi.fetchRecentActivity(8),
      ]);
      setKpis(kpiData);
      setUserRoleData(roleData.map(r => ({ name: ROLE_LABELS[r.name] || r.name, value: r.value })));
      setCountryData(geoData);
      setRecentActivity(activityData);
    } catch (e) { console.error('Dashboard fetch:', e); }
    finally { setLoading(false); }
  }, [country]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time KPI subscriptions
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchData();
      }, 60000); // 1-minute debounce
    };

    const channel = supabase.channel('admin-dashboard-kpis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'p2p_disputes' }, debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Fetch transaction volume for chart
  const [txChartData, setTxChartData] = useState<any[]>([]);
  useEffect(() => {
    const fetchTx = async () => {
      let query = supabase.from('transactions').select('created_at, amount').order('created_at', { ascending: true }).limit(200);
      const { data } = await query;
      if (data && data.length > 0) {
        // Group by hour for chart
        const grouped: Record<string, { txns: number; nrt: number }> = {};
        data.forEach((tx: any) => {
          const hour = new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (!grouped[hour]) grouped[hour] = { txns: 0, nrt: 0 };
          grouped[hour].txns += 1;
          grouped[hour].nrt += Number(tx.amount || 0);
        });
        setTxChartData(Object.entries(grouped).map(([time, v]) => ({ time, ...v })));
      }
    };
    
    fetchTx();
    
    const txChannel = supabase.channel('admin-dashboard-txs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTx)
      .subscribe();
      
    return () => { supabase.removeChannel(txChannel); };
  }, []);

  const roleColors = userRoleData.map(r => {
    const key = Object.entries(ROLE_LABELS).find(([, v]) => v === r.name)?.[0] || 'user';
    return USER_ROLE_COLORS[key] || '#6366f1';
  });

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-text-secondary">Platform overview and key metrics</p>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <button onClick={fetchData} className="p-2 bg-bg-secondary border border-glass-border rounded-lg hover:bg-glass-bg transition-colors" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="w-full sm:w-64">
            <LocationSearch value={country} onChange={setCountry} />
          </div>
          <div className="flex items-center gap-1.5 bg-bg-secondary border border-glass-border rounded-lg px-3 py-2">
            <Calendar size={14} className="text-text-secondary" />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none cursor-pointer">
              {['Last 24H', 'Last 7D', 'Last 30D', 'Last 3M', 'All Time'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={kpis.totalUsers.toLocaleString()} sub="across all roles" icon={Users} color="#6366f1" loading={loading} />
        <KpiCard label="Active Campaigns" value={kpis.activeCampaigns.toString()} sub="SP + ISP" icon={Target} color="#10B981" loading={loading} />
        <KpiCard label="Active Devices" value={kpis.activeDevices.toString()} sub="earning NRT" icon={Smartphone} color="#3B82F6" loading={loading} />
        <KpiCard label="Open Disputes" value={kpis.openDisputes.toString()} sub="P2P unresolved" icon={AlertTriangle} color="#EF4444" loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-bg-card border border-glass-border rounded-xl p-5">
          <h3 className="font-bold mb-4">Transaction Activity</h3>
          <div className="h-48">
            {txChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={txChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gNrt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="nrt" name="NRT Flow" stroke="#10B981" strokeWidth={2} fill="url(#gNrt)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                {loading ? <Loader2 className="animate-spin" size={24} /> : 'No transaction data yet'}
              </div>
            )}
          </div>
        </div>

        {/* User Roles Pie */}
        <div className="bg-bg-card border border-glass-border rounded-xl p-5">
          <h3 className="font-bold mb-4">Users by Role</h3>
          {userRoleData.length > 0 ? (
            <>
              <div className="h-40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={userRoleData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                      {userRoleData.map((_, i) => <Cell key={i} fill={roleColors[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {userRoleData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: roleColors[i] }} /><span className="text-text-secondary">{d.name}</span></div>
                    <span className="font-bold">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-text-secondary text-sm">{loading ? <Loader2 className="animate-spin" size={24} /> : 'No users yet'}</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users by Country */}
        <div className="bg-bg-card border border-glass-border rounded-xl p-5">
          <h3 className="font-bold mb-4">Users by Country</h3>
          <div className="h-48">
            {countryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="country" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)', fontSize: 12 }} />
                  <Bar dataKey="users" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">{loading ? <Loader2 className="animate-spin" size={24} /> : 'No user data'}</div>
            )}
          </div>
        </div>

        {/* Recent Audit Log */}
        <div className="bg-bg-card border border-glass-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((log: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-bg-secondary/30 rounded-xl border border-glass-border">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${log.severity === 'critical' ? 'bg-red-500 animate-pulse' : log.severity === 'warning' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <div>
                    <p className="text-xs font-bold text-text-primary">{log.action || log.event_type || 'System event'}</p>
                    <p className="text-[10px] text-text-secondary">{log.actor_id || 'system'} &bull; {log.resource || ''}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-text-secondary">{log.created_at ? new Date(log.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
              </div>
            )) : (
              <div className="text-center py-8 text-text-secondary text-sm">{loading ? 'Loading...' : 'No recent activity'}</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
