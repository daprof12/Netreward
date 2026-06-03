import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, ActivityIndicator, Image,
} from 'react-native';
import { X, TrendingUp, Laptop, Smartphone, Search } from 'lucide-react-native';
import { useThemeColors } from '@/theme';
import { useCampaignAnalytics } from '@/hooks/useCampaignAnalytics';
import { formatNrtText } from '@/lib/formatNrt';
import NrtAmount from '@/components/ui/NrtAmount';
import WebViewChart from '@/components/WebViewChart';
import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CampaignAnalyticsModal({
  campaign,
  onClose,
}: {
  campaign: any;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { data: analytics, isLoading } = useCampaignAnalytics(campaign.id);
  const [search, setSearch] = useState('');

  const filtered = (analytics?.participants || []).filter(
    (p) =>
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.country.toLowerCase().includes(search.toLowerCase())
  );

  const chartData = analytics?.chartData || [];
  const hasChart = chartData.length > 0 && chartData.some((d) => d.nrt > 0);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Sticky Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {campaign.name || campaign.title}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Campaign Identity Card */}
          <View style={styles.identityCard}>
            <View style={styles.campLogoWrapper}>
              {campaign.logo_url ? (
                <Image source={{ uri: campaign.logo_url }} style={styles.campLogo} />
              ) : (
                <Text style={styles.campLogoText}>
                  {(campaign.name || campaign.title)?.[0]?.toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.campName}>{campaign.name || campaign.title}</Text>
              <Text style={styles.campMeta}>
                {campaign.category || 'General'} • {campaign.status || 'active'}
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Started</Text>
              <Text style={styles.statValue}>
                {new Date(campaign.startDate || campaign.created_at || Date.now()).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Users Reached</Text>
              <Text style={styles.statValue}>
                {isLoading ? '...' : analytics?.totalUsers}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Budget Spent</Text>
              <NrtAmount 
                value={campaign.spentNrt || campaign.budget_spent || 0} 
                style={[styles.statValue, { color: colors.accentPrimary }]} 
                hideUnit 
              />
            </View>
          </View>

          {/* Performance Chart */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <TrendingUp size={16} color={colors.accentPrimary} />
              <Text style={styles.cardTitle}>Performance (Last 7 Days)</Text>
            </View>
            {isLoading ? (
              <View style={styles.chartPlaceholder}>
                <ActivityIndicator size="large" color={colors.accentPrimary} />
              </View>
            ) : hasChart ? (
              <View style={{ marginTop: 8 }}>
                <WebViewChart 
                  data={chartData} 
                  xKey="date" 
                  series={[{ key: 'nrt', color: colors.accentPrimary, name: 'NRT' }]} 
                  height={180} 
                  type="area" 
                />
              </View>
            ) : (
              <View style={styles.chartPlaceholder}>
                <TrendingUp size={32} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No data for last 7 days</Text>
              </View>
            )}
            <Text style={styles.chartCaption}>Daily NRT rewards distributed to participants</Text>
          </View>

          {/* Active Earning Devices */}
          <Text style={styles.sectionTitle}>Active Earning Devices</Text>

          <View style={styles.searchBar}>
            <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email or location..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.accentPrimary} />
              <Text style={styles.emptyText}>Loading participants...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.loadingBox}>
              <Text style={styles.emptyText}>No active participants found.</Text>
            </View>
          ) : (
            filtered.map((u, i) => (
              <View key={i} style={styles.participantCard}>
                <View style={styles.participantIconBox}>
                  {u.device_type === 'laptop' || u.device_type === 'desktop' ? (
                    <Laptop size={20} color={colors.accentPrimary} />
                  ) : (
                    <Smartphone size={20} color={colors.accentPrimary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantEmail} numberOfLines={1}>{u.email}</Text>
                  <Text style={styles.participantMeta}>
                    {u.device_name} • {u.country}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <NrtAmount value={u.nrt_earned} showSign style={styles.participantNrt} />
                  <Text
                    style={[
                      styles.participantStatus,
                      { color: u.status === 'active' ? colors.success : colors.textSecondary },
                    ]}
                  >
                    {u.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
      backgroundColor: colors.bgPrimary,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, flex: 1, marginRight: 12 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, paddingBottom: 60 },

    identityCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16,
      borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16,
    },
    campLogoWrapper: {
      width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgPrimary,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      borderWidth: 1, borderColor: colors.glassBorder,
    },
    campLogo: { width: '100%', height: '100%' },
    campLogoText: { fontSize: 22, fontWeight: 'bold', color: colors.accentPrimary },
    campName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
    campMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    liveBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)',
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
    liveBadgeText: { fontSize: 10, fontWeight: '900', color: '#10b981' },

    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statBox: {
      flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 12,
      alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder,
    },
    statLabel: { fontSize: 10, color: colors.textSecondary, marginBottom: 4, textAlign: 'center' },
    statValue: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },

    card: {
      backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16,
      borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 20,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    cardTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
    chartPlaceholder: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
    chartCaption: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary,
      borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder,
      paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
    },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },

    loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

    participantCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 14,
      borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 10,
    },
    participantIconBox: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.1)',
      alignItems: 'center', justifyContent: 'center',
    },
    participantEmail: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, maxWidth: 180 },
    participantMeta: { fontSize: 10, color: colors.textSecondary, fontWeight: 'bold', marginTop: 2 },
    participantNrt: { fontSize: 13, fontWeight: 'bold', color: colors.accentPrimary },
    participantStatus: { fontSize: 10, fontWeight: '900', marginTop: 2 },
  });
