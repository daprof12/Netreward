import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { useThemeColors } from '@/theme';
import { Smartphone, Laptop, Plus, Wifi, WifiOff, ChevronRight, X, Monitor, Tablet, Check, Activity, MapPin, Trash2, AlertTriangle } from 'lucide-react-native';
import WebViewChart from '@/components/WebViewChart';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDevices } from '@/hooks/useDevices';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useUserDeviceStats, useDeviceSummaries, TimeFilter } from '@/hooks/useDeviceAnalytics';
import { formatNrtText } from '@/lib/formatNrt';
import NrtAmount from '@/components/ui/NrtAmount';
import MarqueeText from '@/components/ui/MarqueeText';

const { width: screenWidth } = Dimensions.get('window');

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

export default function UserDevicesView() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24H');
  const { data: stats } = useUserDeviceStats(timeFilter);
  const currentData = stats?.chartData || [];
  const summary = stats?.summary || { totalData: 0, totalNrt: 0 };

  const [showAddDevice, setShowAddDevice] = useState(false);
  const { currentDevice } = useDeviceManager();
  const [deviceToRemove, setDeviceToRemove] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const { devices, addDevice, removeDevice, isAdding, isRemoving, isLoading } = useDevices();
  const { data: summaries = {} } = useDeviceSummaries(timeFilter);

  const aggregateSummary = useMemo(() => {
    let totalData = 0;
    let totalNrt = 0;
    Object.values(summaries).forEach((s: any) => {
      totalData += s.total_data_gb;
      totalNrt += s.total_nrt_earned;
    });
    return { totalData, totalNrt };
  }, [summaries]);

  const sortedDevices = useMemo(() => {
    if (!devices) return [];
    return [...devices].sort((a, b) => {
      const aIsCurrent = a.fingerprint === currentDevice?.fingerprint;
      const bIsCurrent = b.fingerprint === currentDevice?.fingerprint;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      
      const dateA = new Date(a.created_at || 0).getTime() || 0;
      const dateB = new Date(b.created_at || 0).getTime() || 0;
      return dateB - dateA;
    });
  }, [devices, currentDevice?.fingerprint]);

  const handleLinkDevice = async () => {
    if (!currentDevice || isAdding) return;
    try {
      await addDevice({
        device_name: currentDevice.name,
        device_type: currentDevice.type,
        os: currentDevice.os,
        isp_name: currentDevice.isp,
        country: currentDevice.country,
        fingerprint: currentDevice.fingerprint,
      });

      setAddSuccess(true);
      setTimeout(() => {
        setAddSuccess(false);
        setShowAddDevice(false);
      }, 1800);
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

  const hasChartData = currentData.length > 0 && !currentData.every(d => d.data === 0 && d.nrt === 0);
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Devices</Text>
        <Pressable onPress={() => setShowAddDevice(true)} style={styles.addBtn}>
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Stats & Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.statLabel}>Data Consumed</Text>
              <Text style={styles.statValueGB}>{Number(aggregateSummary.totalData).toFixed(6)} GB</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statLabel}>NRT Earned</Text>
              <NrtAmount value={aggregateSummary.totalNrt} style={styles.statValueNRT} />
            </View>
          </View>

          {/* Time Filter */}
          <View style={styles.timeFilterContainer}>
            {(['24H', '7D', '1M', 'ALL'] as TimeFilter[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => setTimeFilter(f)}
                style={[styles.timeFilterBtn, timeFilter === f && styles.timeFilterBtnActive]}
              >
                <Text style={[styles.timeFilterText, timeFilter === f && styles.timeFilterTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </View>

          {/* Chart */}
          <View style={styles.chartWrapper}>
            {hasChartData ? (
              <WebViewChart
                data={currentData}
                xKey="time"
                series={[
                  { key: 'data', color: '#10b981', name: 'Data (GB)' },
                  { key: 'nrt', color: '#a78bfa', name: 'NRT Earned' }
                ]}
                height={180}
                type="area"
              />
            ) : (
              <View style={styles.emptyChart}>
                <Activity size={24} color={colors.textTertiary} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyChartTitle}>No Device Data</Text>
                <Text style={styles.emptyChartText}>Connect devices to start tracking data usage and NRT earnings.</Text>
              </View>
            )}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>Data (GB)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#a78bfa' }]} />
              <Text style={styles.legendText}>NRT Earned</Text>
            </View>
          </View>
        </View>

        {/* Connected Devices */}
        <Text style={styles.sectionTitle}>Connected</Text>
        <View style={styles.devicesList}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginTop: 20 }} />
          ) : sortedDevices.length === 0 ? (
            <View style={styles.emptyDevices}>
              <Smartphone size={32} color={colors.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyChartTitle}>No Devices Found</Text>
              <Text style={styles.emptyChartText}>Add a device to start tracking data usage and earning NRT rewards.</Text>
            </View>
          ) : sortedDevices.map(device => {
            const dynamicStatus = getDynamicStatus(device.updated_at, device.status, device.created_at);
            const DeviceIcon = getDeviceIcon(device.device_type);
            const devSummary = summaries[device.id];

            return (
              <Pressable key={device.id} onPress={() => router.push(`/devices/${device.id}` as any)} style={[
                styles.deviceCard, 
                dynamicStatus === 'active' && styles.deviceCardActive,
                dynamicStatus === 'idle' && { borderColor: 'rgba(245, 158, 11, 0.5)' }
              ]}>
                {dynamicStatus === 'active' && <View style={[styles.activeIndicator, { backgroundColor: colors.accentPrimary }]} />}
                {dynamicStatus === 'idle' && <View style={[styles.activeIndicator, { backgroundColor: '#f59e0b' }]} />}
                
                <Pressable onPress={() => setDeviceToRemove(device.id)} style={styles.removeBtnAbs}>
                  <Trash2 size={16} color={colors.textSecondary} />
                </Pressable>

                <View style={styles.deviceCardInner}>
                  <View style={[
                    styles.deviceIconWrapper, 
                    dynamicStatus === 'active' ? styles.iconActive : dynamicStatus === 'idle' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } : styles.iconInactive
                  ]}>
                    <DeviceIcon size={24} color={dynamicStatus === 'active' ? colors.accentPrimary : dynamicStatus === 'idle' ? '#f59e0b' : colors.textSecondary} />
                  </View>
                  <View style={styles.deviceInfo}>
                    <View style={styles.deviceNameRow}>
                      <Text style={styles.deviceName} numberOfLines={1} ellipsizeMode="tail">{device.device_name}</Text>
                      {device.fingerprint === currentDevice?.fingerprint && (
                        <View style={styles.thisDeviceBadge}>
                          <Text style={styles.thisDeviceText}>THIS DEVICE</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.deviceMetaRow}>
                      <View style={[
                        styles.metaBadge, 
                        dynamicStatus === 'active' ? styles.metaBadgeActive : dynamicStatus === 'idle' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } : styles.metaBadgeInactive
                      ]}>
                        {dynamicStatus === 'offline' ? <WifiOff size={10} color={colors.textSecondary} /> : <Wifi size={10} color={dynamicStatus === 'active' ? colors.accentPrimary : '#f59e0b'} />}
                        <Text style={[
                          styles.metaBadgeText, 
                          dynamicStatus === 'active' ? { color: colors.accentPrimary } : dynamicStatus === 'idle' ? { color: '#f59e0b' } : { color: colors.textSecondary }
                        ]}>
                          <Text style={{ textTransform: 'capitalize' }}>{dynamicStatus}</Text>
                        </Text>
                      </View>
                      <View style={[styles.metaRowItem, { maxWidth: 100 }]}>
                        <MapPin size={10} color={colors.accentPrimary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText} numberOfLines={1}>{device.country || 'Unknown'}</Text>
                      </View>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.metaText}>
                        {devSummary ? devSummary.total_data_gb.toFixed(6) : '0.00'} GB
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, width: '100%' }}>
                      <Wifi size={10} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <View style={{ flex: 1, overflow: 'hidden' }}>
                        <MarqueeText style={styles.metaText}>{device.isp_name || 'Unknown ISP'}</MarqueeText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.deviceRight}>
                    <NrtAmount value={devSummary ? devSummary.total_nrt_earned : 0} showSign style={styles.deviceNrt} />
                    <ChevronRight size={16} color={colors.textSecondary} style={{ marginTop: 8 }} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Add Device Modal */}
      <Modal visible={showAddDevice} transparent animationType="slide" onRequestClose={() => setShowAddDevice(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Devices</Text>
              <Pressable onPress={() => setShowAddDevice(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.modalSectionLabel}>Current Detected Device</Text>
              {currentDevice ? (
                <View style={styles.detectedCard}>
                  <View style={styles.detectedRow}>
                    <View style={styles.detectedIcon}>
                      {(() => { const CurIcon = getDeviceIcon(currentDevice.type); return <CurIcon size={20} color={colors.accentPrimary} />; })()}
                    </View>
                    <View>
                      <Text style={styles.detectedName}>{currentDevice.name}</Text>
                      <Text style={styles.detectedMeta}>{currentDevice.os} • {currentDevice.isp}</Text>
                    </View>
                  </View>

                  {currentDevice.isLinkedToCurrentUser ? (
                    <View style={styles.linkedBadge}>
                      <Check size={14} color="#10b981" style={{ marginRight: 6 }} />
                      <Text style={styles.linkedBadgeText}>This device is linked and active</Text>
                    </View>
                  ) : currentDevice.isLinkedToOtherUser ? (
                    <View style={styles.conflictBadge}>
                      <AlertTriangle size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                      <Text style={styles.conflictBadgeText}>This device is registered to another user account.</Text>
                    </View>
                  ) : (
                    <Pressable 
                      style={[styles.linkBtn, (isAdding || addSuccess) && { opacity: 0.7 }]}
                      onPress={handleLinkDevice}
                      disabled={isAdding || addSuccess}
                    >
                      {isAdding ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : addSuccess ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Check size={16} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.linkBtnText}>Device Linked!</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Plus size={16} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.linkBtnText}>Link This Device</Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={[styles.detectedCard, { alignItems: 'center', justifyContent: 'center' }]}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>Detecting device...</Text>
                </View>
              )}

              <Text style={[styles.modalSectionLabel, { marginTop: 24 }]}>Your Linked Devices</Text>
              {devices?.length === 0 ? (
                <View style={styles.emptyLinked}>
                  <Text style={styles.emptyLinkedText}>No devices linked yet.</Text>
                </View>
              ) : (
                devices?.map(dev => {
                  const DevIcon = getDeviceIcon(dev.device_type);
                  const isCurrent = dev.fingerprint === currentDevice?.fingerprint;
                  return (
                    <View key={dev.id} style={styles.linkedItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={styles.linkedItemIcon}>
                          <DevIcon size={16} color={colors.textSecondary} />
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.linkedItemName}>{dev.device_name}</Text>
                            {isCurrent && <View style={styles.thisDeviceBadge}><Text style={styles.thisDeviceText}>CURRENT</Text></View>}
                          </View>
                          <Text style={[styles.linkedItemStatus, { textTransform: 'capitalize' }]}>{getDynamicStatus(dev.updated_at, dev.status, dev.created_at)}</Text>
                        </View>
                      </View>
                      <Pressable onPress={() => setDeviceToRemove(dev.id)} style={{ padding: 8 }}>
                        <Trash2 size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  )
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Remove Modal */}
      <Modal visible={!!deviceToRemove} transparent animationType="fade">
        <View style={styles.removeOverlay}>
          <View style={styles.removeModal}>
            <View style={styles.removeIconWrapper}>
              <AlertTriangle size={24} color="#ef4444" />
            </View>
            <Text style={styles.removeTitle}>Remove Device?</Text>
            <Text style={styles.removeText}>Are you sure you want to unlink this device? It will stop earning NRT and tracking data for your account.</Text>
            <View style={styles.removeActions}>
              <Pressable style={styles.removeCancelBtn} onPress={() => !isRemoving && setDeviceToRemove(null)}>
                <Text style={styles.removeCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.removeConfirmBtn} onPress={handleRemoveDevice} disabled={isRemoving}>
                {isRemoving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.removeConfirmText}>Remove</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  
  chartCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: 'bold', marginBottom: 4 },
  statValueGB: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  statValueNRT: { fontSize: 22, fontWeight: '900', color: colors.accentPrimary },
  
  timeFilterContainer: { flexDirection: 'row', backgroundColor: colors.bgPrimary, borderRadius: 8, padding: 4, marginBottom: 16 },
  timeFilterBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  timeFilterBtnActive: { backgroundColor: colors.accentPrimary },
  timeFilterText: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary },
  timeFilterTextActive: { color: '#fff' },

  chartWrapper: { height: 180, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  emptyChart: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyChartTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  emptyChartText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textSecondary },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  devicesList: { flex: 1 },
  emptyDevices: { alignItems: 'center', paddingVertical: 40, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  
  deviceCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  deviceCardActive: { borderColor: 'rgba(16, 185, 129, 0.5)' },
  activeIndicator: { position: 'absolute', top: 0, right: 0, width: 4, height: '100%', backgroundColor: colors.accentPrimary },
  removeBtnAbs: { position: 'absolute', top: 4, right: 6, padding: 4, zIndex: 10 },
  deviceCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceIconWrapper: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  iconInactive: { backgroundColor: colors.bgPrimary },
  
  deviceInfo: { flex: 1, marginRight: 10, overflow: 'hidden' },
  deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  deviceName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, flexShrink: 1 },
  thisDeviceBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0 },
  thisDeviceText: { fontSize: 9, fontWeight: 'bold', color: colors.accentPrimary },
  deviceMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 6, flexShrink: 1, width: '100%' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  metaBadgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  metaBadgeInactive: { backgroundColor: colors.bgPrimary },
  metaBadgeText: { fontSize: 10, fontWeight: 'bold' },
  metaRowItem: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, maxWidth: 70 },
  metaText: { fontSize: 10, color: colors.textSecondary },
  metaDot: { fontSize: 10, color: colors.textSecondary },
  
  deviceRight: { alignItems: 'flex-end', justifyContent: 'center', marginTop: 0, paddingRight: 0, minWidth: 80, flexShrink: 0 },
  deviceNrt: { fontSize: 13, fontWeight: 'bold', color: colors.accentPrimary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  
  modalSectionLabel: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 12 },
  detectedCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
  detectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  detectedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center' },
  detectedName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  detectedMeta: { fontSize: 12, color: colors.textSecondary },
  linkedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 10, borderRadius: 8 },
  linkedBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#10b981' },
  conflictBadge: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 12, borderRadius: 8 },
  conflictBadgeText: { fontSize: 12, color: '#f59e0b', flex: 1 },
  linkBtn: { backgroundColor: colors.accentPrimary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  linkBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  emptyLinked: { padding: 20, backgroundColor: colors.bgSecondary, borderRadius: 16, alignItems: 'center' },
  emptyLinkedText: { fontSize: 13, color: colors.textSecondary },
  linkedItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgSecondary, padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  linkedItemIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  linkedItemName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  linkedItemStatus: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  removeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  removeModal: { width: '100%', maxWidth: 320, backgroundColor: colors.bgSecondary, borderRadius: 24, padding: 24, alignItems: 'center' },
  removeIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  removeTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  removeText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  removeActions: { flexDirection: 'row', gap: 12, width: '100%' },
  removeCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center' },
  removeCancelText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  removeConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  removeConfirmText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
});
