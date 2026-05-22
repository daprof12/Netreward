import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Smartphone, X, Activity, Clock, Zap, Coins, Wifi, RefreshCw, Gamepad2 } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import NrtAmount from '@/components/ui/NrtAmount';

interface AdminDevice {
  id: string;
  device_name: string;
  user_id: string;
  status: string;
  created_at: string;
  users?: { email: string; country: string | null };
  // Mapped
  deviceName: string;
  userEmail: string;
  country: string;
  isp: string;
  totalCampaignsJoined: number;
  activeCampaignsCount: number;
  lastCampaign: string;
  dataUsedGb: number;
  nrtEarned: number;
  claimedNrt: number;
  unclaimedNrt: number;
  duration: string;
  createdAt: string;
  activeEarnings: any[];
  activeEarnings: any[];
  pastEarnings: any[];
}

interface AdminGamingAccount {
  id: string;
  userEmail: string;
  country: string;
  platform: string;
  platformUsername: string;
  verified: boolean;
  linkedAt: string;
  totalCampaignsJoined: number;
  activeCampaignsCount: number;
  lastCampaign: string;
  duration: string;
  dataUsedGb: number;
  nrtEarned: number;
  claimedNrt: number;
  unclaimedNrt: number;
}

export default function AdminDevices() {
  usePageTitle('Admin — Devices');
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDevice, setSelectedDevice] = useState<AdminDevice | null>(null);
  
  const [activeTab, setActiveTab] = useState<'devices' | 'gaming'>('devices');
  const [gamingAccounts, setGamingAccounts] = useState<AdminGamingAccount[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *, 
          users:user_id(email, country),
          last_campaign:campaigns!last_campaign_id(title)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Fetch devices error:', error);
        const { data: fallbackData } = await supabase
          .from('devices')
          .select('*, users:user_id(email, country)')
          .order('created_at', { ascending: false });
        if (fallbackData) processDevices(fallbackData);
      } else {
        processDevices(data);
      }

      // Fetch gaming accounts
      const { data: gamingData } = await supabase
        .from('gaming_accounts')
        .select('*, users:user_id(email, country), last_campaign:campaigns!last_campaign_id(title)')
        .order('linked_at', { ascending: false });
        
      if (gamingData) {
        setGamingAccounts(gamingData.map((g: any) => {
          const totalDurationHrs = (Number(g.total_duration_seconds || 0) / 3600).toFixed(1);
          const dataGb = Number(g.total_data_bytes || 0) / (1024 * 1024 * 1024);
          const earned = Number(g.nrt_earned || 0);
          const claimed = Number(g.nrt_claimed || 0);

          return {
            id: g.id,
            userEmail: g.users?.email || 'Unknown',
            country: g.users?.country || 'Global',
            platform: g.platform,
            platformUsername: g.platform_username,
            verified: g.verified,
            linkedAt: g.linked_at,
            totalCampaignsJoined: g.total_campaigns_joined || 0,
            activeCampaignsCount: g.active_campaigns_count || 0,
            lastCampaign: g.last_campaign?.title || 'None',
            duration: `${totalDurationHrs}h`,
            dataUsedGb: dataGb,
            nrtEarned: earned,
            claimedNrt: claimed,
            unclaimedNrt: earned - claimed,
          };
        }));
      }
    } catch (e: any) { console.error('Fetch devices/gaming:', e); }
    finally { setLoading(false); }
  }, []);

  const processDevices = (data: any[]) => {
    setDevices(data.map((d: any) => {
      const totalDurationHrs = (Number(d.total_duration_seconds || 0) / 3600).toFixed(1);
      const dataGb = Number(d.total_data_bytes || 0) / (1024 * 1024 * 1024);
      const earned = Number(d.nrt_earned || d.total_nrt || 0);
      const claimed = Number(d.nrt_claimed || 0);

      return {
        ...d,
        deviceName: d.device_name || d.name || 'Unknown Device',
        userEmail: d.users?.email || d.user_email || 'Unknown',
        country: d.users?.country || d.country || 'Global',
        isp: d.isp_name || d.isp || '',
        totalCampaignsJoined: d.total_campaigns_joined || 0,
        activeCampaignsCount: d.active_campaigns_count || 0,
        lastCampaign: d.last_campaign?.title || 'None',
        dataUsedGb: dataGb,
        nrtEarned: earned,
        claimedNrt: claimed,
        unclaimedNrt: earned - claimed,
        duration: `${totalDurationHrs}h`,
        createdAt: d.created_at,
        activeEarnings: d.active_earnings || [],
        pastEarnings: d.past_earnings || [],
      };
    }));
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const allCountries = useMemo(() => {
    const uniqueCountries = new Set(devices.map(d => d.country));
    return ['Global', ...Array.from(uniqueCountries).sort()];
  }, [devices]);

  const filtered = devices.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.deviceName.toLowerCase().includes(q) || d.userEmail.toLowerCase().includes(q) || (d.isp || '').toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || d.country === countryFilter;
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchQ && matchCountry && matchStatus;
  });

  const filteredGaming = gamingAccounts.filter(g => {
    const q = search.toLowerCase();
    const matchQ = !q || g.platformUsername.toLowerCase().includes(q) || g.userEmail.toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || g.country === countryFilter;
    const matchStatus = statusFilter === 'All' || (statusFilter === 'active' && g.verified) || (statusFilter === 'offline' && !g.verified);
    return matchQ && matchCountry && matchStatus;
  });

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Devices</h1>
          <p className="text-sm text-text-secondary">View and monitor all connected devices and their earnings</p>
        </div>
        <button onClick={fetchData} className="p-2.5 bg-bg-secondary border border-glass-border rounded-xl text-text-secondary hover:text-accent-primary transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex bg-bg-secondary p-1 rounded-lg w-full max-w-sm">
        {(['devices', 'gaming'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all capitalize ${activeTab === tab ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary'}`}
          >
            {tab === 'gaming' ? 'Gaming Accounts' : 'Devices'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {activeTab === 'devices' ? [
          { icon: Smartphone, label: 'Total Devices', value: devices.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: Activity, label: 'Active Devices', value: devices.filter(d => d.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Coins, label: 'Total NRT Earned', value: devices.reduce((s, d) => s + d.nrtEarned, 0).toLocaleString(undefined, { maximumFractionDigits: 7 }), color: '#8b5cf6', bg: 'bg-purple-500/10' },
          { icon: Zap, label: 'Unclaimed NRT', value: devices.reduce((s, d) => s + d.unclaimedNrt, 0).toLocaleString(undefined, { maximumFractionDigits: 7 }), color: '#F59E0B', bg: 'bg-amber-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
            <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-xs text-text-secondary font-medium">{label}</p>
            <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
          </div>
        )) : [
          { icon: Gamepad2, label: 'Total Gaming Accounts', value: gamingAccounts.length.toString(), color: '#8B5CF6', bg: 'bg-purple-500/10' },
          { icon: Activity, label: 'Verified Accounts', value: gamingAccounts.filter(g => g.verified).length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Clock, label: 'Pending Verification', value: gamingAccounts.filter(g => !g.verified).length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
            <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-xs text-text-secondary font-medium">{label}</p>
            <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by device, user, or ISP..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none min-w-[140px]">
          <option value="All">All Statuses</option>
          {activeTab === 'devices' ? (
            <>
              <option value="active">Active</option>
              <option value="offline">Offline</option>
              <option value="disconnected">Disconnected</option>
            </>
          ) : (
            <>
              <option value="active">Verified</option>
              <option value="offline">Unverified</option>
            </>
          )}
        </select>
      </div>

      {activeTab === 'devices' ? (

      <div className="bg-bg-card border border-glass-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-secondary/50 border-b border-glass-border text-[10px] font-black uppercase text-text-secondary">
              <tr>
                <th className="px-6 py-4">Device</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4 text-center">Total Campaigns</th>
                <th className="px-6 py-4 text-center">Active Campaigns</th>
                <th className="px-6 py-4">Last Campaign</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-center">Data (GB)</th>
                <th className="px-6 py-4 text-center">NRT Earned</th>
                <th className="px-6 py-4 text-center">Claimed</th>
                <th className="px-6 py-4 text-center">Unclaimed</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(d => (
                <tr key={d.id} onClick={() => setSelectedDevice(d)} className="hover:bg-bg-secondary/30 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center text-text-secondary group-hover:text-accent-primary transition-colors">
                        <Smartphone size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-text-primary">{d.deviceName}</p>
                        <p className="text-[10px] text-text-secondary truncate max-w-[100px]">{d.isp}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-text-primary font-medium">{d.userEmail}</p>
                    <p className="text-[10px] text-text-secondary uppercase">{d.country}</p>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-text-primary">
                    {d.totalCampaignsJoined}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-green-500">
                    {d.activeCampaignsCount}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-accent-primary/10 text-accent-primary text-[10px] font-bold uppercase truncate max-w-[120px] block">
                      {d.lastCampaign}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-secondary font-medium">{d.duration}</td>
                  <td className="px-6 py-4 text-center font-bold text-text-primary">{d.dataUsedGb.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center font-black text-accent-primary">{d.nrtEarned.toLocaleString(undefined, { maximumFractionDigits: 7 })}</td>
                  <td className="px-6 py-4 text-center font-bold text-green-500">{d.claimedNrt.toLocaleString(undefined, { maximumFractionDigits: 7 })}</td>
                  <td className="px-6 py-4 text-center font-bold text-amber-500">{d.unclaimedNrt.toLocaleString(undefined, { maximumFractionDigits: 7 })}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${d.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-text-secondary text-xs tabular-nums">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-20 bg-bg-card/50">
              <div className="inline-flex w-12 h-12 rounded-full bg-bg-secondary items-center justify-center text-text-secondary mb-3">
                <Smartphone size={24} />
              </div>
              <p className="text-sm text-text-secondary">No devices matching your filters were found.</p>
            </div>
          )}
        </div>
      </div>
      ) : (
      <div className="bg-bg-card border border-glass-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-secondary/50 border-b border-glass-border text-[10px] font-black uppercase text-text-secondary">
              <tr>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4 text-center">Total Campaigns</th>
                <th className="px-6 py-4 text-center">Active Campaigns</th>
                <th className="px-6 py-4">Last Campaign</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-center">Data (GB)</th>
                <th className="px-6 py-4 text-center">NRT Earned</th>
                <th className="px-6 py-4 text-center">Claimed</th>
                <th className="px-6 py-4 text-center">Unclaimed</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Linked At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filteredGaming.map(g => (
                <tr key={g.id} className="hover:bg-bg-secondary/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center text-text-secondary group-hover:text-accent-primary transition-colors">
                        <Gamepad2 size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-text-primary">{g.platformUsername}</p>
                        <p className="text-[10px] text-text-secondary capitalize">{g.platform.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-text-primary font-medium">{g.userEmail}</p>
                    <p className="text-[10px] text-text-secondary uppercase">{g.country}</p>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-text-primary">
                    {g.totalCampaignsJoined}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-green-500">
                    {g.activeCampaignsCount}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-accent-primary/10 text-accent-primary text-[10px] font-bold uppercase truncate max-w-[120px] block">
                      {g.lastCampaign}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-secondary font-medium">{g.duration}</td>
                  <td className="px-6 py-4 text-center font-bold text-text-primary">{g.dataUsedGb.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center font-black text-accent-primary">{g.nrtEarned.toLocaleString(undefined, { maximumFractionDigits: 7 })}</td>
                  <td className="px-6 py-4 text-center font-bold text-green-500">{g.claimedNrt.toLocaleString(undefined, { maximumFractionDigits: 7 })}</td>
                  <td className="px-6 py-4 text-center font-bold text-amber-500">{g.unclaimedNrt.toLocaleString(undefined, { maximumFractionDigits: 7 })}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${g.verified ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {g.verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-text-secondary text-xs tabular-nums">
                    {new Date(g.linkedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredGaming.length === 0 && (
            <div className="text-center py-20 bg-bg-card/50">
              <div className="inline-flex w-12 h-12 rounded-full bg-bg-secondary items-center justify-center text-text-secondary mb-3">
                <Gamepad2 size={24} />
              </div>
              <p className="text-sm text-text-secondary">No gaming accounts found.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Device Detail Modal */}
      <AnimatePresence>
        {selectedDevice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedDevice(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-lg overflow-hidden max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              
              <div className="p-5 border-b border-glass-border flex justify-between items-start bg-bg-secondary">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Smartphone size={20} className="text-accent-primary" /> {selectedDevice.deviceName}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">{selectedDevice.userEmail} · {selectedDevice.country}</p>
                </div>
                <button onClick={() => setSelectedDevice(null)} className="p-1.5 rounded-full hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>

              <div className="p-5 space-y-5">
                {/* Status & Duration */}
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${selectedDevice.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{selectedDevice.status}</span>
                  <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                    <Clock size={14} /> Active for {selectedDevice.duration}
                  </div>
                </div>

                {/* NRT Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Earned', value: <span className="flex items-center justify-center gap-0.5"><span className="text-sm font-medium">$</span><NrtAmount value={selectedDevice.nrtEarned} /></span>, color: 'text-accent-primary' },
                    { label: 'Claimed', value: <span className="flex items-center justify-center gap-0.5"><span className="text-sm font-medium">$</span><NrtAmount value={selectedDevice.claimedNrt} /></span>, color: 'text-green-500' },
                    { label: 'Unclaimed', value: <span className="flex items-center justify-center gap-0.5"><span className="text-sm font-medium">$</span><NrtAmount value={selectedDevice.unclaimedNrt} /></span>, color: 'text-amber-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="glass rounded-xl p-3 border border-glass-border text-center">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider">{label}</p>
                      <div className={`text-lg font-bold ${color} mt-0.5`}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Active Earning — Campaign & Service */}
                <div>
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Active Earning — Campaign & Service</h4>
                  <div className="space-y-3">
                    {selectedDevice.activeEarnings?.map((ae, idx) => (
                      <div key={idx} className="glass rounded-xl border border-glass-border p-4 space-y-2">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="font-bold text-text-primary text-base">{ae.campaignName}</span>
                          <span className="font-bold text-accent-primary bg-accent-primary/10 px-2 py-1 rounded-lg">+<NrtAmount value={ae.nrtEarned} /></span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Service</span>
                          <span className="font-semibold text-text-primary">{ae.serviceName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Network</span>
                          <span className="font-semibold text-text-primary flex items-center gap-1.5"><Wifi size={14} className="text-accent-primary"/> {ae.networkName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Data Consumed</span>
                          <span className="font-bold text-text-primary">{ae.dataUsedGb.toFixed(2)} GB</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Past Earnings */}
                <div>
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Past Earnings</h4>
                  <div className="space-y-2">
                    {selectedDevice.pastEarnings.length > 0 ? selectedDevice.pastEarnings.map((pe, i) => (
                      <div key={i} className="flex justify-between items-center text-sm p-3 glass rounded-xl border border-glass-border hover:bg-bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <img src={pe.serviceLogo} alt={pe.serviceName} className="w-10 h-10 rounded-full border border-glass-border object-cover" />
                          <div>
                            <p className="font-bold text-text-primary">{pe.campaignName}</p>
                            <p className="text-xs text-text-secondary">{pe.serviceName} · {pe.period}</p>
                          </div>
                        </div>
                        <span className="font-black text-green-500">+<NrtAmount value={pe.nrt} /></span>
                      </div>
                    )) : (
                      <p className="text-sm text-text-secondary">No past earnings recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
