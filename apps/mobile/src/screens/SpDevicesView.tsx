import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Search, Smartphone, Laptop, Tablet, MapPin, Wifi, CheckCircle2, AlertCircle, X } from 'lucide-react-native';
import { useSpDevices } from '@/hooks/useAdminDevices';
import { useSpStore } from '@/stores/useSpStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeColors } from '@/theme';
import NrtAmount from '@/components/ui/NrtAmount';
import MarqueeText from '@/components/ui/MarqueeText';

function SignalBars({ strength, colors }: { strength: number, colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 }}>
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={{
            width: 3,
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

export default function SpDevicesView() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { user } = useAuthStore();

  const { sessions, isLoading } = useSpDevices();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'service' | 'campaign'>('all');
  const [filterValue, setFilterValue] = useState<string>('');

  const { services, campaigns, initialize } = useSpStore();

  useEffect(() => {
    if (user?.id) {
      initialize(user.id);
    }
  }, [user?.id, initialize]);
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
        device.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.users?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
        
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
      cashback: totalNrt * 0.10 // 10% of user earnings for SP
    };
  }, [filteredDevices]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Device Monitoring</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email, device, or location..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeaderRow}>
            <Text style={styles.filterLabel}>FILTER BY:</Text>
            <View style={styles.filterTypeGroup}>
              {(['all', 'service', 'campaign'] as const).map(type => (
                <Pressable
                  key={type}
                  onPress={() => {
                    setFilterType(type);
                    setFilterValue('');
                  }}
                  style={[styles.filterTypeBtn, filterType === type && styles.filterTypeBtnActive]}
                >
                  <Text style={[styles.filterTypeText, filterType === type && styles.filterTypeTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {filterType !== 'all' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterValuesScroll}>
              {(filterType === 'service' ? availableServices : availableCampaigns).map(val => (
                <Pressable
                  key={val}
                  onPress={() => setFilterValue(val === filterValue ? '' : val)}
                  style={[styles.filterValueBtn, filterValue === val && styles.filterValueBtnActive]}
                >
                  <Text style={[styles.filterValueText, filterValue === val && styles.filterValueTextActive]}>{val}</Text>
                  {filterValue === val && <X size={12} color="#fff" style={{ marginLeft: 4 }} />}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Analytics Summary */}
        {(searchQuery || (filterType !== 'all' && filterValue)) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.analyticsScroll} contentContainerStyle={{ gap: 12 }}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>MATCHED DEVICES</Text>
              <Text style={styles.analyticsValue}>{analyticsSummary.devices}</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>DATA CONSUMED (GB)</Text>
              <Text style={styles.analyticsValue}>{analyticsSummary.dataGB}</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsLabel}>NRT DISTRIBUTED</Text>
              <NrtAmount value={analyticsSummary.nrt} hideUnit style={[styles.analyticsValue, { color: colors.accentPrimary }]} />
            </View>
            <View style={[styles.analyticsCard, styles.analyticsCardSpecial]}>
              <Text style={styles.analyticsLabel}>SP CASHBACK (10%)</Text>
              <NrtAmount value={analyticsSummary.cashback} hideUnit style={[styles.analyticsValue, { color: '#3B82F6' }]} />
            </View>
          </ScrollView>
        )}

        {/* Device List */}
        <View style={styles.deviceList}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginTop: 40 }} />
          ) : filteredDevices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No devices found matching your criteria.</Text>
              <Pressable onPress={() => { setSearchQuery(''); setFilterType('all'); setFilterValue(''); }}>
                <Text style={styles.clearFiltersText}>Clear all filters</Text>
              </Pressable>
            </View>
          ) : (
            filteredDevices.map(session => {
              const device = session.device;
              if (!device) return null;
              
              const dataUsedGB = ((session.bytes_up + session.bytes_down) / 1e9).toFixed(6);
              const isClaimed = session.nrt_awarded > 0;
              const campaignObj = Array.isArray(session.campaign) ? session.campaign[0] : session.campaign;
              const serviceObj = campaignObj ? (Array.isArray(campaignObj.service) ? campaignObj.service[0] : campaignObj.service) : null;
              
              const dynamicStatus = getDynamicStatus(device.updated_at, device.status, device.created_at);
              let lastActiveText = 'Offline';
              if (dynamicStatus === 'active') lastActiveText = 'Active Now';
              else if (dynamicStatus === 'idle') lastActiveText = 'Idle';
              else if (device.updated_at) {
                const diffM = Math.floor((Date.now() - new Date(device.updated_at).getTime()) / 60000);
                if (diffM < 60) lastActiveText = `Last active ${diffM}m ago`;
                else if (diffM < 1440) lastActiveText = `Last active ${Math.floor(diffM/60)}h ago`;
                else lastActiveText = `Last active ${Math.floor(diffM/1440)}d ago`;
              }

              return (
                <View key={session.id} style={[
                  styles.sessionCard, 
                  dynamicStatus === 'active' && styles.sessionCardActive,
                  dynamicStatus === 'idle' && { borderColor: 'rgba(245, 158, 11, 0.3)' }
                ]}>
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[
                        styles.deviceIconWrapper, 
                        dynamicStatus === 'active' ? styles.iconActive : dynamicStatus === 'idle' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } : styles.iconInactive
                      ]}>
                        {device.device_type === 'laptop' ? <Laptop size={20} color={dynamicStatus === 'active' ? colors.accentPrimary : dynamicStatus === 'idle' ? '#f59e0b' : colors.textSecondary} /> : 
                         device.device_type === 'tablet' ? <Tablet size={20} color={dynamicStatus === 'active' ? colors.accentPrimary : dynamicStatus === 'idle' ? '#f59e0b' : colors.textSecondary} /> : 
                         <Smartphone size={20} color={dynamicStatus === 'active' ? colors.accentPrimary : dynamicStatus === 'idle' ? '#f59e0b' : colors.textSecondary} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <MarqueeText style={styles.userName}>{(device.users as any)?.display_name || (device.users as any)?.email || 'Unknown User'}</MarqueeText>
                        <View style={styles.deviceMetaRow}>
                          <Text style={styles.deviceMetaText}>{device.device_name}</Text>
                          <Text style={styles.deviceMetaDot}>•</Text>
                          <View style={styles.statusRow}>
                            <View style={[
                              styles.statusDot, 
                              dynamicStatus === 'active' ? { backgroundColor: '#10b981' } : dynamicStatus === 'idle' ? { backgroundColor: '#f59e0b' } : { backgroundColor: colors.textSecondary }
                            ]} />
                            <Text style={[
                              styles.statusText, 
                              dynamicStatus === 'active' && { color: '#10b981' },
                              dynamicStatus === 'idle' && { color: '#f59e0b' }
                            ]}>{lastActiveText}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.claimBadge, isClaimed ? styles.claimBadgeClaimed : styles.claimBadgeUnclaimed]}>
                      {isClaimed ? <CheckCircle2 size={10} color="#10b981" /> : <AlertCircle size={10} color="#f59e0b" />}
                      <Text style={[styles.claimBadgeText, isClaimed ? { color: '#10b981' } : { color: '#f59e0b' }]}>
                        {isClaimed ? 'CLAIMED' : 'UNCLAIMED'}
                      </Text>
                    </View>
                  </View>

                  {/* Middle Info */}
                  <View style={styles.middleSection}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.middleLabel}>Service</Text>
                      <Text style={styles.middleValue}>{serviceObj?.name || 'Unknown'}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.middleLabel}>Campaign</Text>
                      <Text style={styles.middleValue} numberOfLines={1}>{campaignObj?.title || 'Unknown'}</Text>
                    </View>
                  </View>

                  {/* Footer Stats */}
                  <View style={styles.footerSection}>
                    <View style={styles.footerStats}>
                      <View style={{ marginRight: 24 }}>
                        <Text style={styles.statLabel}>DATA USED</Text>
                        <Text style={styles.statValue}>{dataUsedGB} GB</Text>
                      </View>
                      <View>
                        <Text style={styles.statLabel}>NRT EARNED</Text>
                        <NrtAmount value={session.nrt_awarded} hideUnit style={[styles.statValue, { color: colors.accentPrimary }]} />
                      </View>
                    </View>

                    <View style={styles.footerMeta}>
                      <View style={[styles.footerMetaItem, { flex: 1 }]}>
                        <MapPin size={10} color={colors.textSecondary} style={{ marginRight: 4, flexShrink: 0 }} />
                        <Text style={[styles.footerMetaText, { flexShrink: 1 }]} numberOfLines={1}>{device.country || 'Unknown'}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, width: '100%' }}>
                      <Wifi size={12} color={colors.textSecondary} style={{ marginRight: 6, flexShrink: 0 }} />
                      <View style={{ flex: 1, overflow: 'hidden' }}>
                        <MarqueeText style={[styles.footerMetaText, { fontSize: 11 }]}>{device.isp_name || 'Unknown ISP'}</MarqueeText>
                      </View>
                      <View style={{ marginLeft: 8, flexShrink: 0 }}>
                         <SignalBars strength={dynamicStatus === 'active' ? 4 : dynamicStatus === 'idle' ? 2 : 1} colors={colors} />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 16, height: 48, marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },

  filterSection: { marginBottom: 20 },
  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  filterLabel: { fontSize: 11, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1 },
  filterTypeGroup: { flexDirection: 'row', backgroundColor: colors.bgSecondary, borderRadius: 8, padding: 4 },
  filterTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  filterTypeBtnActive: { backgroundColor: colors.accentPrimary },
  filterTypeText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
  filterTypeTextActive: { color: '#fff' },
  
  filterValuesScroll: { marginBottom: 8 },
  filterValueBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, marginRight: 8 },
  filterValueBtnActive: { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
  filterValueText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
  filterValueTextActive: { color: '#fff' },

  analyticsScroll: { marginBottom: 20 },
  analyticsCard: { backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, minWidth: 140 },
  analyticsCardSpecial: { overflow: 'hidden' },
  analyticsLabel: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, marginBottom: 4, letterSpacing: 0.5 },
  analyticsValue: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },

  deviceList: { flex: 1 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  clearFiltersText: { fontSize: 14, fontWeight: 'bold', color: colors.accentPrimary },

  sessionCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder },
  sessionCardActive: { borderColor: 'rgba(16, 185, 129, 0.3)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 },
  deviceIconWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  iconInactive: { backgroundColor: colors.bgPrimary },
  userName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  deviceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deviceMetaText: { fontSize: 11, color: colors.textSecondary },
  deviceMetaDot: { fontSize: 11, color: colors.glassBorder },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: colors.textSecondary },
  
  claimBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  claimBadgeClaimed: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  claimBadgeUnclaimed: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  claimBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  middleSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgPrimary, borderRadius: 8, padding: 12, marginBottom: 16 },
  middleLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: 'bold', marginBottom: 2 },
  middleValue: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary },

  footerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 4 },
  footerStats: { flexDirection: 'row' },
  statLabel: { fontSize: 9, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  
  footerMeta: { alignItems: 'flex-end', gap: 6, flexShrink: 1 },
  footerMetaItem: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  footerMetaText: { fontSize: 11, color: colors.textSecondary },
  ispBadge: { backgroundColor: colors.bgPrimary, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 },
});
