import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/theme';
import { Plus, Play, Pause, Square, Trash2, X, Edit, Users, Network, Loader2, ChevronRight, Search, Filter } from 'lucide-react-native';
import { useIspStore, type IspCampaign } from '@/stores/useIspStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import NrtAmount from '@/components/ui/NrtAmount';
import CampaignAnalyticsModal from '@/components/CampaignAnalyticsModal';

export default function IspCampaignsView() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

  const { networks, campaigns, updateCampaign, stopCampaign, deleteCampaign, deleteNetwork, initialize } = useIspStore();

  useEffect(() => {
    if (user?.id) {
      initialize(user.id);
    }
  }, [user?.id, initialize]);

  const [activeTab, setActiveTab] = useState<'networks' | 'campaigns'>('networks');
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const [managingCampaign, setManagingCampaign] = useState<IspCampaign | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [viewingCampaignDetails, setViewingCampaignDetails] = useState<IspCampaign | null>(null);

  const [campaignSearch, setCampaignSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmVariant: 'danger' | 'warning';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const filteredCampaigns = campaigns.filter(campaign => {
    const network = networks.find(n => n.id === campaign.networkId);
    const q = campaignSearch.toLowerCase();
    const matchesSearch = !q || 
      campaign.name.toLowerCase().includes(q) ||
      (network?.name || '').toLowerCase().includes(q) ||
      (campaign.country || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDeleteNetwork = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Network',
      message: 'Are you sure you want to delete this network? All associated campaigns will be stopped.',
      confirmText: 'Delete Network',
      confirmVariant: 'danger',
      onConfirm: () => {
        deleteNetwork(id);
        showToast('Network deleted.', 'success');
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
            const refundMsg = result.refundedAmount > 0 ? ` ${result.refundedAmount.toLocaleString()} NRT refunded.` : '';
            showToast(`Campaign stopped.${refundMsg}`, 'success');
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
          showToast('Campaign deleted.', 'success');
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campaign Manager</Text>
        <Pressable onPress={() => setShowCreateSheet(true)} style={styles.addBtn}>
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['networks', 'campaigns'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive, { textTransform: 'capitalize' }]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'networks' && (
          <View style={{ gap: 12 }}>
            {networks.length === 0 ? (
              <Text style={styles.emptyText}>No networks found. Tap the + icon to create one.</Text>
            ) : (
              networks.map(network => (
                <View key={network.id} style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                    <View style={styles.cardIconWrapper}>
                      {network.logoUrl || (network as any).logo_url ? (
                        <Image source={{ uri: network.logoUrl || (network as any).logo_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                      ) : (
                        <Text style={styles.cardIconText}>{network.name[0]?.toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{network.name}</Text>
                      <Text style={styles.cardMeta}>{network.category}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 12 }}>
                    <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>VERIFIED</Text></View>
                    <Pressable onPress={() => router.push(`/campaigns/edit-network/${network.id}` as any)}><Edit size={18} color={colors.textSecondary} /></Pressable>
                    <Pressable onPress={() => handleDeleteNetwork(network.id)}><Trash2 size={18} color="#ef4444" /></Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'campaigns' && (
          <View style={{ gap: 12 }}>
            {campaigns.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <View style={styles.searchBar}>
                  <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Search by name, network, or country..."
                    placeholderTextColor={colors.textSecondary}
                    value={campaignSearch}
                    onChangeText={setCampaignSearch}
                    style={styles.searchInput}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  {(['all', 'active', 'paused', 'completed'] as const).map(s => {
                    const count = s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length;
                    const isActive = statusFilter === s;
                    return (
                      <Pressable key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, isActive && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{s} ({count})</Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {filteredCampaigns.length === 0 ? (
              <Text style={styles.emptyText}>No campaigns match your filters.</Text>
            ) : (
              filteredCampaigns.map(campaign => {
                const network = networks.find(n => n.id === campaign.networkId);
                const budgetPct = Math.min((campaign.spentNrt / (campaign.budgetNrt || 1)) * 100, 100);

                return (
                  <View key={campaign.id} style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={styles.cardIconWrapper}>
                          {campaign.logo_url ? (
                            <Image source={{ uri: campaign.logo_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                          ) : (
                            <Text style={styles.cardIconText}>{network?.name[0] || '?'}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.cardTitle}>{campaign.name}</Text>
                          <Text style={styles.cardMeta} numberOfLines={1}>{campaign.status} • {network?.name}</Text>
                        </View>
                      </View>
                      <Pressable onPress={() => setManagingCampaign(campaign)} style={styles.manageBtn}>
                        <Text style={styles.manageBtnText}>Manage</Text>
                      </Pressable>
                    </View>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${budgetPct}%` }]} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <NrtAmount value={campaign.spentNrt} style={{ fontSize: 10, color: colors.textSecondary }} />
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}> Spent</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <NrtAmount value={campaign.budgetNrt} style={{ fontSize: 10, color: colors.textSecondary }} />
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}> Budget</Text>
                      </View>
                    </View>

                    <Pressable onPress={() => setViewingCampaignDetails(campaign)} style={styles.analyticsBtn}>
                      <Text style={styles.analyticsBtnText}>View Analytics</Text>
                      <ChevronRight size={14} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                )
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Selection Sheet */}
      <Modal visible={showCreateSheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New</Text>
              <Pressable onPress={() => setShowCreateSheet(false)} style={{ padding: 4 }}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={{ padding: 20, flexDirection: 'row', gap: 16 }}>
              <Pressable 
                onPress={() => { setShowCreateSheet(false); router.push('/campaigns/create-network'); }} 
                style={styles.createOption}
              >
                <View style={[styles.createIconBg, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                  <Network size={28} color="#a78bfa" />
                </View>
                <Text style={styles.createOptionText}>Network API</Text>
              </Pressable>
              
              <Pressable 
                onPress={() => { setShowCreateSheet(false); router.push('/campaigns/create-isp-campaign'); }} 
                style={styles.createOption}
              >
                <View style={[styles.createIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Users size={28} color="#10b981" />
                </View>
                <Text style={styles.createOptionText}>Campaign</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Campaign Sheet */}
      <Modal visible={!!managingCampaign} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.manageModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage {managingCampaign?.name}</Text>
              <Pressable onPress={() => !isProcessingAction && setManagingCampaign(null)} style={{ padding: 4 }}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              {managingCampaign?.status === 'paused' ? (
                <Pressable onPress={() => handleCampaignAction(managingCampaign.id, 'resume')} disabled={isProcessingAction} style={styles.actionBtn}>
                  <View style={[styles.actionIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><Play size={16} color="#10b981" /></View>
                  <Text style={styles.actionText}>Resume Campaign</Text>
                </Pressable>
              ) : managingCampaign?.status === 'active' ? (
                <Pressable onPress={() => handleCampaignAction(managingCampaign.id, 'pause')} disabled={isProcessingAction} style={styles.actionBtn}>
                  <View style={[styles.actionIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}><Pause size={16} color="#f59e0b" /></View>
                  <Text style={styles.actionText}>Pause Campaign</Text>
                </Pressable>
              ) : null}

              {managingCampaign?.status !== 'completed' && (
                <Pressable onPress={() => handleCampaignAction(managingCampaign!.id, 'stop')} disabled={isProcessingAction} style={styles.actionBtn}>
                  <View style={[styles.actionIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    {isProcessingAction ? <ActivityIndicator size="small" color="#ef4444" /> : <Square size={16} color="#ef4444" />}
                  </View>
                  <View>
                    <Text style={styles.actionText}>Stop Campaign</Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>Triggers auto-claim for users</Text>
                  </View>
                </Pressable>
              )}

              <Pressable 
                onPress={() => { setManagingCampaign(null); router.push(`/campaigns/edit-isp-campaign/${managingCampaign?.id}` as any); }} 
                disabled={isProcessingAction} 
                style={styles.actionBtn}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}><Edit size={16} color="#a78bfa" /></View>
                <Text style={styles.actionText}>Edit Campaign Details</Text>
              </Pressable>

              <Pressable onPress={() => handleDeleteCampaign(managingCampaign!.id)} disabled={isProcessingAction} style={[styles.actionBtn, { marginTop: 8, borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1 }]}>
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}><Trash2 size={16} color="#ef4444" /></View>
                <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete Campaign</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Dialog */}
      <Modal visible={!!confirmDialog?.isOpen} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.manageModal, { alignItems: 'center', padding: 24 }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 }}>{confirmDialog?.title}</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>{confirmDialog?.message}</Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <Pressable onPress={() => setConfirmDialog(null)} style={[styles.confirmBtn, { backgroundColor: colors.bgPrimary }]}><Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Cancel</Text></Pressable>
              <Pressable 
                onPress={() => { if (confirmDialog?.onConfirm) { confirmDialog.onConfirm(); setConfirmDialog(null); } }}
                style={[styles.confirmBtn, { backgroundColor: confirmDialog?.confirmVariant === 'danger' ? '#ef4444' : '#f59e0b' }]}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{confirmDialog?.confirmText}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      {viewingCampaignDetails && (
        <CampaignAnalyticsModal
          campaign={viewingCampaignDetails}
          onClose={() => setViewingCampaignDetails(null)}
        />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: colors.bgSecondary, borderRadius: 8, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: colors.bgPrimary },
  tabText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary },

  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontSize: 14 },

  card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  cardIconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder, marginRight: 12 },
  cardIconText: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  
  verifiedBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { fontSize: 10, fontWeight: 'bold', color: '#10b981' },

  manageBtn: { backgroundColor: 'rgba(167, 139, 250, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, height: 28, justifyContent: 'center' },
  manageBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },

  progressTrack: { height: 6, backgroundColor: colors.bgPrimary, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: colors.accentPrimary, borderRadius: 3 },
  analyticsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.glassBorder },
  analyticsBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary, marginRight: 4 },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.bgSecondary, marginRight: 8, borderWidth: 1, borderColor: colors.glassBorder },
  filterChipActive: { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
  filterChipText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'capitalize' },
  filterChipTextActive: { color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  manageModal: { backgroundColor: colors.bgSecondary, borderRadius: 24, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: colors.glassBorder },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  
  createOption: { flex: 1, backgroundColor: colors.bgSecondary, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  createIconBg: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  createOptionText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },

  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.bgPrimary, borderRadius: 12 },
  actionIconBg: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
