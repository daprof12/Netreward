import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Image } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import PulseDot from '@/components/ui/PulseDot';
import { useSpStore } from '@/stores/useSpStore';
import { useSystemStore } from '@/stores/useSystemStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';
import { useTelemetry } from '@/hooks/useTelemetry';
import { useThemeColors, shadows } from '@/theme';
import WebViewChart from '@/components/WebViewChart';
import CampaignAnalyticsModal from '@/components/CampaignAnalyticsModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Users, Zap, DollarSign, Key, Code, Bell, ChevronLeft, ChevronRight, BarChart3, Info, TrendingUp, PieChart, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import NotificationBell from '@/components/ui/NotificationBell';
import NrtAmount from '@/components/ui/NrtAmount';
import { useToastStore } from '@/stores/useToastStore';

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

type TimeFilter = '24H' | '7D' | '3M' | 'All';

export default function SpDashboardScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { services, campaigns, profileId: spProfileId, profileLogo } = useSpStore();
  const { settings } = useSystemStore();
  const { getCurrencyDetails } = useCurrencyStore();
  const { campaignStats, fetchCampaignStats, isLoading: isStatsLoading } = useAnalyticsStore();
  const { spTelemetry, spHeatmap, isSpHeatmapLoading, isSpTelemetryLoading } = useTelemetry();
  const { showToast } = useToastStore();

  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const [chartView, setChartView] = useState<'campaigns' | 'checkout' | 'cashback'>('campaigns');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24H');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const sdkScrollViewRef = useRef<ScrollView>(null);
  const cardContentWidth = width - 72;

  const handleDotPress = (index: number) => {
    setActiveServiceIndex(index);
    sdkScrollViewRef.current?.scrollTo({
      x: index * cardContentWidth,
      animated: true,
    });
  };

  useEffect(() => {
    if (user?.id) {
      useSpStore.getState().initialize(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (spProfileId) {
      fetchCampaignStats(spProfileId, timeFilter === '24H' ? 1 : timeFilter === '7D' ? 7 : 90);
    }
  }, [spProfileId, timeFilter, fetchCampaignStats]);

  const [viewingCampaign, setViewingCampaign] = useState<any | null>(null);

  const runningCampaigns = campaigns
    .filter(c => c.status === 'active')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const totalNrtDistributed = campaignStats.reduce((sum, stat) => sum + Number(stat.total_nrt_distributed || 0), 0);
  const totalUsersReached = campaignStats.reduce((sum, stat) => sum + Number(stat.total_users_reached || 0), 0);
  const revenueNrt = totalNrtDistributed * (settings.spCashbackPercentage / 100);

  const chartData = React.useMemo(() => {
    if (!campaignStats) return [];
    return campaignStats.map(s => ({
      name: new Date(s.date).toLocaleDateString(undefined, { weekday: 'short' }),
      value: chartView === 'campaigns' ? Number(s.total_users_reached || 0) :
        chartView === 'cashback' ? Number(s.total_nrt_distributed || 0) * 0.1 :
          Number(s.total_nrt_distributed || 0),
    }));
  }, [campaignStats, chartView]);

  const sdkStatus = 'verified'; // Mock status logic can be expanded

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Partner';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

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
                <Text style={styles.roleText}>SP</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <NotificationBell />
            <Pressable onPress={() => router.push('/settings')} style={styles.avatar}>
              {profileLogo ? (
                <Text style={{ color: '#fff', fontSize: 10 }}>IMG</Text> // Handle actual image using Image component later
              ) : (
                <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Activity size={20} color={colors.accentPrimary} style={{ marginBottom: 8 }} />
            <Text style={styles.statLabel}>NRT Distributed</Text>
            <View style={{ flexDirection: 'row' }}>
              {isStatsLoading ? (
                <ActivityIndicator size="small" color={colors.accentPrimary} />
              ) : (
                <NrtAmount value={totalNrtDistributed} hideUnit style={styles.statValue} />
              )}
            </View>
          </View>
          <Pressable style={styles.statBox} onPress={() => router.push('/campaigns?tab=campaigns')}>
            <Zap size={20} color="#F59E0B" style={{ marginBottom: 8 }} />
            <Text style={styles.statLabel}>Active Campaigns</Text>
            <Text style={styles.statValue}>{runningCampaigns.length}</Text>
          </Pressable>
          <View style={styles.statBox}>
            <Users size={20} color="#3B82F6" style={{ marginBottom: 8 }} />
            <Text style={styles.statLabel}>Users Reached</Text>
            <Text style={styles.statValue}>
              {isStatsLoading ? <ActivityIndicator size="small" color="#3B82F6" /> : totalUsersReached.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statBox}>
            <DollarSign size={20} color={colors.success} style={{ marginBottom: 8 }} />
            <Text style={styles.statLabel}>Revenue ({settings.spCashbackPercentage}%)</Text>
            <Text style={styles.statValue}>
              {isStatsLoading ? <ActivityIndicator size="small" color={colors.success} /> : `${getCurrencyDetails().symbol}${((revenueNrt * getCurrencyDetails().rate)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </Text>
          </View>
        </View>

        {/* SDK Integration Card */}
        <View style={styles.card}>
          {profile?.kyc_status !== 'verified' ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <View style={{ width: 64, height: 64, backgroundColor: colors.bgSecondary, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Code size={32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 }}>SDK Not Connected</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 }}>
                NetReward Tracker SDK must be active for your campaigns to correctly report data usage. Earn {settings.spCashbackPercentage}% NRT back.
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/settings/kyc', params: { targetRole: 'sp' } } as any)}
                style={{ backgroundColor: colors.accentPrimary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Get Started with Verification</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Code size={18} color={colors.accentPrimary} />
                  <Text style={styles.cardTitle}>SDK Integration</Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>{sdkStatus.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                  {sdkStatus === 'verified' && (
                    <PulseDot size={8} color="#10b981" />
                  )}
                </View>
              </View>
              <Text style={styles.cardDescription}>
                NetReward Tracker SDK must be active for your campaigns to correctly report data usage. Earn {settings.spCashbackPercentage}% NRT back.
              </Text>

              {services.length > 0 ? (
                <>
                  <ScrollView
                    ref={sdkScrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const offset = e.nativeEvent.contentOffset.x;
                      const index = Math.round(offset / cardContentWidth);
                      if (index !== activeServiceIndex) {
                        setActiveServiceIndex(index);
                      }
                    }}
                    style={{ width: cardContentWidth, marginBottom: 16 }}
                    contentContainerStyle={{ alignItems: 'center' }}
                  >
                    {services.map((item, i) => (
                      <View
                        key={item.id || i}
                        style={[styles.networkBox, { width: cardContentWidth, marginBottom: 0 }]}
                      >
                        <View style={styles.networkIcon}>
                          {item?.logoUrl ? (
                            <Image source={{ uri: item.logoUrl }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                          ) : (
                            <Key size={14} color={colors.accentPrimary} />
                          )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.networkName}>{item?.name || 'SERVICE'}</Text>
                          <Text style={styles.networkDesc}>
                            {item?.apiKey
                              ? `${item.apiKey.slice(0, 12)}••••${item.apiKey.slice(-4)}`
                              : 'No API key'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>

                  {services.length > 1 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                      {services.map((_, i) => (
                        <Pressable
                          key={i}
                          onPress={() => handleDotPress(i)}
                          style={{
                            width: i === activeServiceIndex ? 16 : 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: i === activeServiceIndex ? colors.accentPrimary : 'rgba(128,128,128,0.3)'
                          }}
                        />
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.networkBox}>
                  <View style={styles.networkIcon}>
                    <Key size={14} color={colors.accentPrimary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.networkName}>NO SERVICES</Text>
                    <Text style={styles.networkDesc}>Create a service to get your API key</Text>
                  </View>
                </View>
              )}

              <View style={styles.sdkFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <PulseDot size={8} color="#10b981" />
                  <Text style={styles.sdkFooterText}>Last Ping: <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Just now</Text></Text>
                </View>
                <Pressable onPress={() => router.push('/documentation/sdk' as any)}>
                  <Text style={styles.sdkFooterLink}>View Documentation</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Campaign ROI & Performance */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={20} color={colors.accentPrimary} />
              <Text style={styles.cardTitle}>Campaign ROI</Text>
            </View>
            <Info size={16} color={colors.textSecondary} />
          </View>
          {isSpTelemetryLoading ? (
            <View style={{ paddingVertical: 32 }}><ActivityIndicator color={colors.textSecondary} /></View>
          ) : (!spTelemetry || spTelemetry.length === 0) ? (
            <View style={styles.emptyState}>
              <TrendingUp size={24} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Insufficient Data</Text>
              <Text style={styles.emptyText}>Ensure your SDK is integrated correctly to start tracking campaign ROI.</Text>
            </View>
          ) : (
            <View style={{ paddingVertical: 16 }}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(128,128,128,0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 }}>Avg. Conversion</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>
                    {(spTelemetry.reduce((sum, t) => sum + (t.views > 0 ? (t.conversions / t.views) * 100 : 0), 0) / spTelemetry.length).toFixed(1)}%
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.success, fontWeight: 'bold', marginTop: 4 }}>Live tracking active</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(128,128,128,0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder }}>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 }}>Cost per Reward</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>
                    {(spTelemetry.reduce((sum, t) => sum + (t.conversions > 0 ? t.total_cost_nrt / t.conversions : 0), 0) / spTelemetry.length).toFixed(3)} NRT
                  </Text>
                  <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: 'bold', marginTop: 4 }}>Efficient Range</Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 12 }}>Top Regions</Text>
              {Object.entries(
                spTelemetry.reduce((acc, t) => {
                  acc[t.country] = (acc[t.country] || 0) + t.views;
                  return acc;
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([country, views], i) => (
                <View key={country} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === 0 ? colors.success : i === 1 ? '#3B82F6' : '#8B5CF6' }} />
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.textPrimary }}>{country}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{views} views</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Audience Insights */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PieChart size={20} color={colors.accentPrimary} />
              <Text style={styles.cardTitle}>Audience Insights</Text>
            </View>
          </View>
          {isSpTelemetryLoading ? (
            <View style={{ paddingVertical: 32 }}><ActivityIndicator color={colors.textSecondary} /></View>
          ) : (!spTelemetry || spTelemetry.length === 0) ? (
            <View style={styles.emptyState}>
              <Users size={24} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Insufficient Data</Text>
              <Text style={styles.emptyText}>Demographic breakdowns will appear here once campaigns begin receiving tracking payloads.</Text>
            </View>
          ) : (() => {
            const totalViews = spTelemetry.reduce((s, t) => s + t.views, 0);
            if (totalViews === 0) return (
              <View style={styles.emptyState}>
                <Users size={24} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                <Text style={styles.emptyTitle}>No views yet</Text>
                <Text style={styles.emptyText}>Your campaigns have not generated tracking events.</Text>
              </View>
            );

            const mobile = spTelemetry.filter(t => t.device_type === 'Mobile App').reduce((s, t) => s + t.views, 0);
            const ext = spTelemetry.filter(t => t.device_type === 'Chrome Extension').reduce((s, t) => s + t.views, 0);
            const desktop = spTelemetry.filter(t => t.device_type === 'Desktop App').reduce((s, t) => s + t.views, 0);
            const categories = Array.from(new Set(spTelemetry.map(t => t.interest_category).filter(Boolean)));

            return (
              <View style={{ paddingVertical: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' }}>Device Types</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' }}>% Total</Text>
                </View>
                {[
                  { label: 'Mobile App', value: ((mobile / totalViews) * 100).toFixed(1), color: colors.accentPrimary },
                  { label: 'Chrome Extension', value: ((ext / totalViews) * 100).toFixed(1), color: '#3B82F6' },
                  { label: 'Desktop App', value: ((desktop / totalViews) * 100).toFixed(1), color: '#8B5CF6' },
                ].map(item => (
                  <View key={item.label} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.textPrimary }}>{item.label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textPrimary }}>{item.value}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: 'rgba(128,128,128,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${item.value}%` as any, backgroundColor: item.color }} />
                    </View>
                  </View>
                ))}

                <View style={{ borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 16, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' }}>Top Interest Categories</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {categories.map((tag: any) => (
                      <View key={tag} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(128,128,128,0.1)', borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.textPrimary }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })()}
        </View>

        {/* Platform Activity (Heatmap) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Platform Activity</Text>
              <Text style={styles.cardSubtitle}>NRT distribution over the last 16 weeks</Text>
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

          {isSpHeatmapLoading ? (
            <View style={{ paddingVertical: 32 }}><ActivityIndicator color={colors.accentPrimary} /></View>
          ) : (!spHeatmap || spHeatmap.length === 0) ? (
            <View style={styles.emptyState}>
              <Activity size={24} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>No Platform Activity</Text>
              <Text style={styles.emptyText}>Activity will appear here once users interact with your campaigns.</Text>
            </View>
          ) : (
            <View style={styles.heatmapGrid}>
              <View style={styles.heatmapDays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <View key={d} style={styles.heatmapDayWrapper}>
                    <Text style={styles.heatmapDayText}>{d}</Text>
                  </View>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                {[...Array(16)].map((_, weekIdx) => (
                  <View key={weekIdx} style={styles.heatmapCol}>
                    {[...Array(7)].map((_, dayIdx) => {
                      const dataIndex = weekIdx * 7 + dayIdx;
                      const dayData = spHeatmap[dataIndex];
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
                              showToast(`${dayData.activity_date}: ${dayData.value} NRT Distributed`, 'success');
                            }
                          }}
                        />
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Analytics Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Analytics</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable onPress={() => setChartType('line')} style={chartType === 'line' ? styles.chartToggleActive : styles.chartToggleInactive}>
                <TrendingUp size={16} color={chartType === 'line' ? '#fff' : colors.textSecondary} />
              </Pressable>
              <Pressable onPress={() => setChartType('bar')} style={chartType === 'bar' ? styles.chartToggleActive : styles.chartToggleInactive}>
                <BarChart3 size={16} color={chartType === 'bar' ? '#fff' : colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.segmentControl}>
            {['Campaigns', 'Checkout', 'Cashback'].map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setChartView(tab.toLowerCase() as any)}
                style={[styles.segmentTab, chartView.toLowerCase() === tab.toLowerCase() && styles.segmentTabActive]}
              >
                <Text style={[styles.segmentTabText, chartView.toLowerCase() === tab.toLowerCase() && styles.segmentTabTextActive]}>{tab}</Text>
              </Pressable>
            ))}
          </View>

          {isStatsLoading ? (
            <View style={{ paddingVertical: 32 }}><ActivityIndicator color={colors.textSecondary} /></View>
          ) : chartData.length > 0 ? (
            <View style={{ height: 180, marginTop: 16 }}>
              <WebViewChart
                data={chartData}
                xKey="name"
                series={[{ key: 'value', color: colors.accentPrimary, name: chartView }]}
                height={180}
                type={chartType === 'line' ? 'area' : 'bar'}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <BarChart3 size={24} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>No Analytics Data</Text>
              <Text style={styles.emptyText}>Your platform timeline data will populate once your campaigns are active.</Text>
            </View>
          )}

          <View style={styles.timeFilterContainer}>
            {(['24H', '7D', '3M', 'All'] as TimeFilter[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTimeFilter(t)}
                style={[styles.timeFilterTab, timeFilter === t && styles.timeFilterTabActive]}
              >
                <Text style={[styles.timeFilterText, timeFilter === t && styles.timeFilterTextActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Live Campaigns */}
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Live Campaigns</Text>
            <Pressable onPress={() => router.push('/campaigns?tab=campaigns')}>
              <Text style={styles.manageLink}>Manage</Text>
            </Pressable>
          </View>

          {runningCampaigns.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.emptyState}>
                <Zap size={24} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
                <Text style={styles.emptyText}>No active campaigns running.</Text>
                <Pressable onPress={() => router.push('/campaigns?tab=campaigns')}>
                  <Text style={styles.createLink}>Create one now</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            runningCampaigns.slice(0, 3).map((camp) => (
              <Pressable
                key={camp.id}
                style={styles.liveCampCard}
                onPress={() => setViewingCampaign(camp)}
              >
                {/* Logo */}
                <View style={styles.liveCampLogo}>
                  {camp.logo_url ? (
                    <Image source={{ uri: camp.logo_url }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                  ) : (
                    <Text style={styles.liveCampLogoText}>{camp.name?.[0]?.toUpperCase() || '?'}</Text>
                  )}
                </View>
                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveCampName} numberOfLines={1}>{camp.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={styles.livePulse} />
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Running</Text>
                  </View>
                </View>
                {/* Budget */}
                <View style={{ alignItems: 'flex-end' }}>
                  <NrtAmount value={camp.spentNrt || 0} style={styles.liveCampBudget} />
                  <Text style={styles.liveCampBudgetLabel}>budget spent</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

      </ScrollView>

      {/* Campaign Analytics Modal */}
      {viewingCampaign && (
        <CampaignAnalyticsModal
          campaign={viewingCampaign}
          onClose={() => setViewingCampaign(null)}
        />
      )}
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
  roleBadge: { backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  roleText: { color: '#3b82f6', fontSize: 10, fontWeight: '900' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, ...shadows.sm },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },

  card: { backgroundColor: colors.bgSecondary, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 20, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  cardSubtitle: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  cardDescription: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 16 },

  verifiedBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { color: colors.success, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },

  networkBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: getRgba(colors.bgSecondary, 0.5), padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16 },
  networkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(5, 150, 104, 0.12)', alignItems: 'center', justifyContent: 'center' },
  networkName: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1, marginBottom: 2, textTransform: 'uppercase' },
  networkDesc: { fontSize: 12, color: colors.textSecondary },

  sdkFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 16 },
  sdkFooterText: { fontSize: 12, color: colors.textSecondary },
  sdkFooterLink: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', maxWidth: 250, lineHeight: 18 },

  heatmapLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatmapLegendText: { fontSize: 9, color: colors.textSecondary },
  heatmapDot: { width: 10, height: 10, borderRadius: 2 },

  heatmapGrid: { flexDirection: 'row', gap: 4 },
  heatmapDays: { justifyContent: 'space-between', paddingVertical: 2, marginRight: 8 },
  heatmapDayWrapper: { height: 12, justifyContent: 'center' },
  heatmapDayText: { fontSize: 10, color: colors.textSecondary },
  heatmapCol: { justifyContent: 'space-between', gap: 4 },
  heatmapCell: { width: 12, height: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3 },

  chartToggleActive: { backgroundColor: colors.accentPrimary, padding: 6, borderRadius: 6 },
  chartToggleInactive: { backgroundColor: 'transparent', padding: 6, borderRadius: 6 },

  segmentControl: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 4, marginBottom: 16 },
  segmentTab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  segmentTabActive: { backgroundColor: '#3b82f6' },
  segmentTabText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  segmentTabTextActive: { color: '#fff' },

  timeFilterContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  timeFilterTab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  timeFilterTabActive: { backgroundColor: colors.accentPrimary },
  timeFilterText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  timeFilterTextActive: { color: '#fff' },

  liveCampCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12 },
  liveCampLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder },
  liveCampLogoText: { fontSize: 18, fontWeight: 'bold', color: colors.accentPrimary },
  liveCampName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accentPrimary },
  liveCampBudget: { fontSize: 13, fontWeight: 'bold', color: colors.accentPrimary },
  liveCampBudgetLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  manageLink: { fontSize: 14, fontWeight: '600', color: colors.accentPrimary },
  createLink: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary, marginTop: 4 }
});
