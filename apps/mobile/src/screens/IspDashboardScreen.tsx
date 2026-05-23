import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { colors, shadows } from '../theme';

export default function IspDashboardScreen() {
  const { profile } = useAuthStore();
  const [networks, setNetworks] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalBandwidth: 0, totalNrt: 0, totalCashback: 0, connectedDevices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchData();
  }, [profile?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Networks
      const { data: netData } = await supabase
        .from('networks')
        .select('*')
        .eq('owner_id', profile!.id);
      setNetworks(netData || []);

      // ISP campaigns
      const { data: campData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('isp_id', profile!.id)
        .order('created_at', { ascending: false });
      setCampaigns(campData || []);

      const activeCampaigns = (campData || []).filter(c => c.status === 'active');

      // Cashback
      const { data: cashbackData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', profile!.id)
        .eq('tx_type', 'isp_cashback');
      const totalCashback = (cashbackData || []).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      // Bandwidth
      const { data: sessions } = await supabase
        .from('tracking_sessions')
        .select('bytes_up, bytes_down')
        .eq('network_id', (netData || [])[0]?.id || '')
        .limit(1000);
      const totalBytes = (sessions || []).reduce((s, t) => s + Number(t.bytes_up || 0) + Number(t.bytes_down || 0), 0);

      setStats({
        totalBandwidth: totalBytes / (1024 * 1024 * 1024), // GB
        totalNrt: activeCampaigns.reduce((s, c) => s + Number(c.total_reward_pool || 0), 0),
        totalCashback,
        connectedDevices: activeCampaigns.reduce((s, c) => s + Number(c.users_reached || 0), 0),
      });
    } catch (e) {
      console.error('ISP fetch error:', e);
    }
    setLoading(false);
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color={colors.accentPrimary} /></View>;
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.welcomeLabel}>INTERNET SERVICE PROVIDER</Text>
          <Text style={s.title}>{profile?.display_name || 'ISP Dashboard'}</Text>
        </View>
        <View style={[s.roleBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
          <Text style={[s.roleBadgeText, { color: '#10b981' }]}>ISP</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        {[
          { emoji: '🌐', label: 'Total Bandwidth', value: `${stats.totalBandwidth.toFixed(1)} GB`, color: '#3b82f6' },
          { emoji: '📱', label: 'Connected Devices', value: stats.connectedDevices.toLocaleString(), color: '#f59e0b' },
          { emoji: '💎', label: 'NRT Pool', value: stats.totalNrt.toFixed(2), color: '#10b981' },
          { emoji: '💰', label: 'ISP Cashback', value: stats.totalCashback.toFixed(4), color: '#8b5cf6' },
        ].map((stat, i) => (
          <View key={i} style={s.statCard}>
            <Text style={{ fontSize: 20 }}>{stat.emoji}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
          </View>
        ))}
      </View>

      {/* Networks */}
      <Text style={s.sectionTitle}>Your Networks</Text>
      {networks.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={{ fontSize: 28 }}>📡</Text>
          <Text style={s.emptyText}>No networks registered</Text>
        </View>
      ) : (
        networks.map(net => (
          <View key={net.id} style={s.itemCard}>
            <View style={s.itemIcon}><Text style={{ fontSize: 18 }}>📡</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle}>{net.name}</Text>
              <Text style={s.itemDesc}>{net.network_type || 'WiFi'} · {net.region || 'Global'}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: net.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }]}>
              <Text style={[s.statusBadgeText, { color: net.status === 'active' ? '#10b981' : '#f59e0b' }]}>
                {(net.status || 'active').toUpperCase()}
              </Text>
            </View>
          </View>
        ))
      )}

      {/* ISP Campaigns */}
      <Text style={[s.sectionTitle, { marginTop: 20 }]}>ISP Campaigns</Text>
      {campaigns.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={{ fontSize: 28 }}>📢</Text>
          <Text style={s.emptyText}>No ISP campaigns created</Text>
        </View>
      ) : (
        campaigns.slice(0, 5).map(camp => (
          <View key={camp.id} style={s.itemCard}>
            <View style={[s.itemIcon, { backgroundColor: camp.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)' }]}>
              <Text style={{ fontSize: 18 }}>{camp.status === 'active' ? '🟢' : '⏸️'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle}>{camp.title}</Text>
              <Text style={s.itemDesc}>
                {Number(camp.reward_rate_per_gb || 0).toFixed(2)} NRT/GB · {Number(camp.users_reached || 0)} devices
              </Text>
            </View>
          </View>
        ))
      )}

      {/* Network Stats */}
      <View style={[s.card, { marginTop: 20 }]}>
        <View style={s.cardHeader}>
          <Text style={{ fontSize: 18 }}>📊</Text>
          <Text style={s.cardTitle}>Network Analytics</Text>
        </View>
        <Text style={s.cardDesc}>
          Monitor real-time bandwidth usage, device connections, and NRT distribution across your network.
        </Text>
        <View style={s.analyticsRow}>
          <View style={s.analyticsItem}>
            <Text style={s.analyticsLabel}>AVG SPEED</Text>
            <Text style={s.analyticsValue}>52 Mbps</Text>
          </View>
          <View style={s.analyticsItem}>
            <Text style={s.analyticsLabel}>UPTIME</Text>
            <Text style={s.analyticsValue}>99.9%</Text>
          </View>
          <View style={s.analyticsItem}>
            <Text style={s.analyticsLabel}>COVERAGE</Text>
            <Text style={s.analyticsValue}>{networks.length} Zones</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPrimary },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcomeLabel: { fontSize: 9, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginTop: 2 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  roleBadgeText: { fontSize: 12, fontWeight: '900' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47%', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14, padding: 14, gap: 4, ...shadows.sm },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  statValue: { fontSize: 18, fontWeight: '900' },

  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary, marginBottom: 10 },

  emptyCard: { alignItems: 'center', paddingVertical: 28, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14 },
  emptyText: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },

  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14, padding: 14, marginBottom: 8 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  itemDesc: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  card: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  cardDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 12 },
  analyticsItem: { alignItems: 'center', gap: 4 },
  analyticsLabel: { fontSize: 8, fontWeight: '900', color: colors.textTertiary, letterSpacing: 0.5 },
  analyticsValue: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
});
