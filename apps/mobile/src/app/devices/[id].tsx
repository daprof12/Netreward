import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Wifi, Signal, Filter, X, Tv, Music, Globe, Gamepad2, MessageCircle, Video, ArrowDownToLine, ArrowUpFromLine, Activity } from 'lucide-react-native';
import WebViewChart from '@/components/WebViewChart';
import { useThemeColors } from '@/theme';
import { useUserDeviceStats, useDeviceAppUsage, useDeviceById, TimeFilter } from '@/hooks/useDeviceAnalytics';
import NrtAmount from '@/components/ui/NrtAmount';

const { width: screenWidth } = Dimensions.get('window');

function SignalBars({ strength, colors }: { strength: number, colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 }}>
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={{
            width: 2.5,
            borderRadius: 1.5,
            backgroundColor: i <= strength ? colors.accentPrimary : colors.bgSecondary,
            height: `${25 + i * 20}%`
          }}
        />
      ))}
    </View>
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

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24H');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterISP, setFilterISP] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const { data: stats } = useUserDeviceStats(timeFilter);
  const currentData = stats?.chartData || [];

  const { data: appUsage = [] } = useDeviceAppUsage(id || '', timeFilter);
  const { data: deviceInfo, isLoading: isDeviceLoading } = useDeviceById(id || '');
  
  const deviceName = deviceInfo?.device_name || 'Device';
  const deviceStatus = deviceInfo?.status || 'offline';
  const deviceIsp = deviceInfo?.isp_name || 'Unknown ISP';
  const dynamicStatus = getDynamicStatus(deviceInfo?.updated_at, deviceInfo?.status, deviceInfo?.created_at);

  const getCategoryForApp = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('stream') || n.includes('netflix') || n.includes('spotify') || n.includes('youtube')) return 'Streaming';
    if (n.includes('game') || n.includes('play')) return 'Gaming';
    if (n.includes('social') || n.includes('chat') || n.includes('message')) return 'Social';
    if (n.includes('ai') || n.includes('gpt') || n.includes('cloud')) return 'AI Service';
    if (n.includes('browse') || n.includes('web') || n.includes('chrome') || n.includes('safari')) return 'Browsing';
    return 'Other';
  };

  const categories = ['All', ...Array.from(new Set(appUsage.map(a => getCategoryForApp(a.app_name || ''))))];
  const isps = ['All', ...Array.from(new Set([deviceInfo?.isp_name || 'Unknown ISP']))];
  const statuses = ['All', ...Array.from(new Set(appUsage.map(a => a.status)))];

  const filteredApps = appUsage.filter(app => {
    if (filterStatus !== 'All' && app.status !== filterStatus) return false;
    if (filterCategory !== 'All' && getCategoryForApp(app.app_name || '') !== filterCategory) return false;
    return true;
  });

  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const handleClaim = (appId: string) => {
    setClaimedIds(prev => new Set(prev).add(appId));
  };

  const totalNrt = filteredApps.reduce((sum, a) => sum + Number(a.nrt_earned || 0), 0);
  const totalData = filteredApps.reduce((sum, a) => sum + Number(a.total_data_gb || 0), 0);

  const getAppIcon = (name: string) => {
    if (name.includes('Net') || name.includes('Stream')) return { icon: Tv, color: '#E50914' };
    if (name.includes('Game')) return { icon: Gamepad2, color: '#9D4DFF' };
    if (name.includes('Social')) return { icon: MessageCircle, color: '#25D366' };
    return { icon: Globe, color: '#3B82F6' };
  };

  const hasChartData = currentData.length > 0 && !currentData.every(d => d.data === 0 && d.nrt === 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          {isDeviceLoading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={styles.headerTitle}>{deviceName}</Text>
          )}
          <View style={styles.headerSubtitleRow}>
            {(() => {
              const dynamicStatus = getDynamicStatus(deviceInfo?.updated_at, deviceInfo?.status, deviceInfo?.created_at);
              let statusText = 'Offline';
              if (dynamicStatus === 'active') statusText = 'Active Now';
              else if (dynamicStatus === 'idle') statusText = 'Idle';
              else if (deviceInfo?.updated_at || deviceInfo?.created_at) {
                const timeStr = deviceInfo.updated_at || deviceInfo.created_at;
                if (timeStr) {
                  const diffM = Math.floor((Date.now() - new Date(timeStr).getTime()) / 60000);
                  if (diffM < 60) statusText = `Last active ${diffM}m ago`;
                  else if (diffM < 1440) statusText = `Last active ${Math.floor(diffM/60)}h ago`;
                  else statusText = `Last active ${Math.floor(diffM/1440)}d ago`;
                }
              }
              const wifiColor = dynamicStatus === 'active' ? '#10B981' : dynamicStatus === 'idle' ? '#f59e0b' : colors.textSecondary;
              return (
                <>
                  <Wifi size={12} color={wifiColor} />
                  <Text style={styles.headerSubtitleText}>
                    {statusText} • {deviceIsp}
                  </Text>
                </>
              );
            })()}
          </View>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Data</Text>
            <Text style={styles.summaryValuePrimary}>{totalData.toFixed(6)} GB</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>NRT Earned</Text>
            <NrtAmount value={totalNrt} style={styles.summaryValueAccent} />
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartCard}>
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

          <View style={styles.chartWrapper}>
            {hasChartData ? (
              <WebViewChart
                data={currentData}
                xKey="time"
                series={[
                  { key: 'data', color: '#10b981', name: 'Data (GB)' },
                  { key: 'nrt', color: '#a78bfa', name: 'NRT Earned' }
                ]}
                height={160}
                type="area"
              />
            ) : (
              <View style={styles.emptyChart}>
                <Activity size={24} color={colors.textTertiary} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyChartTitle}>No Device Data</Text>
                <Text style={styles.emptyChartText}>Keep your device connected to start tracking data usage and NRT earnings.</Text>
              </View>
            )}
          </View>

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

        {/* App Usage Section */}
        <View style={styles.appUsageHeader}>
          <Text style={styles.sectionTitle}>App Usage</Text>
          <Pressable onPress={() => setShowFilters(true)} style={styles.filterBtn}>
            <Filter size={14} color={colors.textSecondary} />
            <Text style={styles.filterBtnText}>Filters</Text>
            {(filterCategory !== 'All' || filterISP !== 'All' || filterStatus !== 'All') && (
              <View style={styles.filterActiveDot} />
            )}
          </Pressable>
        </View>

        <View style={styles.appUsageList}>
          {filteredApps.map((app, index) => {
            const isClaimed = claimedIds.has(app.campaign_id);
            const { icon: AppIcon, color: iconColor } = getAppIcon(app.app_name);
            const appStatus = (dynamicStatus === 'offline') 
              ? 'offline' 
              : (dynamicStatus === 'idle' ? 'idle' : app.status);

            return (
              <View key={app.campaign_id + index} style={styles.appCard}>
                <View style={styles.appCardHeader}>
                  <View style={styles.appCardHeaderLeft}>
                    <View style={[styles.appIconWrapper, { backgroundColor: `${iconColor}15` }]}>
                      <AppIcon size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.appName} numberOfLines={1} ellipsizeMode="tail">{app.app_name}</Text>
                        <View style={[styles.categoryBadge, app.service_category === 'Network' ? { backgroundColor: 'rgba(168,85,247,0.1)' } : { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                          <Text style={[styles.categoryBadgeText, app.service_category === 'Network' ? { color: '#A855F7' } : { color: '#3B82F6' }]}>{app.service_category}</Text>
                        </View>
                      </View>
                      <Text style={styles.appDuration}>{Math.floor(app.duration_seconds / 60)}m</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, appStatus === 'active' ? styles.statusBadgeActive : appStatus === 'idle' ? styles.statusBadgeIdle : styles.statusBadgeInactive]}>
                    {appStatus === 'active' && <View style={styles.statusDotActive} />}
                    {appStatus === 'idle' && <View style={styles.statusDotIdle} />}
                    <Text style={[styles.statusBadgeText, appStatus === 'active' ? { color: '#10B981' } : appStatus === 'idle' ? { color: '#f59e0b' } : { color: colors.textSecondary }]}>
                      {appStatus.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.appCardMiddle}>
                  <View style={styles.ispDataRow}>
                    <Signal size={12} color={colors.textSecondary} />
                    <Text style={styles.ispDataText} numberOfLines={1} ellipsizeMode="tail">{deviceIsp}</Text>
                    <SignalBars strength={appStatus === 'active' ? 4 : appStatus === 'idle' ? 2 : 1} colors={colors} />
                  </View>
                  <View style={styles.dataBreakdownRow}>
                    <ArrowDownToLine size={10} color="#10B981" />
                    <Text style={styles.dataBreakdownText}>{app.total_data_gb ? (app.total_data_gb * 0.8).toFixed(6) : '0.00'} GB</Text>
                    <ArrowUpFromLine size={10} color="#A78BFA" style={{ marginLeft: 8 }} />
                    <Text style={styles.dataBreakdownText}>{app.total_data_gb ? (app.total_data_gb * 0.2).toFixed(6) : '0.00'} GB</Text>
                  </View>
                </View>

                <View style={styles.appCardFooter}>
                  <View style={styles.footerTotals}>
                    <View style={{ marginRight: 24 }}>
                      <Text style={styles.footerLabel}>TOTAL</Text>
                      <Text style={styles.footerTotalValue}>{Number(app.total_data_gb).toFixed(6)} GB</Text>
                    </View>
                    <View>
                      <Text style={styles.footerLabel}>EARNED</Text>
                      <NrtAmount value={app.nrt_earned} style={styles.footerEarnedValue} />
                    </View>
                  </View>
                  <Pressable 
                    onPress={() => handleClaim(app.campaign_id)}
                    disabled={isClaimed}
                    style={[styles.claimBtn, isClaimed && styles.claimBtnClaimed]}
                  >
                    <Text style={[styles.claimBtnText, isClaimed && styles.claimBtnTextClaimed]}>{isClaimed ? 'Claimed' : 'Claim'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          {filteredApps.length === 0 && (
            <View style={styles.emptyApps}>
              <Text style={styles.emptyAppsText}>No apps match the current filters.</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <Pressable onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.filterSectionTitle}>Service Category</Text>
              <View style={styles.filterChipsRow}>
                {categories.map(cat => (
                  <Pressable 
                    key={cat} 
                    onPress={() => setFilterCategory(cat)}
                    style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.filterSectionTitle}>ISP</Text>
              <View style={styles.filterChipsRow}>
                {isps.map(isp => (
                  <Pressable 
                    key={isp} 
                    onPress={() => setFilterISP(isp)}
                    style={[styles.filterChip, filterISP === isp && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, filterISP === isp && styles.filterChipTextActive]}>{isp}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterChipsRow}>
                {statuses.map(st => (
                  <Pressable 
                    key={st} 
                    onPress={() => setFilterStatus(st)}
                    style={[styles.filterChip, filterStatus === st && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, filterStatus === st && styles.filterChipTextActive]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Pressable 
                  onPress={() => { setFilterCategory('All'); setFilterISP('All'); setFilterStatus('All'); }}
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearBtnText}>Clear All</Text>
                </Pressable>
                <Pressable onPress={() => setShowFilters(false)} style={styles.applyBtn}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  headerSubtitleText: { fontSize: 12, color: colors.textSecondary },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  summaryValuePrimary: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
  summaryValueAccent: { fontSize: 16, fontWeight: '900', color: colors.accentPrimary },

  chartCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
  timeFilterContainer: { flexDirection: 'row', backgroundColor: colors.bgPrimary, borderRadius: 8, padding: 4, marginBottom: 16 },
  timeFilterBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  timeFilterBtnActive: { backgroundColor: colors.accentPrimary },
  timeFilterText: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary },
  timeFilterTextActive: { color: '#fff' },
  chartWrapper: { height: 160, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  emptyChart: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  emptyChartTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  emptyChartText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textSecondary },

  appUsageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.glassBorder, gap: 6 },
  filterBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
  filterActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentPrimary, position: 'absolute', top: 4, right: 4 },

  appUsageList: { flex: 1 },
  appCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  appCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  appCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  appIconWrapper: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, flexShrink: 1 },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  categoryBadgeText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  appDuration: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  statusBadgeIdle: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  statusBadgeInactive: { backgroundColor: colors.bgPrimary },
  statusDotActive: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  statusDotIdle: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  appCardMiddle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  ispDataRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  ispDataText: { fontSize: 11, color: colors.textSecondary, flexShrink: 1 },
  dataBreakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dataBreakdownText: { fontSize: 11, color: colors.textSecondary },

  appCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.glassBorder },
  footerTotals: { flexDirection: 'row' },
  footerLabel: { fontSize: 9, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 4 },
  footerTotalValue: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  footerEarnedValue: { fontSize: 14, fontWeight: 'bold', color: colors.accentPrimary },
  claimBtn: { backgroundColor: colors.accentPrimary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  claimBtnClaimed: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.glassBorder },
  claimBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  claimBtnTextClaimed: { color: colors.textSecondary },

  emptyApps: { paddingVertical: 40, alignItems: 'center' },
  emptyAppsText: { fontSize: 14, color: colors.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  
  filterSectionTitle: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 12, marginTop: 4 },
  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterChip: { backgroundColor: colors.bgSecondary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.glassBorder },
  filterChipActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.accentPrimary },
  filterChipText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  filterChipTextActive: { color: colors.accentPrimary },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center' },
  clearBtnText: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  applyBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.accentPrimary, alignItems: 'center' },
  applyBtnText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
});
