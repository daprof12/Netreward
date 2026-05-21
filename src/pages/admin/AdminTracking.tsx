import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, CheckCircle, Key, Activity, Smartphone, Server, Settings, Gamepad2, Zap, RefreshCw } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PlatformLogo } from '@/components/ui/PlatformLogos';
import type { GamingPlatform } from '@/hooks/useGamingAccounts';
type TabType = 'sessions' | 'anomalies' | 'sdk_keys';

export default function AdminTracking() {
  usePageTitle('Admin — Tracking');
  const { showToast } = useToastStore();
  const [trackingSessions, setTrackingSessions] = useState<any[]>([]);
  const [trackingAnomalies, setTrackingAnomalies] = useState<any[]>([]);
  const [spApiKeys, setSpApiKeys] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        const [s, a, k] = await Promise.all([
          supabase.from('tracking_sessions').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('tracking_anomalies').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('sp_api_keys').select('*').order('created_at', { ascending: false }),
        ]);
        setTrackingSessions((s.data || []).map((x: any) => {
          return {
            ...x,
            sessionId: x.session_id || x.id,
            userEmail: x.user_email || 'Unknown',
            campaignName: x.campaign_name || 'Unknown Campaign',
            spEmail: x.sp_email || '',
            source: x.source || 'sdk',
            deviceIp: x.device_ip || '',
            userIp: x.user_ip || '',
            dataRxBytes: Number(x.data_rx_bytes || 0),
            dataTxBytes: Number(x.data_tx_bytes || 0),
            durationSeconds: Number(x.duration_seconds || 0),
            nrtAwarded: Number(x.nrt_awarded || 0),
            validationScore: Number(x.validation_score || 0),
            recordedAt: x.recorded_at || x.created_at,
            rejectReason: x.reject_reason || '',
            status: x.status || 'pending'
          };
        }));
        setTrackingAnomalies((a.data || []).map((x: any) => ({
          ...x, sessionId: x.session_id || '', userEmail: x.user_email || 'Unknown',
          flagType: x.flag_type || 'UNKNOWN', details: x.details || '', createdAt: x.created_at,
          adminId: x.admin_id || '',
        })));
        setSpApiKeys((k.data || []).map((x: any) => ({
          ...x, spEmail: x.sp_email || '', apiKey: x.api_key || '', createdAt: x.created_at,
          lastUsedAt: x.last_used_at || null,
        })));
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Stats
  const pendingAnomalies = trackingAnomalies.filter(a => a.status === 'open').length;
  const activeKeys = spApiKeys.filter(k => k.status === 'active').length;
  const verifiedSessions = trackingSessions.filter(s => s.status === 'verified').length;
  const pendingSessions = trackingSessions.filter(s => s.status === 'pending').length;
  const gamingSessions = trackingSessions.filter(s => (s.source || '').startsWith('gaming_')).length;

  const handleActionAnomaly = async (id: string, newStatus: 'reviewed' | 'cleared' | 'actioned' | 'open') => {
    try {
      await supabase.from('tracking_anomalies').update({ status: newStatus, admin_id: 'admin@netreward.online' }).eq('id', id);
      setTrackingAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: newStatus, adminId: 'admin@netreward.online' } : a));
      showToast(`Anomaly marked as ${newStatus}`, 'success');
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this SDK Key? The SP will immediately lose access to the tracking API.')) return;
    try {
      await supabase.from('sp_api_keys').update({ status: 'revoked' }).eq('id', id);
      setSpApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
      showToast('SDK Key revoked', 'warning');
    } catch (e: any) { showToast(e.message || 'Revoke failed', 'error'); }
  };

  const filteredSessions = trackingSessions.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (s.sessionId || '').toLowerCase().includes(q) ||
      (s.userEmail || '').toLowerCase().includes(q) ||
      (s.campaignName || '').toLowerCase().includes(q) ||
      (s.source || '').toLowerCase().includes(q) ||
      (s.deviceIp || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredAnomalies = trackingAnomalies.filter(a => {
    const matchSearch = (a.sessionId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.userEmail || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || a.status === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const getSourceIcon = (source: string) => {
    if (source?.startsWith('gaming_')) {
      const platform = source.replace('gaming_', '') as GamingPlatform;
      return <div className="text-text-primary"><PlatformLogo platform={platform} size={14} /></div>;
    }
    switch (source) {
      case 'sdk': return <Settings size={14} className="text-blue-500" />;
      case 'isp_sdk': return <Server size={14} className="text-cyan-500" />;
      case 'android_service': return <Smartphone size={14} className="text-green-500" />;
      case 'extension': return <Zap size={14} className="text-yellow-500" />;
      default: return <Activity size={14} className="text-text-secondary" />;
    }
  };

  const getGamingPlatformLabel = (source: string) => {
    if (!source?.startsWith('gaming_')) return null;
    const platform = source.replace('gaming_', '');
    const labels: Record<string, string> = {
      playstation: 'PlayStation', xbox: 'Xbox', steam: 'Steam',
      oculus_vr: 'Oculus VR', nintendo_switch: 'Nintendo', android: 'Android', ios: 'iOS'
    };
    return labels[platform] || platform;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500/10 text-green-500';
      case 'rewarded': return 'bg-green-500/10 text-green-500';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border border-amber-500/30';
      case 'duplicate': return 'bg-gray-500/10 text-gray-400';
      case 'skipped': return 'bg-gray-500/10 text-gray-400';
      case 'error': return 'bg-red-500/10 text-red-500';
      case 'rejected': return 'bg-red-500/10 text-red-500';
      case 'held': return 'bg-purple-500/10 text-purple-500';
      case 'open': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'reviewed': return 'bg-blue-500/10 text-blue-500';
      case 'cleared': return 'bg-green-500/10 text-green-500';
      case 'actioned': return 'bg-purple-500/10 text-purple-500';
      case 'active': return 'bg-green-500/10 text-green-500';
      case 'revoked': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getFlagColor = (flag: string) => {
    switch (flag) {
      case 'HIGH_VOLUME': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'IMPOSSIBLE_SPEED': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'MISMATCH': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'OFFLINE': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'DUPLICATE': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Data Tracking & Reporting</h1>
          <p className="text-sm text-text-secondary">Monitor data usage sessions, SDK integrations, and anomaly alerts.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-blue-500" />
            <span className="text-xs text-text-secondary font-semibold">Total Sessions</span>
          </div>
          <p className="text-2xl font-black">{trackingSessions.length}</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-xs text-text-secondary font-semibold">Verified</span>
          </div>
          <p className="text-2xl font-black text-green-500">{verifiedSessions}</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-xs text-text-secondary font-semibold">Pending</span>
          </div>
          <p className="text-2xl font-black text-amber-500">{pendingSessions}</p>
          {pendingSessions > 0 && <p className="text-[10px] text-amber-400 mt-0.5">Gaming account unlinked</p>}
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex items-center gap-2 mb-1">
            <Gamepad2 size={14} className="text-purple-400" />
            <span className="text-xs text-text-secondary font-semibold">Gaming</span>
          </div>
          <p className="text-2xl font-black text-purple-400">{gamingSessions}</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-xs text-text-secondary font-semibold">Anomalies</span>
          </div>
          <p className="text-2xl font-black text-red-500">{pendingAnomalies}</p>
        </div>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl flex flex-col h-[600px]">
        {/* Tabs & Filters */}
        <div className="p-4 border-b border-glass-border space-y-4">
          <div className="flex gap-2">
            <button onClick={() => { setActiveTab('sessions'); setStatusFilter('All'); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'sessions' ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-bg-secondary'}`}>Sessions</button>
            <button onClick={() => { setActiveTab('anomalies'); setStatusFilter('All'); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'anomalies' ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-bg-secondary'} flex items-center gap-2`}>
              Anomalies
              {pendingAnomalies > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingAnomalies}</span>}
            </button>
            <button onClick={() => { setActiveTab('sdk_keys'); setStatusFilter('All'); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'sdk_keys' ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-bg-secondary'}`}>SDK Keys</button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                type="text"
                placeholder="Search by ID or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent-primary"
              />
            </div>

            {activeTab !== 'sdk_keys' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-bg-secondary border border-glass-border rounded-xl px-4 py-2 text-sm focus:outline-none"
              >
                <option value="All">All Status</option>
                {activeTab === 'sessions' ? (
                  <>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending (Gaming unlinked)</option>
                    <option value="duplicate">Duplicate</option>
                    <option value="skipped">Skipped</option>
                    <option value="error">Error</option>
                  </>
                ) : (
                  <>
                    <option value="open">Open</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="cleared">Cleared</option>
                    <option value="actioned">Actioned</option>
                  </>
                )}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-bg-card z-10 text-xs text-text-secondary uppercase tracking-wider">
              <tr>
                {activeTab === 'sessions' && (
                  <>
                    <th className="p-4 font-bold">Session ID & User</th>
                    <th className="p-4 font-bold">Campaign & SP</th>
                    <th className="p-4 font-bold">Data Source & IPs</th>
                    <th className="p-4 font-bold text-right">Data (MB)</th>
                    <th className="p-4 font-bold text-right">NRT / Score</th>
                    <th className="p-4 font-bold text-right">Status</th>
                  </>
                )}
                {activeTab === 'anomalies' && (
                  <>
                    <th className="p-4 font-bold">Flag Type</th>
                    <th className="p-4 font-bold">User & Session</th>
                    <th className="p-4 font-bold">Details</th>
                    <th className="p-4 font-bold text-center">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </>
                )}
                {activeTab === 'sdk_keys' && (
                  <>
                    <th className="p-4 font-bold">SP Email</th>
                    <th className="p-4 font-bold">API Key</th>
                    <th className="p-4 font-bold">Created At</th>
                    <th className="p-4 font-bold text-center">Last Used</th>
                    <th className="p-4 font-bold text-right">Status</th>
                    <th className="p-4 font-bold text-right">Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {activeTab === 'sessions' && filteredSessions.map(session => (
                <tr key={session.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-sm text-text-primary">{session.sessionId}</p>
                    <p className="text-xs text-text-secondary">{session.userEmail}</p>
                    <p className="text-[10px] text-text-secondary mt-1">{new Date(session.recordedAt).toLocaleString()}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-sm">{session.campaignName}</p>
                    <p className="text-xs text-text-secondary">{session.spEmail}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 bg-bg-secondary w-fit px-2 py-1 rounded-md mb-1.5 border border-glass-border">
                      {getSourceIcon(session.source)}
                      <span className="text-xs font-medium capitalize">
                        {getGamingPlatformLabel(session.source) || session.source.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {/* Gaming username stored in device_ip field as [gaming:username] */}
                    {session.deviceIp?.startsWith('[gaming:') ? (
                      <p className="text-[10px] text-purple-400 font-mono">{session.deviceIp}</p>
                    ) : (
                      <p className="text-[10px] text-text-secondary">Dev: {session.deviceIp}</p>
                    )}
                    <p className="text-[10px] text-text-secondary">Usr: {session.userIp}</p>
                  </td>
                  <td className="p-4 text-right">
                    <p className="font-bold text-sm">{((session.dataRxBytes + session.dataTxBytes) / (1024 * 1024)).toFixed(2)} MB</p>
                    <p className="text-[10px] text-text-secondary">in {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s</p>
                  </td>
                  <td className="p-4 text-right">
                    <p className="font-bold text-accent-primary">{session.nrtAwarded} NRT</p>
                    <div className="flex justify-end mt-1">
                      <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${session.validationScore >= 1.0 ? 'bg-green-500/10 text-green-500' : session.validationScore >= 0.5 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                        {(session.validationScore * 100).toFixed(0)}% score
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider inline-block mb-1 ${getStatusColor(session.status)}`}>
                      {session.status === 'pending' ? '⚠ Pending' : session.status}
                    </span>
                    {session.status === 'pending' && (
                      <p className="text-[10px] text-amber-400 truncate max-w-[140px] ml-auto">Gaming account not linked</p>
                    )}
                    {session.rejectReason && session.status !== 'pending' && (
                      <p className="text-[10px] text-red-500 truncate max-w-[140px] ml-auto">{session.rejectReason}</p>
                    )}
                  </td>
                </tr>
              ))}

              {activeTab === 'anomalies' && filteredAnomalies.map(anomaly => (
                <tr key={anomaly.id} className="hover:bg-bg-secondary/50 transition-colors group">
                  <td className="p-4">
                    <span className={`px-2 py-1 border rounded-md text-[10px] font-black uppercase tracking-wider ${getFlagColor(anomaly.flagType)}`}>
                      {anomaly.flagType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-sm text-text-primary">{anomaly.userEmail}</p>
                    <p className="text-xs text-text-secondary font-mono bg-bg-secondary px-1 rounded inline-block mt-1">{anomaly.sessionId}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-text-primary max-w-sm">{anomaly.details}</p>
                    <p className="text-[10px] text-text-secondary mt-1">{new Date(anomaly.createdAt).toLocaleString()}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider inline-block ${getStatusColor(anomaly.status)}`}>
                      {anomaly.status}
                    </span>
                    {anomaly.adminId && <p className="text-[10px] text-text-secondary mt-1">by {anomaly.adminId.split('@')[0]}</p>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {anomaly.status === 'open' && (
                        <>
                          <button onClick={() => handleActionAnomaly(anomaly.id, 'cleared')} className="p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20" title="Clear (False Positive)">
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => handleActionAnomaly(anomaly.id, 'actioned')} className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20" title="Take Action">
                            <AlertTriangle size={16} />
                          </button>
                        </>
                      )}
                      {anomaly.status !== 'open' && (
                        <button onClick={() => handleActionAnomaly(anomaly.id, 'open')} className="p-1.5 bg-bg-secondary text-text-secondary rounded-lg hover:text-text-primary" title="Reopen">
                          <Activity size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {activeTab === 'sdk_keys' && spApiKeys.map(key => (
                <tr key={key.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-sm text-text-primary">{key.spEmail}</p>
                  </td>
                  <td className="p-4">
                    <code className="text-xs bg-bg-secondary px-2 py-1 rounded-md font-mono text-accent-primary border border-glass-border">{key.apiKey}</code>
                  </td>
                  <td className="p-4 text-xs text-text-secondary">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    {key.lastUsedAt ? (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-green-500">
                        <Activity size={12} />
                        {new Date(key.lastUsedAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-xs text-text-secondary">Never</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider inline-block ${getStatusColor(key.status)}`}>
                      {key.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {key.status === 'active' && (
                      <button onClick={() => handleRevokeKey(key.id)} className="text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {((activeTab === 'sessions' && filteredSessions.length === 0) ||
            (activeTab === 'anomalies' && filteredAnomalies.length === 0) ||
            (activeTab === 'sdk_keys' && spApiKeys.length === 0)) && (
              <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                <Search className="w-12 h-12 text-glass-border mb-4" />
                <h3 className="font-bold text-lg mb-1">No data found</h3>
                <p className="text-sm text-text-secondary">No records match your current filters.</p>
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
}
