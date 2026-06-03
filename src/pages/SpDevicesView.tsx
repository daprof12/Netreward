import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Smartphone, Laptop, Tablet, MapPin, Wifi, CheckCircle2, AlertCircle, X } from 'lucide-react';

import { useSpDevices } from '@/hooks/useAdminDevices';
import { useSpStore } from '@/stores/useSpStore';
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

export default function SpDevicesView() {
  usePageTitle('SP Devices');
  const { sessions, isLoading } = useSpDevices();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'service' | 'campaign'>('all');
  const [filterValue, setFilterValue] = useState<string>('');

  const { services, campaigns } = useSpStore();
  const availableCampaigns = campaigns.map(c => c.name).filter(Boolean);
  const availableServices = services.map(s => s.name).filter(Boolean);

  const filteredDevices = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(session => {
      const device = session.device;
      if (!device) return false;

      // 1. Search Filter
      const matchesSearch = 
        device.device_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.country?.toLowerCase().includes(searchQuery.toLowerCase());
        
      if (!matchesSearch) return false;

      // 2. Type/Value Filter
      if (filterType === 'campaign' && filterValue) {
        if (session.campaign?.title !== filterValue) return false;
      } else if (filterType === 'service' && filterValue) {
        if (session.campaign?.service?.name !== filterValue) return false;
      }

      return true;
    });
  }, [sessions, searchQuery, filterType, filterValue]);

  const analyticsSummary = useMemo(() => {
    let totalData = 0;
    let totalNrt = 0;
    filteredDevices.forEach(session => {
      totalData += (session.bytes_up || 0) + (session.bytes_down || 0);
      totalNrt += (session.nrt_awarded || 0);
    });
    const totalDataGB = totalData / 1e9;
    return {
      devices: filteredDevices.length,
      dataGB: totalDataGB.toFixed(6),
      nrt: totalNrt,
      cashback: (totalNrt * 0.10).toFixed(6) // 10% of user earnings for SP
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
            {(['all', 'service', 'campaign'] as const).map(type => (
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
                {type}
              </button>
            ))}
          </div>
        </div>

        {filterType !== 'all' && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(filterType === 'service' ? availableServices : availableCampaigns).map(val => (
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
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">NRT Distributed</p>
            <p className="text-xl font-bold text-accent-primary truncate">{analyticsSummary.nrt}</p>
          </div>
          <div className="glass p-4 rounded-xl border border-glass-border relative overflow-hidden min-w-[140px] shrink-0 snap-start">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#3B82F6]/10 rounded-full blur-xl -mr-4 -mt-4 pointer-events-none" />
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">SP Cashback (10%)</p>
            <p className="text-xl font-bold text-[#3B82F6] truncate">{analyticsSummary.cashback}</p>
          </div>
        </motion.div>
      )}

      {/* Device List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-4"><span className="animate-pulse">Loading tracking data...</span></div>
        ) : filteredDevices.map(session => {
          const device = session.device;
          if (!device) return null;
          const dataUsedGB = ((session.bytes_up + session.bytes_down) / 1e9).toFixed(6);
          
          // Defensively handle Supabase potentially returning relationships as arrays
          const campaignObj = Array.isArray(session.campaign) ? session.campaign[0] : session.campaign;
          const serviceObj = campaignObj ? (Array.isArray(campaignObj.service) ? campaignObj.service[0] : campaignObj.service) : null;
          
          return (
          <div key={session.id} className="glass p-4 rounded-xl border border-glass-border space-y-4 relative overflow-hidden group">
            {/* Background glowing accent for active devices */}
            {getDynamicStatus(device.updated_at, device.status, device.created_at) === 'active' && (
              <div className="absolute -inset-10 bg-accent-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            )}

            {/* Header: User & Device Info */}
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

              {/* Reward Status Badge */}
              <div className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                session.nrt_awarded > 0 ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {session.nrt_awarded > 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {session.nrt_awarded > 0 ? 'claimed' : 'unclaimed'}
              </div>
            </div>

            {/* Middle: Service & Campaign */}
            <div className="bg-bg-secondary/50 rounded-lg p-3 flex justify-between items-center text-xs relative z-10">
              <div>
                <p className="text-text-secondary font-medium mb-0.5">Service</p>
                <p className="font-bold text-text-primary">{serviceObj?.name || 'Unknown'}</p>
              </div>
              <div className="text-right">
                <p className="text-text-secondary font-medium mb-0.5">Campaign</p>
                <p className="font-bold text-text-primary truncate max-w-[120px]">{campaignObj?.title || 'Unknown'}</p>
              </div>
            </div>

            {/* Footer: Metrics */}
            <div className="flex items-center justify-between pt-1 relative z-10">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">Data Used</span>
                  <span className="text-sm font-bold">{dataUsedGB} GB</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">NRT Earned</span>
                  <span className="text-sm font-bold text-accent-primary">{session.nrt_awarded.toFixed(6)}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <MapPin size={12} />
                  <span>{device.country || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-medium bg-bg-secondary px-2 py-0.5 rounded">
                  <Wifi size={10} />
                  <span>{device.isp_name || 'Unknown ISP'}</span>
                  <SignalBars strength={
                    getDynamicStatus(device.updated_at, device.status, device.created_at) === 'active'
                      ? 4
                      : getDynamicStatus(device.updated_at, device.status, device.created_at) === 'idle'
                        ? 2
                        : 1
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
