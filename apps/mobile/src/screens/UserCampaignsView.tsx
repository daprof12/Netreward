import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { useThemeColors } from '@/theme';
import { Search, Filter, Play, CheckCircle2, X, Globe, MapPin, TrendingUp, Info, ChevronRight, Wifi, ArrowDownToLine, Clock, Gamepad2 } from 'lucide-react-native';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useClaimRewards } from '@/hooks/useRewardEngine';
import { useGamingAccounts, GAMING_PLATFORMS, type GamingPlatform } from '@/hooks/useGamingAccounts';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { formatNrtText } from '@/lib/formatNrt';
import Slider from '@react-native-community/slider';
import EarningsDetailModal from '@/components/EarningsDetailModal';

const SERVICE_CATEGORIES = ['All', 'Streaming', 'AI Service', 'Gaming', 'Social', 'Browsing', 'Cloud', 'Broadband', 'Telecommunication', 'Satellite', 'Fiber', 'Mobile Network', 'Other'];
const STATUSES = ['All', 'active', 'paused', 'completed'];
const LOCATIONS = ['All', 'Global', 'North America', 'Europe', 'Africa', 'Asia'];

const { width: screenWidth } = Dimensions.get('window');

const isGamingCategory = (cat?: string) => {
  if (!cat) return false;
  const n = cat.toLowerCase().trim();
  return n === 'gaming' || n === 'game' || n === 'games';
};

export default function UserCampaignsView() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { showToast } = useToastStore();
  const user = useAuthStore(s => s.user);

  const [activeTab, setActiveTab] = useState<'available' | 'joined'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRewardMin, setFilterRewardMin] = useState<number>(0);
  const [filterRewardMax, setFilterRewardMax] = useState<number>(10);
  const [filterLocation, setFilterLocation] = useState('All');

  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [earningCampaign, setEarningCampaign] = useState<any | null>(null);

  const { activeCampaigns, userEnrollments, isLoading, joinCampaign, isJoining } = useCampaigns();
  const { claimRewards, isClaiming } = useClaimRewards();
  const { gamingAccounts, linkedPlatforms, linkAccount, isLinking, isLoading: isLoadingGaming } = useGamingAccounts();

  const [showGamingPrompt, setShowGamingPrompt] = useState(false);
  const [pendingGamingCampaignId, setPendingGamingCampaignId] = useState<string | null>(null);
  const availableGamingPlatforms = (Object.keys(GAMING_PLATFORMS) as GamingPlatform[]).filter(p => !linkedPlatforms.has(p));
  const [gamingPlatformSelect, setGamingPlatformSelect] = useState<GamingPlatform>(availableGamingPlatforms[0] || 'playstation');
  const [gamingUsernameInput, setGamingUsernameInput] = useState('');

  const joinedCampaignIds = new Set(userEnrollments?.map((en: any) => en.campaign_id) || []);
  const campaignsList = (activeCampaigns || []).map(camp => ({ ...camp, joined: joinedCampaignIds.has(camp.id) }));

  const rates = (activeCampaigns || []).map(c => c.reward_rate_per_gb || 0);
  const globalMin = rates.length > 0 ? Math.min(...rates) : 0;
  const globalMax = rates.length > 0 ? Math.max(...rates) : 10;

  const hasActiveFilters = filterCategory !== 'All' || filterStatus !== 'All' || filterLocation !== 'All' || filterRewardMin > globalMin || filterRewardMax < globalMax;

  const filtered = campaignsList
    .filter(c => activeTab === 'joined' ? c.joined : !c.joined)
    .filter(c => {
      const q = (filterSearch || searchQuery).toLowerCase();
      if (q && !c.title?.toLowerCase().includes(q) && !c.target_app?.toLowerCase().includes(q)) return false;
      if (filterCategory !== 'All' && c.category?.toLowerCase().trim() !== filterCategory.toLowerCase().trim()) return false;
      if (filterStatus !== 'All' && c.status !== filterStatus) return false;
      if (c.reward_rate_per_gb < filterRewardMin || c.reward_rate_per_gb > filterRewardMax) return false;
      return true;
    });

  const handleJoin = async (id: string, category?: string) => {
    if (isGamingCategory(category) && !isLoadingGaming && gamingAccounts.length === 0) {
      setPendingGamingCampaignId(id);
      setGamingPlatformSelect(availableGamingPlatforms[0] || 'playstation');
      setGamingUsernameInput('');
      setShowGamingPrompt(true);
      return;
    }
    setJoiningId(id);
    try {
      await joinCampaign(id);
      showToast('Joined! Open the app to start earning NRT.', 'success');
    } catch (err: any) {
      if (err.message?.includes('unique_violation') || err.code === '23505') {
        showToast('You are already in this campaign!', 'success');
      } else {
        showToast(err.message || 'Failed to join campaign', 'danger');
      }
    } finally {
      setJoiningId(null);
    }
  };

  const handleLinkAndJoin = async () => {
    if (!gamingUsernameInput.trim() || !pendingGamingCampaignId) return;
    try {
      await linkAccount({ platform: gamingPlatformSelect, username: gamingUsernameInput });
      setShowGamingPrompt(false);
      setJoiningId(pendingGamingCampaignId);
      await joinCampaign(pendingGamingCampaignId);
      showToast('Account linked & campaign joined!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed', 'danger');
    } finally {
      setJoiningId(null);
      setPendingGamingCampaignId(null);
    }
  };

  const handleClaim = async () => {
    try {
      const res = await claimRewards();
      if (res?.success) {
        showToast(`Successfully claimed ${Number(res.net_amount || 0).toFixed(6)} NRT!`, 'success');
        setEarningCampaign(null);
      } else {
        showToast(res?.message || 'Failed to claim rewards', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Claim failed', 'danger');
    }
  };

  const clearFilters = () => {
    setFilterCategory('All');
    setFilterStatus('All');
    setFilterLocation('All');
    setFilterRewardMin(globalMin);
    setFilterRewardMax(globalMax);
    setFilterSearch('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campaigns</Text>
        <Pressable onPress={() => setShowFilters(true)} style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}>
          <Filter size={16} color={hasActiveFilters ? colors.accentPrimary : colors.textSecondary} />
          <Text style={[styles.filterBtnText, hasActiveFilters && { color: colors.accentPrimary }]}>Filter</Text>
          {hasActiveFilters && <View style={styles.filterBadge} />}
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search campaigns..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['available', 'joined'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'available' ? 'Available' : 'Joined'}</Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No campaigns found.</Text>
        ) : (
          filtered.map(campaign => {
            const isThisJoining = joiningId === campaign.id;
            const budgetPct = Math.min((campaign.budget_spent / (campaign.total_budget || 1)) * 100, 100);

            return (
              <View key={campaign.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <Text style={styles.cardIconText}>{campaign.title?.[0] || '?'}</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{campaign.title}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>{campaign.creator_name} • {campaign.category || 'General'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardRate}>{campaign.reward_rate_per_gb}</Text>
                    <Text style={styles.cardRateLabel}>NRT / GB</Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${budgetPct}%` }]} />
                </View>

                {campaign.joined ? (
                  <View style={{ gap: 12 }}>
                    <View style={styles.instructionBox}>
                      <Info size={14} color={colors.accentPrimary} style={{ marginTop: 2, marginRight: 6 }} />
                      <Text style={styles.instructionText}>
                        Open <Text style={{ fontWeight: 'bold', color: colors.accentPrimary }}>{campaign.target_app}</Text> and use the service to start earning NRT.
                      </Text>
                    </View>
                    <Pressable onPress={() => setEarningCampaign(campaign)} style={styles.viewEarningsBtn}>
                      <TrendingUp size={16} color={colors.accentPrimary} style={{ marginRight: 6 }} />
                      <Text style={styles.viewEarningsText}>View Your Earnings</Text>
                      <ChevronRight size={14} color={colors.accentPrimary} style={{ marginLeft: 4 }} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleJoin(campaign.id, campaign.category)}
                    disabled={isJoining || isThisJoining}
                    style={[styles.joinBtn, (isJoining || isThisJoining) && { opacity: 0.7 }]}
                  >
                    {isThisJoining ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Play size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.joinBtnText}>Join Campaign</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <Pressable onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.filterSectionTitle}>Search</Text>
              <View style={styles.searchBar}>
                <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput placeholder="Search..." placeholderTextColor={colors.textSecondary} value={filterSearch} onChangeText={setFilterSearch} style={styles.searchInput} />
              </View>

              <Text style={styles.filterSectionTitle}>Service Category</Text>
              <View style={styles.chipContainer}>
                {SERVICE_CATEGORIES.map(cat => (
                  <Pressable key={cat} onPress={() => setFilterCategory(cat)} style={[styles.chip, filterCategory === cat && styles.chipActive]}>
                    <Text style={[styles.chipText, filterCategory === cat && styles.chipTextActive]}>{cat}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.chipContainer}>
                {STATUSES.map(st => (
                  <Pressable key={st} onPress={() => setFilterStatus(st)} style={[styles.chip, filterStatus === st && styles.chipActive]}>
                    <Text style={[styles.chipText, filterStatus === st && styles.chipTextActive, { textTransform: 'capitalize' }]}>{st}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.filterSectionTitle}>Reward Max Limit (NRT/GB)</Text>
              <View style={{ paddingHorizontal: 10, marginBottom: 20 }}>
                <Slider
                  minimumValue={globalMin}
                  maximumValue={globalMax}
                  value={filterRewardMax}
                  onValueChange={setFilterRewardMax}
                  minimumTrackTintColor={colors.accentPrimary}
                  maximumTrackTintColor={colors.bgPrimary}
                  thumbTintColor={colors.accentPrimary}
                />
                <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                  Up to {filterRewardMax.toFixed(2)} NRT/GB
                </Text>
              </View>

              <Text style={styles.filterSectionTitle}>Location</Text>
              <View style={styles.chipContainer}>
                {LOCATIONS.map(loc => (
                  <Pressable key={loc} onPress={() => setFilterLocation(loc)} style={[styles.chip, filterLocation === loc && styles.chipActive]}>
                    <Text style={[styles.chipText, filterLocation === loc && styles.chipTextActive]}>{loc}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable onPress={clearFilters} style={styles.clearBtn}><Text style={styles.clearBtnText}>Clear All</Text></Pressable>
              <Pressable onPress={() => setShowFilters(false)} style={styles.applyBtn}><Text style={styles.applyBtnText}>Apply</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Earnings Modal */}
      <EarningsDetailModal
        earningCampaign={earningCampaign}
        onClose={() => setEarningCampaign(null)}
        enrollment={earningCampaign ? userEnrollments?.find((e: any) => e.campaign_id === earningCampaign.id) : null}
        durationSecs={0} // Campaigns view doesn't fetch session duration by default; can pass 0 or fetch it
        handleClaim={handleClaim}
        isClaiming={isClaiming}
        isRecent={false}
      />

      {/* Gaming Account Modal */}
      <Modal visible={showGamingPrompt} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Link Gaming Account</Text>
              <Pressable onPress={() => { setShowGamingPrompt(false); setPendingGamingCampaignId(null); }} style={styles.closeBtn}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <View style={styles.instructionBox}>
                <Gamepad2 size={20} color={colors.accentPrimary} style={{ marginRight: 12, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 }}>This is a Gaming campaign</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>Link at least one gaming platform so the publisher can match your gameplay data and reward you with NRT.</Text>
                </View>
              </View>

              <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginTop: 20, marginBottom: 12 }}>Select Platform</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {availableGamingPlatforms.map(platform => {
                  const isSelected = gamingPlatformSelect === platform;
                  return (
                    <Pressable key={platform} onPress={() => setGamingPlatformSelect(platform)} style={[styles.platformBtn, isSelected && styles.platformBtnActive]}>
                      <Text style={[styles.platformText, isSelected && styles.platformTextActive]}>{GAMING_PLATFORMS[platform].label}</Text>
                    </Pressable>
                  )
                })}
              </View>

              <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 }}>Username / ID</Text>
              <TextInput
                style={styles.gameInput}
                placeholder="e.g. xKiller99"
                placeholderTextColor={colors.textSecondary}
                value={gamingUsernameInput}
                onChangeText={setGamingUsernameInput}
              />
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopWidth: 0 }]}>
              <Pressable onPress={handleLinkAndJoin} disabled={isLinking || !gamingUsernameInput.trim()} style={[styles.applyBtn, { width: '100%', opacity: !gamingUsernameInput.trim() ? 0.5 : 1 }]}>
                {isLinking ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.applyBtnText}>Link & Join Campaign</Text>}
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
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  filterBtnActive: { borderColor: colors.accentPrimary },
  filterBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginLeft: 6 },
  filterBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentPrimary, position: 'absolute', top: -2, right: -2 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: colors.bgSecondary, borderRadius: 8, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: colors.bgPrimary },
  tabText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  tabTextActive: { color: colors.textPrimary },

  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontSize: 14 },

  card: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder, marginRight: 12 },
  cardIconText: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  cardRate: { fontSize: 16, fontWeight: '900', color: colors.accentPrimary },
  cardRateLabel: { fontSize: 9, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' },

  progressTrack: { height: 6, backgroundColor: colors.bgPrimary, borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: colors.accentPrimary, borderRadius: 3 },

  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary, paddingVertical: 12, borderRadius: 12 },
  joinBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  instructionBox: { flexDirection: 'row', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  instructionText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  viewEarningsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  viewEarningsText: { color: colors.accentPrimary, fontSize: 14, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  closeBtn: { padding: 4 },

  filterSectionTitle: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 12, marginTop: 8 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  chipActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.accentPrimary },
  chipText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
  chipTextActive: { color: colors.accentPrimary },

  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingBottom: 40 },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bgSecondary, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  clearBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' },
  applyBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.accentPrimary, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  earningsAppCard: { backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder },
  earningsAppIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  earningsAppIconText: { fontSize: 24, fontWeight: 'bold', color: colors.accentPrimary, textTransform: 'uppercase' },

  platformBtn: { width: '48%', paddingVertical: 12, backgroundColor: colors.bgSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center' },
  platformBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.accentPrimary },
  platformText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  platformTextActive: { color: colors.accentPrimary },
  gameInput: { backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.glassBorder, color: colors.textPrimary, fontSize: 14 },
});
