import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Smartphone, Laptop, Tablet, MapPin, Wifi, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useIspDevices } from '@/hooks/useAdminDevices';
import { useIspStore } from '@/stores/useIspStore';
import { usePageTitle } from '@/hooks/usePageTitle';

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

export default function IspDevicesView() {
  usePageTitle('ISP Devices');
  const { devices, isLoading } = useIspDevices();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'network' | 'campaign'>('all');
  const [filterValue, setFilterValue] = useState<string>('');

  const { networks, campaigns } = useIspStore();
  const availableNetworks = networks.map(n => n.name).filter(Boolean);
  const availableCampaigns = campaigns.map(c => c.name).filter(Boolean);

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
        const hasCampaign = device.device_data_sessions?.some((s: any) => s.campaign?.title === filterValue);
        if (!hasCampaign) return false;
      }

      return true;
    });
  }, [devices, searchQuery, filterType, filterValue]);

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
            {(['all', 'network', 'campaign'] as const).map(type => (
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
            {(filterType === 'network' ? availableNetworks : availableCampaigns).map(val => (
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

      {/* Device List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-4"><span className="animate-pulse">Loading tracking data...</span></div>
        ) : filteredDevices.map(device => {
          
          // Defensively handle Supabase potentially returning relationships as arrays
          const sessionObj = Array.isArray(device.device_data_sessions) 
            ? device.device_data_sessions[0] 
            : device.device_data_sessions;
            
          const campaignObjFromSession = sessionObj ? (Array.isArray(sessionObj.campaign) ? sessionObj.campaign[0] : sessionObj.campaign) : null;
          
          // Fall back to enrolled campaign title if no session-level campaign exists
          const campaignTitle = campaignObjFromSession?.title || (device as any)._enrolled_campaign_title || 'None';
          
          return (
          <div key={device.id} className="glass p-4 rounded-xl border border-glass-border space-y-4 relative overflow-hidden group">
            {device.status === 'active' && (
              <div className="absolute -inset-10 bg-accent-primary/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            )}

            {/* Header */}
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${device.status === 'active' ? 'bg-accent-primary/10 text-accent-primary' : 'bg-bg-secondary text-text-secondary'}`}>
                  {device.device_type === 'laptop' ? <Laptop size={20} /> : device.device_type === 'tablet' ? <Tablet size={20} /> : <Smartphone size={20} />}
                </div>
                <div>
                  <p className="font-bold text-sm text-text-primary">
                    {(device.users as any)?.display_name || (device.users as any)?.email || 'Unknown User'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>{device.device_name}</span>
                    <span className="w-1 h-1 rounded-full bg-glass-border" />
                    <span className={`flex items-center gap-1 ${device.status === 'active' ? 'text-green-500' : ''}`}>
                      {device.status === 'active' ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> : <span className="w-1.5 h-1.5 rounded-full bg-text-secondary" />}
                      {device.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-500/10 text-amber-500">
                <AlertCircle size={12} />
                unclaimed
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
                  <span className="text-sm font-bold">0.00 GB</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">NRT Earned</span>
                  <span className="text-sm font-bold text-accent-primary">0.00</span>
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
                  <SignalBars strength={device.signal_strength ? Math.ceil(device.signal_strength / 25) : 4} />
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
