import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Play, Pause, Square, Trash2, X, ChevronRight, Edit, 
  Users, Smartphone, Laptop, Network, Loader2, TrendingUp 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useIspStore, type IspCampaign } from '@/stores/useIspStore';
import { useToastStore } from '@/stores/useToastStore';
import { useCampaignAnalytics } from '@/hooks/useCampaignAnalytics';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function IspCampaignsView() {
  const { networks, campaigns, updateCampaign, deleteCampaign, deleteNetwork } = useIspStore();
  const { showToast } = useToastStore();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const defaultTab = (queryParams.get('tab') as 'networks' | 'campaigns') || 'networks';

  const [activeTab, setActiveTab] = useState<'networks' | 'campaigns'>(defaultTab);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  // Management state
  const [managingCampaign, setManagingCampaign] = useState<IspCampaign | null>(null);
  const [viewingCampaignDetails, setViewingCampaignDetails] = useState<IspCampaign | null>(null);

  const handleDeleteNetwork = (id: string) => {
    if (confirm('Are you sure you want to delete this network? All associated campaigns will be stopped.')) {
      deleteNetwork(id);
      showToast('Network deleted.', 'success');
    }
  };

  const handleCampaignAction = (id: string, action: 'pause' | 'resume' | 'stop') => {
    if (action === 'stop') {
      if (confirm('Are you sure you want to stop this campaign? All active users will automatically claim their earned rewards.')) {
        updateCampaign(id, { status: 'completed' });
        showToast('Campaign stopped. All active users automatically claimed rewards.', 'success');
        setManagingCampaign(null);
      }
    } else if (action === 'pause') {
      updateCampaign(id, { status: 'paused' });
      showToast('Campaign paused.', 'success');
    } else if (action === 'resume') {
      updateCampaign(id, { status: 'active' });
      showToast('Campaign resumed.', 'success');
    }
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaign(id);
      showToast('Campaign deleted.', 'success');
      setManagingCampaign(null);
    }
  };

  return (
    <motion.div
      className="space-y-5 pb-24 p-4 pt-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Campaign Manager</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateSheet(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-primary text-primary-foreground shadow-lg shadow-accent-primary/20 active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-secondary p-1 rounded-lg">
        {(['networks', 'campaigns'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all capitalize ${activeTab === tab ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Networks List */}
      {activeTab === 'networks' && (
        <div className="space-y-4">
          {networks.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm">
              No networks found. Click the + icon to create one.
            </div>
          ) : (
            networks.map(network => (
              <div key={network.id} className="glass p-4 rounded-xl border border-glass-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-xl font-bold shadow-inner uppercase overflow-hidden border border-glass-border">
                    {network.logoUrl || (network as any).logo_url ? (
                      <img src={network.logoUrl || (network as any).logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      network.name[0] || '?'
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{network.name}</h3>
                    <p className="text-xs text-text-secondary">{network.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Verified
                  </span>
                  <Link to={`/campaigns/edit-network/${network.id}`} className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors">
                    <Edit size={16} />
                  </Link>
                  <button onClick={() => handleDeleteNetwork(network.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Campaigns List */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm">
              No campaigns found. Click the + icon to create one.
            </div>
          ) : (
            campaigns.map(campaign => {
              const network = networks.find(n => n.id === campaign.networkId);
              const budgetPct = Math.min((campaign.spentNrt / campaign.budgetNrt) * 100, 100);

              return (
                <div key={campaign.id} className="glass p-4 rounded-xl border border-glass-border flex flex-col gap-3 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-xl font-bold shadow-inner uppercase overflow-hidden">
                        {network?.logoUrl || network?.logo_url ? (
                          <img src={network.logoUrl || (network as any).logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          network?.name[0] || '?'
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">{campaign.name}</h3>
                        <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
                          {campaign.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                          {campaign.status === 'paused' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                          {campaign.status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-text-secondary" />}
                          <span className="capitalize">{campaign.status}</span> • {network?.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setManagingCampaign(campaign)}
                      className="text-accent-primary text-xs font-bold px-2 py-1 rounded-md bg-accent-primary/10 hover:bg-accent-primary/20 transition-colors"
                    >
                      Manage
                    </button>
                  </div>

                  <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-accent-primary rounded-full" style={{ width: `${budgetPct}%` }} />
                  </div>

                  <div className="flex justify-between text-[10px] text-text-secondary font-medium">
                    <span>{campaign.spentNrt} NRT Spent</span>
                    <span>{campaign.budgetNrt} NRT Budget</span>
                  </div>

                  <button
                    onClick={() => setViewingCampaignDetails(campaign)}
                    className="flex items-center justify-center gap-1 mt-2 text-xs font-semibold text-text-primary hover:text-accent-primary transition-colors py-2"
                  >
                    View Analytics <ChevronRight size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Analytics Modal Component */}
      <AnimatePresence>
        {viewingCampaignDetails && (
          <CampaignAnalyticsModal 
            campaign={viewingCampaignDetails} 
            onClose={() => setViewingCampaignDetails(null)} 
          />
        )}
      </AnimatePresence>

      {/* Create Selection Sheet */}
      <AnimatePresence>
        {showCreateSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-bg-primary rounded-t-3xl border-t border-glass-border overflow-hidden pb-safe"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="w-12 h-1 bg-glass-border rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-6 text-center">What would you like to create?</h3>

                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to="/campaigns/create-network"
                    className="glass p-4 rounded-2xl border border-glass-border flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                      <Network size={24} />
                    </div>
                    <span className="font-semibold text-sm">Network API</span>
                  </Link>

                  <Link
                    to="/campaigns/create-isp-campaign"
                    className="glass p-4 rounded-2xl border border-glass-border flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                      <Users size={24} />
                    </div>
                    <span className="font-semibold text-sm">Campaign</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Managing Campaign Modal */}
      <AnimatePresence>
        {managingCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setManagingCampaign(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-primary rounded-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-glass-border flex justify-between items-center bg-bg-secondary">
                <h3 className="font-bold">Manage {managingCampaign.name}</h3>
                <button onClick={() => setManagingCampaign(null)} className="p-1 bg-bg-primary rounded-full">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-2">
                {managingCampaign.status === 'paused' ? (
                  <button
                    onClick={() => handleCampaignAction(managingCampaign.id, 'resume')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500"><Play size={16} /></div>
                    <span className="font-semibold text-sm text-text-primary">Resume Campaign</span>
                  </button>
                ) : managingCampaign.status === 'active' ? (
                  <button
                    onClick={() => handleCampaignAction(managingCampaign.id, 'pause')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500"><Pause size={16} /></div>
                    <span className="font-semibold text-sm text-text-primary">Pause Campaign</span>
                  </button>
                ) : null}

                {managingCampaign.status !== 'completed' && (
                  <button
                    onClick={() => handleCampaignAction(managingCampaign.id, 'stop')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><Square size={16} /></div>
                    <div>
                      <p className="font-semibold text-sm text-text-primary">Stop Campaign</p>
                      <p className="text-[10px] text-text-secondary">Triggers auto-claim for users</p>
                    </div>
                  </button>
                )}

                <Link 
                  to={`/campaigns/edit-isp-campaign/${managingCampaign.id}`}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary"><Edit size={16} /></div>
                  <span className="font-semibold text-sm text-text-primary">Edit Campaign Details</span>
                </Link>

                <button
                  onClick={() => handleDeleteCampaign(managingCampaign.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 transition-colors text-left mt-4 border border-destructive/20"
                >
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 size={16} /></div>
                  <span className="font-semibold text-sm text-destructive">Delete Campaign</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Sub-component for Campaign Analytics */
function CampaignAnalyticsModal({ campaign, onClose }: { campaign: IspCampaign; onClose: () => void }) {
  const { data: analytics, isLoading } = useCampaignAnalytics(campaign.id);
  const [search, setSearch] = useState('');

  const filtered = (analytics?.participants || []).filter(p => 
    p.email.toLowerCase().includes(search.toLowerCase()) || 
    p.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex flex-col items-center bg-bg-primary pt-safe overflow-y-auto"
    >
      <div className="w-full max-w-md flex flex-col flex-1 min-h-screen">
        <div className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-lg border-b border-glass-border px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{campaign.name}</h1>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary text-text-primary hover:bg-glass-bg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Growth Chart */}
          <div className="glass p-4 rounded-2xl border border-glass-border">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-primary" />
              Performance (Last 7 Days)
            </h4>
            <div className="h-48 w-full min-h-[200px]">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-accent-primary" size={24} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.chartData}>
                    <defs>
                      <linearGradient id="colorNrt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-primary)', 
                        borderColor: 'var(--glass-border)',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="nrt" 
                      stroke="var(--accent-primary)" 
                      fillOpacity={1} 
                      fill="url(#colorNrt)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-[10px] text-text-secondary text-center mt-2 italic">
              Daily NRT rewards distributed to participants
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-2xl border border-glass-border">
              <p className="text-xs text-text-secondary font-medium">Started</p>
              <h3 className="text-sm font-bold text-text-primary mt-1">{new Date(campaign.startDate).toLocaleDateString()}</h3>
            </div>
            <div className="glass p-4 rounded-2xl border border-glass-border">
              <p className="text-xs text-text-secondary font-medium">Users Reached</p>
              <h3 className="text-sm font-bold text-text-primary mt-1">{isLoading ? '...' : analytics?.totalUsers}</h3>
            </div>
          </div>

          <h3 className="font-semibold text-lg">Active Earning Devices</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Search by email or location..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-bg-secondary border border-glass-border rounded-lg px-3 py-2 text-sm" 
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-accent-primary" size={32} />
              <p className="text-sm text-text-secondary">Loading participants...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-text-secondary text-sm">
              No active participants found.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((u, i) => (
                <div key={i} className="glass p-4 rounded-xl border border-glass-border flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                      {u.device_type === 'laptop' || u.device_type === 'desktop' ? <Laptop size={20} /> : <Smartphone size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary text-sm truncate max-w-[150px]">
                        {u.email}
                      </p>
                      <p className="text-[10px] text-text-secondary uppercase font-bold">{u.device_name} • {u.country}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-accent-primary text-sm">+{u.nrt_earned.toFixed(2)} NRT</p>
                    <p className="text-[10px] text-green-500 uppercase font-bold tracking-wider">{u.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
