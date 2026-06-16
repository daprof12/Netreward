import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, Search, CreditCard, Clock, Store, Calendar, Info
} from 'lucide-react-native';

import { useThemeColors } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSubscriptions } from '@/hooks/useSubscriptions';

export default function ManageSubscriptionsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  
  const { role } = useAuthStore();
  const { subscriptions, loading, toggleAutoRenew } = useSubscriptions();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sp' | 'isp'>('all');

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const matchesSearch = sub.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sub.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || sub.merchant_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [subscriptions, searchQuery, filterType]);

  const activeCount = filteredSubscriptions.filter(s => s.status === 'active').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <Text style={styles.headerSubtitle}>{activeCount} active subscriptions</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Info size={20} color={colors.accentPrimary} />
          <Text style={styles.infoText}>
            Manage your automated payments for services and networks paid via Scan2Pay or DeepLink checkouts.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by merchant or category..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterTabs}>
          {['all', 'sp', 'isp'].map((type) => (
            <Pressable
              key={type}
              onPress={() => setFilterType(type as any)}
              style={[
                styles.filterTab,
                filterType === type && styles.filterTabActive
              ]}
            >
              <Text style={[
                styles.filterTabText,
                filterType === type && styles.filterTabTextActive
              ]}>
                {type === 'all' ? 'All' : type === 'sp' ? 'Services' : 'Networks'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Subscription List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentPrimary} />
            <Text style={styles.loadingText}>Loading subscriptions...</Text>
          </View>
        ) : filteredSubscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <CreditCard size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            </View>
            <Text style={styles.emptyTitle}>No subscriptions found</Text>
            <Text style={styles.emptyText}>You don't have any active automated payments matching your filters.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredSubscriptions.map(sub => (
              <View key={sub.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.merchantInfo}>
                    {sub.merchant_logo ? (
                      <Image source={{ uri: sub.merchant_logo }} style={styles.merchantLogo} />
                    ) : (
                      <View style={styles.merchantLogoPlaceholder}>
                        <Store size={20} color={colors.accentPrimary} />
                      </View>
                    )}
                    <View style={styles.merchantText}>
                      <Text style={styles.merchantName}>{sub.merchant_name}</Text>
                      <View style={styles.badgeRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{sub.category}</Text>
                        </View>
                        <View style={styles.typeBadge}>
                          <Clock size={10} color={colors.textSecondary} style={{ marginRight: 2 }} />
                          <Text style={styles.typeBadgeText}>{sub.merchant_type.toUpperCase()}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.amountInfo}>
                    <Text style={styles.amountValue}>{sub.amount_nrt} NRT</Text>
                    <Text style={styles.amountCycle}>/ cycle</Text>
                  </View>
                </View>

                <View style={styles.cardMiddle}>
                  <View>
                    <View style={styles.dateLabelRow}>
                      <Calendar size={14} color={colors.textSecondary} />
                      <Text style={styles.dateLabel}>Next Renewal</Text>
                    </View>
                    <Text style={styles.dateValue}>
                      {new Date(sub.next_renewal_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.toggleContainer}>
                    <Text style={styles.toggleLabel}>Auto-Renew</Text>
                    <Switch
                      value={sub.auto_renew}
                      onValueChange={(val) => toggleAutoRenew(sub.id, val)}
                      trackColor={{ false: colors.bgPrimary, true: colors.accentPrimary }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.historyBtn}
                  onPress={() => router.push({ pathname: '/transactions', params: { merchant: sub.merchant_id } } as any)}
                >
                  <Text style={styles.historyBtnText}>View History</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  backBtn: { padding: 8, marginRight: 8, borderRadius: 12, backgroundColor: colors.bgSecondary },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  scrollContent: { padding: 16, paddingBottom: 40 },
  infoBanner: { flexDirection: 'row', backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)', marginBottom: 16, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, color: colors.textSecondary, marginLeft: 12, lineHeight: 18 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: 12, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: colors.textPrimary },
  filterTabs: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  filterTabActive: { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
  filterTabText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: colors.textSecondary },
  filterTabTextActive: { color: '#fff' },
  loadingContainer: { py: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder },
  emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  listContainer: { gap: 16 },
  card: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  merchantInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 16 },
  merchantLogo: { width: 48, height: 48, borderRadius: 12 },
  merchantLogoPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
  merchantText: { marginLeft: 12, flex: 1 },
  merchantName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  categoryBadge: { backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  categoryBadgeText: { fontSize: 9, fontWeight: '900', color: colors.accentPrimary, textTransform: 'uppercase' },
  typeBadge: { flexDirection: 'row', alignItems: 'center' },
  typeBadgeText: { fontSize: 10, color: colors.textSecondary },
  amountInfo: { alignItems: 'flex-end' },
  amountValue: { fontSize: 16, fontWeight: '900', color: colors.accentPrimary },
  amountCycle: { fontSize: 10, color: colors.textSecondary },
  cardMiddle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.glassBorder, marginBottom: 16 },
  dateLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dateLabel: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 6 },
  dateValue: { fontSize: 12, color: colors.textSecondary, marginLeft: 20 },
  toggleContainer: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginRight: 8 },
  historyBtn: { backgroundColor: colors.bgPrimary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  historyBtnText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
});
