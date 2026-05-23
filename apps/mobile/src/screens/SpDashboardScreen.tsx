import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { colors, shadows } from '../theme';

export default function SpDashboardScreen() {
  const { profile } = useAuthStore();
  const [services, setServices] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalNrt: 0, totalCashback: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchData();
  }, [profile?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch SP services
      const { data: svcData } = await supabase
        .from('services')
        .select('*')
        .eq('owner_id', profile!.id);
      setServices(svcData || []);

      // Fetch SP campaigns
      const { data: campData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('sp_id', profile!.id)
        .order('created_at', { ascending: false });
      setCampaigns(campData || []);

      // Aggregate stats
      const activeCampaigns = (campData || []).filter(c => c.status === 'active');
      const totalReward = activeCampaigns.reduce((sum, c) => sum + Number(c.total_reward_pool || 0), 0);
      const totalUsers = activeCampaigns.reduce((sum, c) => sum + Number(c.users_reached || 0), 0);

      // Fetch cashback
      const { data: cashbackData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', profile!.id)
        .eq('tx_type', 'sp_cashback');
      const totalCashback = (cashbackData || []).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      setStats({
        totalUsers,
        totalNrt: totalReward,
        totalCashback,
        totalRevenue: activeCampaigns.reduce((s, c) => s + Number(c.checkout_total || 0), 0),
      });
    } catch (e) {
      console.error('SP fetch error:', e);
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
          <Text style={s.welcomeLabel}>SERVICE PROVIDER</Text>
          <Text style={s.title}>{profile?.display_name || 'SP Dashboard'}</Text>
        </View>
        <View style={s.roleBadge}>
          <Text style={s.roleBadgeText}>SP</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        {[
          { emoji: '👥', label: 'Total Users', value: stats.totalUsers.toLocaleString(), color: '#3b82f6' },
          { emoji: '⚡', label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'active').length.toString(), color: '#f59e0b' },
          { emoji: '💰', label: 'NRT Distributed', value: stats.totalNrt.toFixed(2), color: '#10b981' },
          { emoji: '🏆', label: 'SP Cashback', value: stats.totalCashback.toFixed(4), color: '#8b5cf6' },
        ].map((stat, i) => (
          <View key={i} style={s.statCard}>
            <Text style={{ fontSize: 20 }}>{stat.emoji}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
          </View>
        ))}
      </View>

      {/* Services */}
      <Text style={s.sectionTitle}>Your Services</Text>
      {services.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={{ fontSize: 28 }}>🔧</Text>
          <Text style={s.emptyText}>No services registered</Text>
        </View>
      ) : (
        services.map(svc => (
          <View key={svc.id} style={s.itemCard}>
            <View style={s.itemIcon}><Text style={{ fontSize: 18 }}>🌐</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle}>{svc.name}</Text>
              <Text style={s.itemDesc}>{svc.category || 'Service'} · API Key: {svc.api_key?.substring(0, 12)}...</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: svc.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }]}>
              <Text style={[s.statusBadgeText, { color: svc.status === 'active' ? '#10b981' : '#f59e0b' }]}>
                {(svc.status || 'active').toUpperCase()}
              </Text>
            </View>
          </View>
        ))
      )}

      {/* Campaigns */}
      <Text style={[s.sectionTitle, { marginTop: 20 }]}>Campaigns</Text>
      {campaigns.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={{ fontSize: 28 }}>📢</Text>
          <Text style={s.emptyText}>No campaigns created</Text>
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
                {Number(camp.reward_rate_per_gb || 0).toFixed(2)} NRT/GB · {Number(camp.users_reached || 0)} users
              </Text>
            </View>
            <Text style={[s.statValue, { fontSize: 14, color: colors.accentPrimary }]}>
              {Number(camp.total_reward_pool || 0).toFixed(1)} NRT
            </Text>
          </View>
        ))
      )}

      {/* SDK Integration */}
      <View style={[s.card, { marginTop: 20 }]}>
        <View style={s.cardHeader}>
          <Text style={{ fontSize: 18 }}>🔗</Text>
          <Text style={s.cardTitle}>SDK Integration</Text>
        </View>
        <Text style={s.cardDesc}>
          Integrate the NetReward Tracker SDK into your platform to earn cashback on user activity.
        </Text>
        <View style={s.sdkStatus}>
          <View style={[s.statusDot, { backgroundColor: services.length > 0 ? '#10b981' : '#f59e0b' }]} />
          <Text style={s.sdkStatusText}>
            {services.length > 0 ? 'SDK Integrated' : 'Not Integrated Yet'}
          </Text>
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
  roleBadge: { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  roleBadgeText: { fontSize: 12, fontWeight: '900', color: colors.accentPrimary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47%', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 14, padding: 14, gap: 4, ...shadows.sm },
  statLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },

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

  sdkStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sdkStatusText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
});
