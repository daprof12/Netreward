import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Image, Modal, Animated } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWallet } from '@/hooks/useWallet';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useDevices } from '@/hooks/useDevices';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useToastStore } from '@/stores/useToastStore';
import { useThemeColors } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell, Wallet, ArrowRightLeft, QrCode, Users, Flame, Zap, History,
  ChevronRight, Activity as ActivityIcon, X, CheckCircle2, ArrowDownToLine,
  Clock, Globe, Wifi, MapPin, Loader2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { formatNrtText } from '@/lib/formatNrt';
import EarningsDetailModal from '@/components/EarningsDetailModal';
import NrtAmount from '@/components/ui/NrtAmount';
import PulseDot from '@/components/ui/PulseDot';
import ActiveCampaignCard from '@/components/ui/ActiveCampaignCard';
import NotificationBell from '@/components/ui/NotificationBell';

// Helper to add alpha to hex safely
const getRgba = (hex: string, alpha: number) => {
  if (!hex) return 'transparent';
  if (hex.startsWith('rgba')) return hex;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const { width } = Dimensions.get('window');

const quickActions = [
  { icon: ArrowRightLeft, label: 'P2P', to: '/wallet/deposit/p2p', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  { icon: QrCode, label: 'Scan2Pay', to: '/wallet/scan-to-pay', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
  { icon: Users, label: 'Referral', to: '/wallet/referral', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  { icon: Bell, label: 'Support', to: '/support', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
];

function SignalBars({ strength = 4 }: { strength?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={{
            width: 3,
            height: 4 + i * 2.5,
            borderRadius: 1,
            backgroundColor: i <= strength ? '#10b981' : 'rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </View>
  );
}

export default function UserHomeScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { wallet, isLoading: isWalletLoading, claimRewards, isClaiming } = useWallet();
  const { userEnrollments, isLoading: isCampaignsLoading } = useCampaigns();
  const { devices } = useDevices();
  const { userHeatmap, isUserHeatmapLoading } = useTelemetry();
  const { selectedCurrency, convertNrt } = useCurrencyStore();
  const { showToast } = useToastStore();

  const [recentActivityRaw, setRecentActivityRaw] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [earningCampaign, setEarningCampaign] = useState<any | null>(null);

  // Fetch campaign durations (total seconds on device per campaign)
  const { data: campaignDurations } = useQuery({
    queryKey: ['campaign_durations', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data: devicesData } = await supabase.from('devices').select('id').eq('user_id', user.id);
      const deviceIds = devicesData?.map((d: any) => d.id) || [];
      if (deviceIds.length === 0) return {};
      const { data: sessions } = await supabase
        .from('device_data_sessions').select('campaign_id, duration_seconds').in('device_id', deviceIds);
      const map: Record<string, number> = {};
      for (const s of sessions || []) {
        map[s.campaign_id] = (map[s.campaign_id] || 0) + (s.duration_seconds || 0);
      }
      return map;
    },
    staleTime: 30000,
  });

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    const fetchActivities = async () => {
      if (!user?.id) return;
      
      const [sessionsRes, txRes] = await Promise.all([
        supabase.from('device_data_sessions')
          .select('campaign_id, session_end')
          .order('session_end', { ascending: false })
          .limit(20),
        supabase.from('transactions')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (sessionsRes.data) {
        setRecentActivityRaw(sessionsRes.data);
      }
      
      const activities: any[] = [];
      
      if (userEnrollments) {
        userEnrollments.forEach((en: any) => {
          const earned = (en.nrt_earned || 0) + (en.unclaimed_nrt || 0);
          if (earned > 0) {
            activities.push({
              id: `en_${en.id}`,
              icon: Zap,
              type: 'earn',
              amount: earned,
              title: en.campaigns?.title || 'Unknown',
              time: new Date(en.updated_at || en.created_at || 0).getTime(),
              timeStr: new Date(en.updated_at || en.created_at || 0).toLocaleDateString(),
              color: '#10b981'
            });
          }
        });
      }
      
      if (txRes.data) {
        txRes.data.forEach((t: any) => {
          const isSender = t.sender_id === user.id;
          const action = isSender ? 'Sent' : 'Received';
          const icon = isSender ? ArrowRightLeft : QrCode;
          const color = isSender ? '#ef4444' : '#10b981';
          const title = t.tx_type === 'scan2pay' ? 'Scan2Pay' : 'Transfer';
          
          activities.push({
            id: `tx_${t.id}`,
            icon,
            type: 'tx',
            action,
            amount: Number(t.amount),
            title,
            time: new Date(t.created_at).getTime(),
            timeStr: new Date(t.created_at).toLocaleDateString(),
            color
          });
        });
      }
      
      activities.sort((a, b) => b.time - a.time);
      setRecentActivity(activities.slice(0, 4));
    };

    fetchActivities();
    intervalId = setInterval(fetchActivities, 10000);
    return () => clearInterval(intervalId);
  }, [user?.id, userEnrollments]);

  const isLoading = isWalletLoading || isCampaignsLoading;

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const balance = wallet?.nrt_balance || 0;
  const balanceUsd = convertNrt(balance);

  const activeDevices = devices?.filter((d: any) => d.status === 'active') || [];
  const uniqueDeviceIds = new Set(activeDevices.map((d: any) => d.id));
  const deviceCount = uniqueDeviceIds.size;
  
  const activeEnrollments = userEnrollments?.filter((en: any) => en.status === 'active') || [];
  const uniqueCampaignIds = new Set(activeEnrollments.map((en: any) => en.campaign_id));
  const enrollmentCount = uniqueCampaignIds.size;
  const totalEarned = userEnrollments?.reduce((sum: number, en: any) => sum + (en.nrt_earned || 0) + (en.unclaimed_nrt || 0), 0) || 0;
  const totalUnclaimed = userEnrollments?.reduce((sum: number, en: any) => sum + (en.unclaimed_nrt || 0), 0) || 0;

  async function handleClaim() {
    try {
      const result: any = await claimRewards();
      if (result?.success) {
        showToast(`Successfully claimed ${formatNrtText(result.net_amount)} NRT`, 'success');
      } else {
        showToast(result?.message || 'Failed to claim rewards', 'danger');
      }
    } catch (err: any) {
      showToast(err.message || 'Error claiming rewards', 'danger');
    }
  }

  // Sorted enrollments — most recently created first
  const sortedEnrollments = [...(userEnrollments || [])].sort((a: any, b: any) => {
    const dateA = a.created_at || a.campaigns?.created_at || 0;
    const dateB = b.created_at || b.campaigns?.created_at || 0;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Earnings detail data for the selected campaign
  const earningEnrollment = earningCampaign
    ? userEnrollments?.find((e: any) => e.campaign_id === earningCampaign.id)
    : null;
  const earningTotalData = earningEnrollment?.data_consumed_gb || 0;
  const earningNrt = (earningEnrollment?.nrt_earned || 0) + (earningEnrollment?.unclaimed_nrt || 0);
  const durationSecs = earningCampaign ? (campaignDurations?.[earningCampaign.id] || 0) : 0;
  const durationFormatted =
    durationSecs >= 3600
      ? `${(durationSecs / 3600).toFixed(1)} hrs`
      : durationSecs >= 60
      ? `${Math.floor(durationSecs / 60)} min ${durationSecs % 60}s`
      : `${durationSecs}s`;

  const isSessionRecent = (campId: string) =>
    recentActivityRaw.some(
      (s: any) =>
        s.campaign_id === campId &&
        new Date().getTime() - new Date(s.session_end).getTime() < 15 * 60 * 1000
    );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{displayName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>USER</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
              <NotificationBell />
              <Pressable onPress={() => router.push('/settings')} style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
              </Pressable>
            </View>
        </View>

        {/* Balance Card */}
        <LinearGradient
          colors={['#10B981', '#7c3aed', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.walletIconBg}>
            <Wallet size={120} color="rgba(255,255,255,0.1)" strokeWidth={1} />
          </View>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <View style={styles.balanceRow}>
            <NrtAmount value={balance} hideUnit style={styles.balanceAmount} />
            <Text style={styles.balanceCurrency}>NRT</Text>
          </View>
          <Text style={styles.balanceUsd}>≈ {balanceUsd.symbol}{balanceUsd.amount} {selectedCurrency.split(' ')[0]}</Text>

          <View style={styles.balanceActions}>
            <Pressable style={styles.viewWalletBtn} onPress={() => router.push('/wallet')}>
              <Text style={styles.viewWalletText}>View Wallet</Text>
            </Pressable>
            <Pressable
              style={[styles.claimBtn, totalUnclaimed > 0 ? styles.claimBtnActive : {}]}
              onPress={handleClaim}
              disabled={isClaiming || totalUnclaimed <= 0}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : totalUnclaimed > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.claimText, styles.claimTextActive]}>Claim</Text>
                  <NrtAmount value={totalUnclaimed} style={[styles.claimText, styles.claimTextActive]} hideUnit />
                </View>
              ) : (
                <Text style={styles.claimText}>Claim Rewards</Text>
              )}
            </Pressable>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Campaigns</Text>
            <Text style={styles.statBoxValue}>{enrollmentCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Earned</Text>
            <NrtAmount value={totalEarned} hideUnit style={[styles.statBoxValue, { color: colors.accentPrimary }]} />
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Devices</Text>
            <Text style={styles.statBoxValue}>{deviceCount}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Pressable key={i} style={styles.actionBox} onPress={() => router.push(action.to as any)}>
                  <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
                    <Icon size={24} color={action.color} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Earnings Heatmap */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Flame size={16} color="#F97316" />
              <Text style={styles.cardTitle}>Earnings Heatmap</Text>
            </View>
            <View style={styles.heatmapLegend}>
              <Text style={styles.heatmapLegendText}>Less</Text>
              <View style={[styles.heatmapDot, { backgroundColor: 'rgba(128,128,128,0.15)' }]} />
              <View style={[styles.heatmapDot, { backgroundColor: getRgba(colors.accentPrimary, 0.25) }]} />
              <View style={[styles.heatmapDot, { backgroundColor: getRgba(colors.accentPrimary, 0.5) }]} />
              <View style={[styles.heatmapDot, { backgroundColor: getRgba(colors.accentPrimary, 0.75) }]} />
              <View style={[styles.heatmapDot, { backgroundColor: colors.accentPrimary }]} />
              <Text style={styles.heatmapLegendText}>More</Text>
            </View>
          </View>

          <View style={styles.heatmapGrid}>
            <View style={styles.heatmapDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <View key={d} style={styles.heatmapDayWrapper}>
                  <Text style={styles.heatmapDayText}>{d}</Text>
                </View>
              ))}
            </View>
            {isUserHeatmapLoading ? (
              <ActivityIndicator size="small" color={colors.accentPrimary} style={{ flex: 1 }} />
            ) : (!userHeatmap || userHeatmap.length === 0) ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <ActivityIcon size={24} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>No Activity Yet</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                {[...Array(16)].map((_, weekIdx) => (
                  <View key={weekIdx} style={styles.heatmapCol}>
                    {[...Array(7)].map((_, dayIdx) => {
                      const dataIndex = weekIdx * 7 + dayIdx;
                      const dayData = userHeatmap[dataIndex];
                      const intensity = dayData?.intensity || 0;

                      const bgColor =
                        intensity === 4 ? colors.accentPrimary :
                        intensity === 3 ? getRgba(colors.accentPrimary, 0.75) :
                        intensity === 2 ? getRgba(colors.accentPrimary, 0.5) :
                        intensity === 1 ? getRgba(colors.accentPrimary, 0.25) :
                        'rgba(128,128,128,0.15)';

                      return (
                        <Pressable 
                          key={dayIdx} 
                          style={[styles.heatmapCell, { backgroundColor: bgColor }]} 
                          onPress={() => {
                            if (dayData && dayData.activity_date) {
                              showToast(`${dayData.activity_date}: ${dayData.value} NRT`, 'success');
                            }
                          }}
                        />
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Active Campaigns — sorted by most recent, tappable */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Campaigns</Text>
            {enrollmentCount > 0 && (
              <Pressable onPress={() => router.push('/campaigns')}>
                <Text style={styles.viewAll}>View all →</Text>
              </Pressable>
            )}
          </View>

          {enrollmentCount === 0 ? (
            <View style={styles.card}>
              <View style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <Zap size={24} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 12 }}>No Active Campaigns</Text>
                <Pressable onPress={() => router.push('/campaigns')}>
                  <Text style={{ color: colors.accentPrimary, fontWeight: 'bold' }}>Browse Campaigns</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            sortedEnrollments.slice(0, 2).map((en: any) => {
              const camp = en.campaigns;
              const isRecent = camp?.id ? isSessionRecent(camp.id) : false;
              return (
                <ActiveCampaignCard
                  key={en.id}
                  campaign={camp}
                  enrollment={en}
                  isRecent={isRecent}
                  onPress={() => setEarningCampaign(camp)}
                />
              );
            })
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          <View style={styles.recentList}>
            {recentActivity.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <History size={24} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>No Recent Activity</Text>
              </View>
            ) : (
              recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <View key={activity.id} style={styles.recentItem}>
                    <View style={[styles.recentIconBox, { backgroundColor: activity.color + '1A', borderColor: activity.color + '33' }]}>
                      <Icon size={16} color={activity.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recentText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {activity.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' }}>
                          {activity.type === 'earn' ? 'Earned' : activity.action}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>•</Text>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{activity.timeStr}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <NrtAmount 
                        value={activity.type === 'tx' && activity.action === 'Sent' ? -activity.amount : activity.amount} 
                        showSign 
                        style={{ fontSize: 14, color: activity.color, fontWeight: '700' }} 
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

      </ScrollView>

      {/* ── Earnings Detail Bottom Sheet ── */}
      <EarningsDetailModal
        earningCampaign={earningCampaign}
        onClose={() => setEarningCampaign(null)}
        enrollment={earningEnrollment}
        durationSecs={earningCampaign ? (campaignDurations?.[earningCampaign.id] || 0) : 0}
        handleClaim={handleClaim}
        isClaiming={isClaiming}
        isRecent={earningCampaign ? isSessionRecent(earningCampaign.id) : false}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, textTransform: 'capitalize' },
  roleBadge: { backgroundColor: 'rgba(5, 150, 105, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(5, 150, 105, 0.2)' },
  roleText: { color: colors.accentPrimary, fontSize: 10, fontWeight: '900' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bellContainer: { position: 'relative' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  balanceCard: { padding: 20, borderRadius: 24, marginBottom: 20, overflow: 'hidden' },
  walletIconBg: { position: 'absolute', top: -20, right: -20 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  balanceCurrency: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 4, fontWeight: 'bold' },
  balanceUsd: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  balanceActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  viewWalletBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  viewWalletText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  claimBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  claimBtnActive: { backgroundColor: '#fff' },
  claimText: { color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontSize: 14 },
  claimTextActive: { color: '#6366f1' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  statBoxLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  statBoxValue: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  viewAll: { fontSize: 12, color: colors.accentPrimary, fontWeight: '600' },

  quickActionsGrid: { flexDirection: 'row', gap: 12 },
  actionBox: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  actionIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },

  card: { backgroundColor: colors.bgSecondary, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },

  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatmapLegendText: { fontSize: 9, color: colors.textSecondary },
  heatmapDot: { width: 10, height: 10, borderRadius: 2 },
  heatmapGrid: { flexDirection: 'row', gap: 4 },
  heatmapDays: { justifyContent: 'space-between', paddingVertical: 2, marginRight: 8 },
  heatmapDayWrapper: { height: 12, justifyContent: 'center' },
  heatmapDayText: { fontSize: 10, color: colors.textSecondary },
  heatmapCol: { justifyContent: 'space-between', gap: 4 },
  heatmapCell: { width: 12, height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3 },

  campaignCard: { backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12 },
  campLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder },
  activePulse: { position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 2, borderColor: colors.bgSecondary },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  campTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  campDesc: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  campConsumed: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },
  campConsumedLabel: { fontSize: 8, color: colors.textSecondary, fontWeight: 'bold', marginTop: 2 },
  campProgressBar: { flex: 1, height: 6, backgroundColor: colors.bgPrimary, borderRadius: 3, marginRight: 16, overflow: 'hidden' },
  campProgressFill: { height: '100%', backgroundColor: colors.accentPrimary, borderRadius: 3 },
  campNrt: { fontSize: 10, fontWeight: '900', color: colors.accentPrimary },

  recentList: { backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  recentItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  recentIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  recentText: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  recentDate: { fontSize: 12, color: colors.textSecondary },

  // Earnings Detail Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: colors.glassBorder, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.glassBorder, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16 },
  sheetCard: { backgroundColor: colors.bgPrimary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, padding: 16, gap: 14 },

  sheetIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetLogoBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder },
  sheetLogoText: { fontSize: 22, fontWeight: 'bold', color: colors.accentPrimary },
  sheetAppName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  sheetAppCat: { fontSize: 11, color: colors.textSecondary },
  sheetActiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  sheetPulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  sheetActiveBadgeText: { fontSize: 10, fontWeight: '900', color: '#10b981' },

  sheetDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  sheetTrackingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTrackingText: { fontSize: 12, color: colors.textSecondary },

  sheetLocations: { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  sheetLocationsLabel: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, letterSpacing: 0.5 },
  sheetLocChip: { backgroundColor: colors.bgSecondary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.glassBorder },
  sheetLocChipText: { fontSize: 10, color: colors.textPrimary, fontWeight: '500' },

  sheetDataRow: { gap: 8, paddingTop: 4 },
  sheetDataText: { fontSize: 12, color: colors.textSecondary },

  sheetTotalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  sheetTotalsLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  sheetTotalsValue: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },

  sheetFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder },
  sheetCloseBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.bgPrimary, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  sheetCloseBtnText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  sheetClaimBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 14, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sheetClaimBtnText: { fontSize: 14, fontWeight: 'bold', color: colors.bgPrimary },
});
