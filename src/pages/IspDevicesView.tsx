import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Smartphone, Laptop, Tablet, MapPin, Wifi, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useIspDevices } from '@/hooks/useAdminDevices';
import { useIspStore } from '@/stores/useIspStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import MarqueeText from '@/components/ui/MarqueeText';

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

const getDynamicStatus = (updatedAt?: string, dbStatus?: string, createdAt?: string): 'active' | 'idle' | 'offline' => {
  if (dbStatus === 'offline' || dbStatus === 'disconnected') {
    return 'offline';
  }
  const timeStr = updatedAt || createdAt;
  if (!timeStr) return 'offline';
  const diffMs = Date.now() - new Date(timeStr).getTime();
  const diffMin = diffMs / 60000;
  if (diffMin < 5) return 'active';
  if (diffMin < 15) return 'idle';
  return 'offline';
};

export default function IspDevicesView() {
  usePageTitle('ISP Devices');
  const { devices, isLoading } = useIspDevices();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'network' | 'campaign' | 'sp_campaign'>('all');
  const [filterValue, setFilterValue] = useState<string>('');

  const { networks, campaigns } = useIspStore();
  const availableNetworks = networks.map(n => n.name).filter(Boolean);
  const availableCampaigns = campaigns.map(c => c.name).filter(Boolean);

  const availableSpCampaigns = useMemo(() => {
    if (!devices) return [];
    const spCamps = new Set<string>();
    devices.forEach((d: any) => {
      const sessions = Array.isArray(d.device_data_sessions) ? d.device_data_sessions : [d.device_data_sessions].filter(Boolean);
      sessions.forEach((s: any) => {
        const campTitle = Array.isArray(s.campaign) ? s.campaign[0]?.title : s.campaign?.title;
        if (campTitle && !availableCampaigns.includes(campTitle)) {
          spCamps.add(campTitle);
        }
      });
    });
    return Array.from(spCamps).sort();
  }, [devices, availableCampaigns]);

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter(device => {
      const matchesSearch = 
        device.device_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.country?.toLowerCase().includes(searchQuery.toLowerCase());
        
      if (!matchesSearch) return false;

      if (filterType === 'network' && filterValue) {
        if (device.isp_name !== filterValue) return false;
      } else if (filterType === 'campaign' && filterValue) {
        const hasCampaign = device.device_data_sessions?.some((s: any) => {
          const t = Array.isArray(s.campaign) ? s.campaign[0]?.title : s.campaign?.title;
          return t === filterValue;
        });
        if (!hasCampaign && (device as any)._enrolled_campaign_title !== filterValue) return false;
      } else if (filterType === 'sp_campaign' && filterValue) {
        const hasSpCampaign = device.device_data_sessions?.some((s: any) => {
          const t = Array.isArray(s.campaign) ? s.campaign[0]?.title : s.campaign?.title;
          return t === filterValue;
        });
        if (!hasSpCampaign) return false;
      }

      return true;
    });
  }, [devices, searchQuery, filterType, filterValue]);

  const analyticsSummary = useMemo(() => {
    let totalData = 0;
    let totalNrt = 0;
    filteredDevices.forEach((d: any) => {
      const sessions = Array.isArray(d.device_data_sessions) ? d.device_data_sessions : [d.device_data_sessions].filter(Boolean);
      sessions.forEach((s: any) => {
        totalData += (s.bytes_up || 0) + (s.bytes_down || 0);
        totalNrt += (s.nrt_awarded || 0);
      });
    });
    const totalDataGB = totalData / 1e9;
    return {
      devices: filteredDevices.length,
      dataGB: totalDataGB.toFixed(6),
      nrt: totalNrt,
      cashback: totalNrt * 0.05 // 5% of user earnings roughly
    };
  }, [filteredDevices]);

  return (
    <motion.div 
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Device Monitoring</h1>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by email, device, or location..."
          className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Filter By:</span>
          <div className="flex bg-bg-secondary p-1 rounded-lg">
            {(['all', 'network', 'campaign', 'sp_campaign'] as const).map(type => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  setFilterValue('');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${
                  filterType === type 
                    ? 'bg-accent-primary text-primary-foreground shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filterType !== 'all' && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(filterType === 'network' ? availableNetworks : filterType === 'campaign' ? availableCampaigns : availableSpCampaigns).map(val => (
              <button
                key={val}
                onClick={() => setFilterValue(val === filterValue ? '' : val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filterValue === val 
                    ? 'bg-accent-primary text-primary-foreground' 
                    : 'bg-bg-secondary border border-glass-border text-text-secondary'
                }`}
              >
                {val}
                {filterValue === val && <X size={12} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Summary */}
      {(searchQuery || (filterType !== 'all' && filterValue)) && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x"
        >
          <div className="glass p-4 rounded-xl border border-glass-border min-w-[140px] shrink-0 snap-start">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Matched Devices</p>
            <p className="text-xl font-bold truncate">{analyticsSummary.devices}</p>
          </div>
          <div className="glass p-4 rounded-xl border border-glass-border min-w-[140px] shrink-0 snap-start">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Data Consumed (GB)</p>
            <p className="text-xl font-bold truncate">{analyticsSummary.dataGB}</p>
          </div>
          <div className="glass p-4 rounded-xl border border-glass-border min-w-[140px] shrink-0 snap-start">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">NRT Earned (Users)</p>
            <p className="text-xl font-bold text-accent-primary truncate">{analyticsSummary.nrt}</p>
          </div>
          <div className="glass p-4 rounded-xl border border-glass-border relative overflow-hidden min-w-[140px] shrink-0 snap-start">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#10B981]/10 rounded-full blur-xl -mr-4 -mt-4 pointer-events-none" />
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">ISP Cashback (5%)</p>
            <p className="text-xl font-bold text-[#10B981] truncate">{analyticsSummary.cashback}</p>
          </div>
        </motion.div>
      )}

      {/* Device List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-4"><span className="animate-pulse">Loading tracking data...</span></div>
        ) : filteredDevices.map(device => {
          
          // Calculate device totals
          let devDataBytes = 0;
          let devNrt = 0;
          const sessions = Array.isArray(device.device_data_sessions) ? device.device_data_sessions : [device.device_data_sessions].filter(Boolean);
          sessions.forEach((s: any) => {
            devDataBytes += (s.bytes_up || 0) + (s.bytes_down || 0);
            devNrt += (s.nrt_awarded || 0);
          });
          const devDataGB = (devDataBytes / 1e9).toFixed(6);

          const sessionObj = sessions[0];
          const campaignObjFromSession = sessionObj ? (Array.isArray(sessionObj.campaign) ? sessionObj.campaign[0] : sessionObj.campaign) : null;
          
          // Fall back to enrolled campaign title if no session-level campaign exists
          const campaignTitle = campaignObjFromSession?.title || (device as any)._enrolled_campaign_title || 'None';
          
          return (
          <div key={device.id} className="glass p-4 rounded-xl border border-glass-border space-y-4 relative overflow-hidden group">
            {getDynamicStatus(device.updated_at, device.status, device.created_at) === 'active' && (
              <div className="absolute -inset-10 bg-accent-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            )}

            {/* Header */}
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-3 overflow-hidden flex-1 pr-4">
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                  getDynamicStatus(device.updated_at, device.status, device.created_at) === 'active'
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : getDynamicStatus(device.updated_at, device.status, device.created_at) === 'idle'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-bg-secondary text-text-secondary'
                }`}>
                  {device.device_type === 'laptop' ? <Laptop size={20} /> : device.device_type === 'tablet' ? <Tablet size={20} /> : <Smartphone size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <MarqueeText 
                    text={(device.users as any)?.display_name || (device.users as any)?.email || 'Unknown User'} 
                    className="font-bold text-sm text-text-primary" 
                  />
                  <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
                    <span className="truncate">{device.device_name}</span>
                    <span className="w-1 h-1 rounded-full bg-glass-border" />
                    {(() => {
                      const dynamicStatus = getDynamicStatus(device.updated_at, device.status, device.created_at);
                      let colorClass = 'text-text-secondary';
                      let dotColorClass = 'bg-text-secondary';
                      let label = 'Offline';
                      
                      if (dynamicStatus === 'active') {
                        colorClass = 'text-green-500';
                        dotColorClass = 'bg-green-500 animate-pulse';
                        label = 'Active Now';
                      } else if (dynamicStatus === 'idle') {
                        colorClass = 'text-amber-500';
                        dotColorClass = 'bg-amber-500';
                        label = 'Idle';
                      } else {
                        if (device.updated_at) {
                          const diffMs = Date.now() - new Date(device.updated_at).getTime();
                          const diffM = Math.floor(diffMs / 60000);
                          const diffH = Math.floor(diffM / 60);
                          const diffD = Math.floor(diffH / 24);
                          if (diffD > 0) label = `Last active ${diffD}d ago`;
                          else if (diffH > 0) label = `Last active ${diffH}h ago`;
                          else if (diffM > 0) label = `Last active ${diffM}m ago`;
                          else label = 'Last active just now';
                        }
                      }

                      return (
                        <span className={`flex items-center gap-1 ${colorClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                devNrt > 0 ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {devNrt > 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {devNrt > 0 ? 'claimed' : 'unclaimed'}
              </div>
            </div>

            {/* Network & Campaign */}
            <div className="bg-bg-secondary/50 rounded-lg p-3 flex justify-between items-center text-xs relative z-10">
              <div>
                <p className="text-text-secondary font-medium mb-0.5">Network</p>
                <p className="font-bold text-text-primary">{device.isp_name || 'Unknown'}</p>
              </div>
              <div className="text-right">
                <p className="text-text-secondary font-medium mb-0.5">Campaign</p>
                <p className="font-bold text-text-primary truncate max-w-[120px]">
                  {campaignTitle}
                </p>
              </div>
            </div>

            {/* Footer Metrics */}
            <div className="flex items-center justify-between pt-1 relative z-10">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">Data Used</span>
                  <span className="text-sm font-bold">{devDataGB} GB</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">NRT Earned</span>
                  <span className="text-sm font-bold text-accent-primary">{devNrt.toFixed(6)}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <MapPin size={12} />
                  <span>{device.country || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-medium bg-bg-secondary px-2 py-0.5 rounded max-w-[140px]">
                  <Wifi size={10} className="shrink-0" />
                  <span className="truncate">{device.isp_name || 'Unknown ISP'}</span>
                  <SignalBars strength={
                    getDynamicStatus(device.updated_at, device.status, device.created_at) === 'offline'
                      ? 1
                      : getDynamicStatus(device.updated_at, device.status, device.created_at) === 'idle'
                        ? 2
                        : (device.signal_strength ? Math.ceil(device.signal_strength / 25) : 4)
                  } />
                </div>
              </div>
            </div>
          </div>
        )})}

        {filteredDevices.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-text-secondary mb-2">No devices found matching your criteria.</p>
            <button 
              onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterValue(''); }}
              className="text-accent-primary text-sm font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
