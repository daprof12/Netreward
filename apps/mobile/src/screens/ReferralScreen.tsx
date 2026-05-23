import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Share, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { colors, shadows } from '../theme';

export default function ReferralScreen() {
  const { profile } = useAuthStore();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, totalNrt: 0 });
  const [loading, setLoading] = useState(true);

  const referralCode = profile?.referral_code || profile?.id?.substring(0, 8) || 'NRTXXX';
  const referralLink = `https://netreward.online/auth?ref=${referralCode}`;

  useEffect(() => {
    if (profile?.id) fetchReferrals();
  }, [profile?.id]);

  const fetchReferrals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('referrals')
      .select('*, referred_user:referred_id(display_name, email, created_at)')
      .eq('referrer_id', profile!.id)
      .order('created_at', { ascending: false });
    const refs = data || [];
    setReferrals(refs);

    // Get referral rewards
    const { data: rewards } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', profile!.id)
      .eq('tx_type', 'referral_bonus');
    const totalNrt = (rewards || []).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    setStats({
      total: refs.length,
      active: refs.filter(r => r.status === 'active').length,
      totalNrt,
    });
    setLoading(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join NetReward and earn NRT tokens from your internet usage! Use my code: ${referralCode}\n\n${referralLink}`,
      });
    } catch (e) {}
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralLink);
    Alert.alert('Copied!', 'Referral link copied to clipboard');
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.title}>Referrals</Text>
      <Text style={s.subtitle}>Invite friends and earn NRT rewards</Text>

      {/* Referral Code Card */}
      <View style={[s.codeCard, shadows.accent]}>
        <Text style={s.codeLabel}>YOUR REFERRAL CODE</Text>
        <Text style={s.codeValue}>{referralCode}</Text>
        <Text style={s.codeLink} numberOfLines={1}>{referralLink}</Text>

        <View style={s.codeActions}>
          <Pressable style={s.copyButton} onPress={handleCopy}>
            <Text style={s.copyButtonText}>📋 Copy Link</Text>
          </Pressable>
          <Pressable style={s.shareButton} onPress={handleShare}>
            <Text style={s.shareButtonText}>📤 Share</Text>
          </Pressable>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={{ fontSize: 18 }}>👥</Text>
          <Text style={s.statLabel}>Total Referrals</Text>
          <Text style={s.statValue}>{stats.total}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={{ fontSize: 18 }}>✅</Text>
          <Text style={s.statLabel}>Active</Text>
          <Text style={[s.statValue, { color: '#10b981' }]}>{stats.active}</Text>
        </View>
        <View style={s.statCard}>
          <Text style={{ fontSize: 18 }}>💰</Text>
          <Text style={s.statLabel}>NRT Earned</Text>
          <Text style={[s.statValue, { color: colors.accentPrimary }]}>{stats.totalNrt.toFixed(2)}</Text>
        </View>
      </View>

      {/* Rewards Info */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>How It Works</Text>
        {[
          { step: '1', text: 'Share your referral link with friends' },
          { step: '2', text: 'They sign up and start tracking data' },
          { step: '3', text: 'You both earn NRT bonus rewards' },
        ].map((item, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepNumber}>
              <Text style={s.stepNumberText}>{item.step}</Text>
            </View>
            <Text style={s.stepText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Referral History */}
      <Text style={[s.sectionLabel, { marginTop: 20 }]}>REFERRAL HISTORY</Text>
      {loading ? (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: 20 }} />
      ) : referrals.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 32 }}>🔗</Text>
          <Text style={s.emptyTitle}>No referrals yet</Text>
          <Text style={s.emptyDesc}>Share your link to start earning</Text>
        </View>
      ) : (
        referrals.map(ref => (
          <View key={ref.id} style={s.referralRow}>
            <View style={s.refAvatar}>
              <Text style={s.refAvatarText}>{(ref.referred_user?.display_name || 'U')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.refName}>{ref.referred_user?.display_name || ref.referred_user?.email || 'User'}</Text>
              <Text style={s.refDate}>Joined {new Date(ref.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: ref.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }]}>
              <Text style={[s.statusBadgeText, { color: ref.status === 'active' ? '#10b981' : '#f59e0b' }]}>
                {(ref.status || 'pending').toUpperCase()}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },

  codeCard: { backgroundColor: '#1a1a32', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderRadius: 18, padding: 20, gap: 8, marginBottom: 16 },
  codeLabel: { fontSize: 9, fontWeight: '900', color: colors.textSecondary, letterSpacing: 1 },
  codeValue: { fontSize: 28, fontWeight: '900', color: colors.accentPrimary, letterSpacing: 2 },
  codeLink: { fontSize: 11, color: colors.textTertiary },
  codeActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  copyButton: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  copyButtonText: { fontSize: 12, fontWeight: '800', color: colors.textPrimary },
  shareButton: { flex: 1, backgroundColor: colors.accentPrimary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  shareButtonText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 12, gap: 4, alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },

  infoCard: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16, gap: 12 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontSize: 12, fontWeight: '900', color: colors.accentPrimary },
  stepText: { fontSize: 13, color: colors.textSecondary, flex: 1 },

  sectionLabel: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 10 },

  emptyState: { alignItems: 'center', paddingVertical: 32, backgroundColor: colors.bgSecondary, borderRadius: 16 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 8 },
  emptyDesc: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },

  referralRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  refAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(99,102,241,0.12)', alignItems: 'center', justifyContent: 'center' },
  refAvatarText: { fontSize: 14, fontWeight: '900', color: colors.accentPrimary },
  refName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  refDate: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
});
