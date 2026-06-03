import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Laptop, Plus, Wifi, WifiOff, ChevronRight, X, Monitor, Tablet, Check, Activity, MapPin } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import SpDevicesView from './SpDevicesView';
import IspDevicesView from './IspDevicesView';
import { useDevices } from '@/hooks/useDevices';

import { useUserDeviceStats, useDeviceSummaries } from '@/hooks/useDeviceAnalytics';
type TimeFilter = '24H' | '7D' | '1M' | 'ALL';
import EmptyState from '@/components/ui/EmptyState';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { Trash2, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import NrtAmount from '@/components/ui/NrtAmount';

// Exposed so Devices.tsx can patch the cache after linking
declare module '@/hooks/useDeviceManager' {
  export let _patchCache: ((patch: { isLinkedToCurrentUser: boolean; isLinkedToOtherUser: boolean; deviceId?: string }) => void) | undefined;
}

// Device icons mapping helper
const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'laptop': return Laptop;
    case 'desktop': return Monitor;
    case 'tablet': return Tablet;
    default: return Smartphone;
  }
};

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


function UserDevicesView() {

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24H');
  const { data: stats } = useUserDeviceStats(timeFilter);
  const currentData = stats?.chartData || [];
  const summary = stats?.summary || { totalData: 0, totalNrt: 0 };

  // Add device sheet state
  const [showAddDevice, setShowAddDevice] = useState(false);
  const { currentDevice } = useDeviceManager();
  const [deviceToRemove, setDeviceToRemove] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const { devices, addDevice, removeDevice, isAdding, isRemoving, isLoading } = useDevices();
  const { data: summaries = {} } = useDeviceSummaries(timeFilter);

  const handleLinkDevice = async () => {
    if (!currentDevice || isAdding) return;
    try {
      await addDevice({
        device_name: currentDevice.name,
        device_type: currentDevice.type,
        os: currentDevice.os,
        isp_name: currentDevice.isp,
        country: currentDevice.country,
        fingerprint: currentDevice.fingerprint, // pass fingerprint for dedup
      });

      // Patch the module-level cache so the button immediately reflects
      // isLinkedToCurrentUser = true without requiring a full remount
      if (typeof (window as any).__nrtPatchDeviceCache === 'function') {
        (window as any).__nrtPatchDeviceCache({ isLinkedToCurrentUser: true, isLinkedToOtherUser: false });
      }

      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 1800);
    } catch (err: any) {
      console.error('Failed to link device', err);
    }
  };

  const handleRemoveDevice = async () => {
    if (!deviceToRemove || isRemoving) return;
    try {
      await removeDevice(deviceToRemove);
      setDeviceToRemove(null);
    } catch (err) {
      console.error('Failed to remove device', err);
    }
  };

  return (
    <motion.div 
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">My Devices</h1>
        <button
          onClick={() => setShowAddDevice(true)}
          className="p-2 bg-accent-primary text-primary-foreground rounded-full shadow-lg shadow-accent-primary/20 active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Chart Section */}
      <div className="glass rounded-[20px] p-5 border border-glass-border">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm text-text-secondary font-medium">Data Consumed</p>
            <h2 className="text-2xl font-bold text-text-primary">{Number(summary.totalData).toFixed(6)} GB</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-text-secondary font-medium">NRT Earned</p>
            <h2 className="text-2xl font-bold text-accent-primary"><NrtAmount value={summary.totalNrt} /></h2>
          </div>
        </div>

        {/* Time filter bar */}
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
        
        <div className="h-48 w-full relative">
          {(!currentData || currentData.length === 0 || currentData.every(d => d.data === 0 && d.nrt === 0)) ? (
            <div className="absolute inset-0 flex items-center justify-center border border-glass-border rounded-xl">
              <EmptyState 
                icon={<Activity size={24} />}
                title="No Device Data"
                message="Connect devices to start tracking data usage and NRT earnings."
                className="border-none bg-transparent"
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradData" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradNrt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--glass-border)' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid var(--glass-border)', 
                    background: 'var(--bg-card)', 
                    color: 'var(--text-primary)',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: any) => [
                    name === 'data' ? `${value} GB` : `${value} NRT`,
                    name === 'data' ? 'Data' : 'NRT Earned'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="data" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={2}
                  fill="url(#gradData)" 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-primary)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="nrt" 
                  stroke="#a78bfa" 
                  strokeWidth={2}
                  fill="url(#gradNrt)" 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-primary)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
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

      {/* Connected Devices */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-lg">Connected</h3>
        {isLoading ? (
          <div className="flex justify-center p-4"><span className="animate-pulse">Loading devices...</span></div>
        ) : devices?.length === 0 ? (
          <EmptyState 
            icon={<Smartphone size={24} />}
            title="No Devices Found"
            message="Add a device to start tracking data usage and earning NRT rewards."
            action={{ label: "Add Device", onClick: () => setShowAddDevice(true) }}
          />
        ) : devices?.map((device) => {
          const dynamicStatus = getDynamicStatus(device.updated_at, device.status, device.created_at);
          const DeviceIcon = getDeviceIcon(device.device_type);
          const devSummary = summaries[device.id];
          
            return (
            <Link to={`/devices/${device.id}`} key={device.id} className="block">
              <motion.div 
                whileTap={{ scale: 0.98 }}
                className={`glass p-4 rounded-xl border relative overflow-hidden cursor-pointer hover:bg-glass-bg/50 transition-colors ${
                  dynamicStatus === 'active' 
                    ? 'border-accent-primary/50' 
                    : dynamicStatus === 'idle'
                      ? 'border-amber-500/50'
                      : 'border-glass-border'
                }`}
              >
                {dynamicStatus === 'active' && <div className="absolute top-0 right-0 w-1 h-full bg-accent-primary"></div>}
                {dynamicStatus === 'idle' && <div className="absolute top-0 right-0 w-1 h-full bg-amber-500"></div>}
                
                {/* Absolute Delete Button */}
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeviceToRemove(device.id); }}
                  className="absolute top-4 right-4 p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors z-10"
                  title="Remove Device"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    dynamicStatus === 'active' 
                      ? 'bg-accent-primary/10 text-accent-primary' 
                      : dynamicStatus === 'idle'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-bg-secondary text-text-secondary'
                  }`}>
                    <DeviceIcon size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-text-primary">{device.device_name}</h4>
                      {device.fingerprint === currentDevice?.fingerprint && (
                        <span className="text-[10px] font-bold bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded uppercase">This Device</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md ${
                        dynamicStatus === 'active' 
                          ? 'text-accent-primary bg-accent-primary/10' 
                          : dynamicStatus === 'idle'
                            ? 'text-amber-500 bg-amber-500/10'
                            : 'text-text-secondary bg-bg-secondary'
                      }`}>
                        {dynamicStatus === 'offline' ? <WifiOff size={10} /> : <Wifi size={10} />}
                        <span className="capitalize">{dynamicStatus}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-text-secondary">
                        <MapPin size={10} className="text-accent-primary" />
                        {device.country || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-text-secondary">•</span>
                      <span className="text-[10px] text-text-secondary">{device.isp_name || 'Unknown ISP'}</span>
                      <span className="text-[10px] text-text-secondary">•</span>
                      <span className="text-[10px] text-text-secondary font-medium">
                        {devSummary ? devSummary.total_data_gb.toFixed(6) : '0.00'} GB
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center gap-1 mt-6">
                    <p className="font-semibold text-accent-primary text-sm pr-6">
                      +{devSummary ? devSummary.total_nrt_earned.toFixed(6) : '0.00'} NRT
                    </p>
                    <ChevronRight size={16} className="text-text-secondary absolute right-4 top-1/2 -translate-y-1/2 mt-3" />
                  </div>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* ── Manage Devices Bottom Sheet ────────────────────────────────── */}
      <AnimatePresence>
        {showAddDevice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddDevice(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 space-y-6 overflow-y-auto flex-1">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Manage Devices</h3>
                  <button onClick={() => setShowAddDevice(false)} className="p-1.5 bg-bg-secondary rounded-full">
                    <X size={16} />
                  </button>
                </div>

                {/* Current Device Section */}
                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-3">Current Detected Device</h4>
                  {currentDevice ? (
                    <div className="glass border border-glass-border rounded-xl p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center">
                          {(() => { const CurIcon = getDeviceIcon(currentDevice.type); return <CurIcon size={20} />; })()}
                        </div>
                        <div>
                          <p className="font-bold text-text-primary">{currentDevice.name}</p>
                          <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <span>{currentDevice.os}</span>
                            <span>•</span>
                            <span>{currentDevice.isp}</span>
                          </div>
                        </div>
                      </div>

                      {currentDevice.isLinkedToCurrentUser ? (
                        <div className="bg-green-500/10 text-green-500 text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-2">
                          <Check size={14} /> This device is linked and active
                        </div>
                      ) : currentDevice.isLinkedToOtherUser ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium px-3 py-2 rounded-lg flex items-start gap-2">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          <p>This device is registered to another user account. It cannot be linked to multiple accounts simultaneously.</p>
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleLinkDevice}
                          disabled={isAdding || addSuccess}
                          className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            addSuccess
                              ? 'bg-green-500 text-white shadow-green-500/20'
                              : isAdding
                                ? 'bg-accent-primary/40 text-primary-foreground/60 cursor-not-allowed'
                                : 'bg-accent-primary text-primary-foreground shadow-accent-primary/20'
                          }`}
                        >
                          {isAdding ? (
                            <><span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span> Linking...</>
                          ) : addSuccess ? (
                            <><Check size={16} /> Device Linked!</>
                          ) : (
                            <><Plus size={16} /> Link This Device</>
                          )}
                        </motion.button>
                      )}
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-4 border border-glass-border flex justify-center text-text-secondary text-sm">
                      <span className="animate-pulse">Detecting current device...</span>
                    </div>
                  )}
                </div>

                {/* Linked Devices List */}
                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-3">Your Linked Devices</h4>
                  {devices?.length === 0 ? (
                    <div className="text-center py-6 px-4 bg-bg-secondary rounded-xl">
                      <p className="text-sm text-text-secondary">No devices linked yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {devices?.map(device => {
                        const DeviceIcon = getDeviceIcon(device.device_type);
                        const isCurrent = device.fingerprint === currentDevice?.fingerprint;
                        
                        return (
                          <div key={device.id} className="flex justify-between items-center glass p-3 rounded-xl border border-glass-border">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-bg-secondary text-text-secondary flex items-center justify-center">
                                <DeviceIcon size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm">{device.device_name}</p>
                                  {isCurrent && <span className="text-[9px] font-bold bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded uppercase">Current</span>}
                                </div>
                                <p className="text-xs text-text-secondary capitalize">{getDynamicStatus(device.updated_at, device.status, device.created_at)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setDeviceToRemove(device.id)}
                              className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Remove Confirmation Modal ────────────────────────────────── */}
      <AnimatePresence>
        {deviceToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !isRemoving && setDeviceToRemove(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass max-w-sm w-full rounded-2xl border border-glass-border p-6 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Remove Device?</h3>
              <p className="text-text-secondary text-sm text-center mb-6">
                Are you sure you want to unlink this device? It will stop earning NRT and tracking data for your account. You can link it again later.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeviceToRemove(null)}
                  disabled={isRemoving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-bg-secondary text-text-primary hover:bg-bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRemoveDevice}
                  disabled={isRemoving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors flex items-center justify-center"
                >
                  {isRemoving ? <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span> : 'Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Devices() {
  usePageTitle('My Devices');
  const { role } = useAuthStore();
  
  if (role === 'sp') {
    return <SpDevicesView />;
  }

  if (role === 'isp') {
    return <IspDevicesView />;
  }

  return <UserDevicesView />;
}
