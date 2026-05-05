import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Smartphone, X, Activity, Clock, Zap, Coins, Wifi, RefreshCw } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';

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
  dataUsedGb: number;
  nrtEarned: number;
  claimedNrt: number;
  unclaimedNrt: number;
  duration: string;
  createdAt: string;
  activeEarnings: any[];
  pastEarnings: any[];
}

export default function AdminDevices() {
  usePageTitle('Admin — Devices');
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDevice, setSelectedDevice] = useState<AdminDevice | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*, users!devices_user_id_fkey(email, country)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDevices((data || []).map((d: any) => ({
        ...d,
        deviceName: d.device_name || d.name || 'Unknown Device',
        userEmail: d.users?.email || 'Unknown',
        country: d.users?.country || 'Global',
        isp: d.isp_name || d.isp || '',
        dataUsedGb: Number(d.data_used_gb || d.total_data_gb || 0),
        nrtEarned: Number(d.nrt_earned || d.total_nrt || 0),
        claimedNrt: Number(d.claimed_nrt || 0),
        unclaimedNrt: Number(d.unclaimed_nrt || d.nrt_earned || 0),
        duration: d.duration || 'N/A',
        createdAt: d.created_at,
        activeEarnings: d.active_earnings || [],
        pastEarnings: d.past_earnings || [],
      })));
    } catch (e: any) { console.error('Fetch devices:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allCountries = useMemo(() => {
    const uniqueCountries = new Set(devices.map(d => d.country));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [devices]);

  const filtered = devices.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.deviceName.toLowerCase().includes(q) || d.userEmail.toLowerCase().includes(q) || (d.isp || '').toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || d.country === countryFilter;
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchQ && matchCountry && matchStatus;
  });

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">Devices</h1>
        <p className="text-sm text-text-secondary">View all registered devices across the platform</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Smartphone, label: 'Total Devices', value: devices.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: Activity, label: 'Active Devices', value: devices.filter(d => d.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
          { icon: Coins, label: 'Total NRT Earned', value: devices.reduce((s, d) => s + d.nrtEarned, 0).toFixed(2), color: '#8b5cf6', bg: 'bg-purple-500/10' },
          { icon: Zap, label: 'Unclaimed NRT', value: devices.reduce((s, d) => s + d.unclaimedNrt, 0).toFixed(2), color: '#F59E0B', bg: 'bg-amber-500/10' },
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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none">
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['Device', 'User', 'ISP', 'Status', 'Data (GB)', 'NRT Earned', 'Claimed', 'Unclaimed', 'Country', 'Registered'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(d => (
                <tr key={d.id} onClick={() => setSelectedDevice(d)} className="hover:bg-bg-secondary/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-text-secondary" />
                      <span className="font-semibold text-text-primary">{d.deviceName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary">{d.userEmail}</td>
                  <td className="px-4 py-3 text-text-secondary">{d.isp}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${d.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3 font-bold">{d.dataUsedGb.toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-accent-primary">{d.nrtEarned.toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-green-500">{d.claimedNrt.toFixed(2)}</td>
                  <td className="px-4 py-3 font-bold text-amber-500">{d.unclaimedNrt.toFixed(2)}</td>
                  <td className="px-4 py-3 text-text-secondary">{d.country}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No devices found.</div>}
        </div>
      </div>

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
                    { label: 'Total Earned', value: `${selectedDevice.nrtEarned.toFixed(2)} NRT`, color: 'text-accent-primary' },
                    { label: 'Claimed', value: `${selectedDevice.claimedNrt.toFixed(2)} NRT`, color: 'text-green-500' },
                    { label: 'Unclaimed', value: `${selectedDevice.unclaimedNrt.toFixed(2)} NRT`, color: 'text-amber-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="glass rounded-xl p-3 border border-glass-border text-center">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider">{label}</p>
                      <p className={`text-lg font-bold ${color} mt-0.5`}>{value}</p>
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
                          <span className="font-bold text-accent-primary bg-accent-primary/10 px-2 py-1 rounded-lg">+{ae.nrtEarned.toFixed(2)} NRT</span>
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
                        <span className="font-black text-green-500">+{pe.nrt.toFixed(2)} NRT</span>
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
