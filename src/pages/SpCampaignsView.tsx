import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Settings, Play, Pause, Square, Trash2, X, Edit, 
  ChevronRight, Users, Smartphone, Laptop, Loader2, TrendingUp, Search, Filter 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSpStore, type SpCampaign } from '@/stores/useSpStore';
import { useToastStore } from '@/stores/useToastStore';
import { useCampaignAnalytics } from '@/hooks/useCampaignAnalytics';
import CampaignAnalyticsModal from '@/components/campaigns/CampaignAnalyticsModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import NrtAmount from '@/components/ui/NrtAmount';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function SpCampaignsView() {
  usePageTitle('SP Campaigns');
  const { services, campaigns, updateCampaign, stopCampaign, deleteCampaign, deleteService } = useSpStore();
  const { showToast } = useToastStore();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const defaultTab = (queryParams.get('tab') as 'services' | 'campaigns') || 'services';

  const [activeTab, setActiveTab] = useState<'services' | 'campaigns'>(defaultTab);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  // Management state
  const [managingCampaign, setManagingCampaign] = useState<SpCampaign | null>(null);
  const [viewingCampaignDetails, setViewingCampaignDetails] = useState<SpCampaign | null>(null);

  // Search & filter state for campaigns tab
  const [campaignSearch, setCampaignSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  // Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmVariant: 'danger' | 'warning';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const filteredCampaigns = campaigns.filter(campaign => {
    const service = services.find(s => s.id === campaign.serviceId);
    const q = campaignSearch.toLowerCase();
    const matchesSearch = !q || 
      campaign.name.toLowerCase().includes(q) ||
      (service?.name || '').toLowerCase().includes(q) ||
      (campaign.country || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDeleteService = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Service',
      message: 'Are you sure you want to delete this service? All associated campaigns will be stopped.',
      confirmText: 'Delete Service',
      confirmVariant: 'danger',
      onConfirm: () => {
        deleteService(id);
        showToast('Service deleted.', 'success');
      }
    });
  };

  const handleCampaignAction = async (id: string, action: 'pause' | 'resume' | 'stop') => {
    if (action === 'stop') {
      setConfirmDialog({
        isOpen: true,
        title: 'Stop Campaign',
        message: 'Are you sure you want to stop this campaign? Unspent NRT will be refunded and earned rewards auto-claimed.',
        confirmText: 'Stop Campaign',
        confirmVariant: 'danger',
        onConfirm: async () => {
          setIsProcessingAction(true);
          try {
            const result = await stopCampaign(id);
            const refundMsg = result.refundedAmount > 0
              ? ` ${result.refundedAmount.toLocaleString()} NRT refunded to your wallet.`
              : '';
            showToast(`Campaign stopped.${refundMsg} Earned rewards auto-claimed.`, 'success');
            setManagingCampaign(null);
          } catch (e: any) {
            showToast(e.message || 'Error stopping campaign', 'danger');
          } finally {
            setIsProcessingAction(false);
          }
        }
      });
    } else if (action === 'pause') {
      updateCampaign(id, { status: 'paused' });
      showToast('Campaign paused.', 'success');
    } else if (action === 'resume') {
      updateCampaign(id, { status: 'active' });
      showToast('Campaign resumed.', 'success');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    const hasUnspent = campaign && campaign.budgetNrt > campaign.spentNrt && campaign.status !== 'completed';
    const msg = hasUnspent
      ? `Delete this campaign? ${(campaign.budgetNrt - campaign.spentNrt).toLocaleString()} NRT unspent budget will be refunded.`
      : 'Are you sure you want to delete this campaign?';
      
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Campaign',
      message: msg,
      confirmText: 'Delete Campaign',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await deleteCampaign(id);
          showToast('Campaign deleted. Unspent NRT refunded.', 'success');
          setManagingCampaign(null);
        } catch (e: any) {
          showToast(e.message || 'Error deleting campaign', 'danger');
        } finally {
          setIsProcessingAction(false);
        }
      }
    });
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
        {(['services', 'campaigns'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all capitalize ${
              activeTab === tab ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Services List */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {services.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm">
              No services found. Click the + icon to create one.
            </div>
          ) : (
            services.map(service => (
              <div key={service.id} className="glass p-4 rounded-xl border border-glass-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-xl font-bold shadow-inner uppercase overflow-hidden border border-glass-border">
                    {service.logoUrl || service.logo_url ? (
                      <img src={service.logoUrl || (service as any).logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      service.name[0] || '?'
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{service.name}</h3>
                    <p className="text-xs text-text-secondary">{service.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                    Verified
                  </span>
                  <Link to={`/campaigns/edit-service/${service.id}`} className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors">
                    <Edit size={16} />
                  </Link>
                  <button onClick={() => handleDeleteService(service.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
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
          {/* Search & Filter Bar */}
          {campaigns.length > 0 && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search by name, service, or country..."
                  value={campaignSearch}
                  onChange={e => setCampaignSearch(e.target.value)}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(['all', 'active', 'paused', 'completed'] as const).map(s => {
                  const count = s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                        statusFilter === s
                          ? 'bg-accent-primary text-primary-foreground shadow-sm'
                          : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {s === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {s === 'paused' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                      {s === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                      {s} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {campaigns.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm">
              No campaigns found. Click the + icon to create one.
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-10 text-text-secondary text-sm">
              <Filter size={20} className="mx-auto mb-2 opacity-50" />
              No campaigns match your search or filter.
            </div>
          ) : (
            filteredCampaigns.map(campaign => {
              const service = services.find(s => s.id === campaign.serviceId);
              const budgetPct = Math.min((campaign.spentNrt / campaign.budgetNrt) * 100, 100);
              
              return (
                <div key={campaign.id} className="glass p-4 rounded-xl border border-glass-border flex flex-col gap-3 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center text-xl font-bold shadow-inner uppercase overflow-hidden">
                        {service?.logoUrl || service?.logo_url ? (
                          <img src={service.logoUrl || (service as any).logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          service?.name[0] || '?'
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary">{campaign.name}</h3>
                        <p className="text-xs text-text-secondary flex items-center gap-1 mt-1">
                          {campaign.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                          {campaign.status === 'paused' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                          {campaign.status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-text-secondary" />}
                          <span className="capitalize">{campaign.status}</span> • {service?.name}
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
                    to="/campaigns/create-service"
                    className="glass p-4 rounded-2xl border border-glass-border flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                      <Settings size={24} />
                    </div>
                    <span className="font-semibold text-sm">Service API</span>
                  </Link>

                  <Link 
                    to="/campaigns/create-campaign"
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
            key="manage-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => !isProcessingAction && setManagingCampaign(null)}
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
                <button 
                  onClick={() => !isProcessingAction && setManagingCampaign(null)}
                  disabled={isProcessingAction}
                  className="p-1 bg-bg-primary rounded-full disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-4 space-y-2">
                {managingCampaign.status === 'paused' ? (
                  <button 
                    onClick={() => handleCampaignAction(managingCampaign.id, 'resume')}
                    disabled={isProcessingAction}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500"><Play size={16} /></div>
                    <span className="font-semibold text-sm text-text-primary">Resume Campaign</span>
                  </button>
                ) : managingCampaign.status === 'active' ? (
                  <button 
                    onClick={() => handleCampaignAction(managingCampaign.id, 'pause')}
                    disabled={isProcessingAction}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500"><Pause size={16} /></div>
                    <span className="font-semibold text-sm text-text-primary">Pause Campaign</span>
                  </button>
                ) : null}
                
                {managingCampaign.status !== 'completed' && (
                  <button 
                    onClick={() => handleCampaignAction(managingCampaign.id, 'stop')}
                    disabled={isProcessingAction}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                      {isProcessingAction ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-text-primary">Stop Campaign</p>
                      <p className="text-[10px] text-text-secondary">Triggers auto-claim for users</p>
                    </div>
                  </button>
                )}

                <Link 
                  to={isProcessingAction ? "#" : `/campaigns/edit-campaign/${managingCampaign.id}`}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors text-left ${isProcessingAction ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary"><Edit size={16} /></div>
                  <span className="font-semibold text-sm text-text-primary">Edit Campaign Details</span>
                </Link>

                <button 
                  onClick={() => handleDeleteCampaign(managingCampaign.id)}
                  disabled={isProcessingAction}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 transition-colors text-left mt-4 border border-destructive/20 disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                    {isProcessingAction ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </div>
                  <span className="font-semibold text-sm text-destructive">Delete Campaign</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <motion.div
            key="confirm-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => !isProcessingAction && setConfirmDialog(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-bg-primary rounded-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-glass-border">
                <h3 className="font-bold text-lg">{confirmDialog.title}</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-text-secondary leading-relaxed">{confirmDialog.message}</p>
              </div>
              <div className="p-4 pt-0 flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  disabled={isProcessingAction}
                  className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-semibold hover:bg-glass-border transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (confirmDialog.onConfirm) {
                      await confirmDialog.onConfirm();
                      setConfirmDialog(null);
                    }
                  }}
                  disabled={isProcessingAction}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${
                    confirmDialog.confirmVariant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  {isProcessingAction && <Loader2 size={16} className="animate-spin" />}
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
