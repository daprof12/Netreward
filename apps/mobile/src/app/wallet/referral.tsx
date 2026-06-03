import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';;
import { useRouter } from 'expo-router';
import { ChevronLeft, Gift, Users, TrendingUp, Copy, Check, Share2, ShieldCheck, Zap, Inbox } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useReferrals } from '@/hooks/useReferrals';
import { useThemeColors } from '@/theme';
import { formatNrtText } from '@/lib/formatNrt';
import NrtAmount from '@/components/ui/NrtAmount';

export default function ReferralScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { referrals, referralCode, isLoading, totalReferred, totalEarned, pendingRewards, bonusNrt, condition } = useReferrals();
  const [copied, setCopied] = useState(false);

  const referralLink = `https://netreward.online/join?ref=${referralCode}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: `Join NetReward and earn NRT rewards! Use my referral code: ${referralCode}\n${referralLink}`,
        url: referralLink, // iOS specific
        title: 'Join NetReward' // Android specific
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Referral Program</Text>
          <Text style={styles.headerSubtitle}>Earn NRT for every friend you invite</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Hero Card */}
        <LinearGradient
          colors={['#f59e0b', '#d97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroBgIcon}>
            <Gift size={200} color="rgba(255,255,255,0.08)" strokeWidth={1.5} />
          </View>
          <View style={styles.heroIconWrapper}>
            <Gift size={40} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Earn {bonusNrt} NRT</Text>
          <Text style={styles.heroSubtitle}>for every friend who joins and earns their first reward</Text>
          <View style={styles.conditionBadge}>
            {condition === 'first_reward' ? (
              <>
                <ShieldCheck size={12} color="#fff" />
                <Text style={styles.conditionText}>FIRST REWARD CONDITION</Text>
              </>
            ) : (
              <>
                <Zap size={12} color="#fff" />
                <Text style={styles.conditionText}>INSTANT ON SIGNUP</Text>
              </>
            )}
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users size={20} color="#3b82f6" style={styles.statIcon} />
            <Text style={styles.statLabel}>Referred</Text>
            <Text style={styles.statValue}>{totalReferred}</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={20} color={colors.accentPrimary} style={styles.statIcon} />
            <Text style={styles.statLabel}>Earned</Text>
            <NrtAmount value={totalEarned} style={styles.statValue} unitStyle={styles.statUnit} />
          </View>
          <View style={styles.statCard}>
            <Gift size={20} color="#f59e0b" style={styles.statIcon} />
            <Text style={styles.statLabel}>Pending</Text>
            <NrtAmount value={pendingRewards} style={styles.statValue} unitStyle={styles.statUnit} />
          </View>
        </View>

        {/* Referral Link Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Referral Code</Text>
          <View style={styles.linkCard}>
            <Text style={styles.referralCodeText}>{referralCode}</Text>

            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">{referralLink}</Text>
              <Pressable onPress={handleCopy} style={styles.iconCopyBtn}>
                {copied ? <Check size={16} color={colors.success} /> : <Copy size={16} color={colors.textSecondary} />}
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.copyBtn} onPress={handleCopy}>
                {copied ? (
                  <>
                    <Check size={16} color={colors.success} />
                    <Text style={[styles.actionBtnText, { color: colors.success }]}>Copied!</Text>
                  </>
                ) : (
                  <>
                    <Copy size={16} color={colors.textPrimary} />
                    <Text style={styles.actionBtnText}>Copy Link</Text>
                  </>
                )}
              </Pressable>
              <Pressable style={styles.inviteBtn} onPress={handleInvite}>
                <Share2 size={16} color="#fff" />
                <Text style={styles.inviteBtnText}>Invite Friends</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>Share your unique referral code or link with friends</Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>
                {condition === 'first_reward'
                  ? 'Friend signs up and earns their first NRT reward'
                  : 'Friend signs up using your referral link or code'}
              </Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepText}>You receive {bonusNrt} NRT instantly in your wallet</Text>
            </View>
          </View>
        </View>

        {/* Referred Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referred Users</Text>
          <View style={styles.referredList}>
            {referrals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Inbox size={40} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No referrals yet</Text>
                <Text style={styles.emptyText}>Share your code to start earning!</Text>
              </View>
            ) : (
              referrals.map((ref: any, idx) => {
                const name = ref.referred_user?.display_name || ref.referred_user?.email?.split('@')[0] || 'User';
                return (
                  <View key={ref.id || idx} style={styles.referredUserCard}>
                    <View style={styles.referredUserIconWrapper}>
                      <Text style={styles.referredUserInitials}>{name[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.referredUserDetails}>
                      <Text style={styles.referredUserName}>{name}</Text>
                      <Text style={styles.referredUserDate}>
                        {new Date(ref.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.referredUserRight}>
                      <NrtAmount value={ref.reward_nrt} showSign style={styles.referredUserAmount} />
                      <View style={[styles.statusBadge, { backgroundColor: ref.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: ref.status === 'active' ? colors.success : colors.warning }]}>
                          {ref.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },

  container: { flex: 1, paddingHorizontal: 20 },

  heroCard: { borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 24, overflow: 'hidden', position: 'relative', shadowColor: '#d97706', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  heroBgIcon: { position: 'absolute', right: -40, top: -10 },
  heroIconWrapper: { marginBottom: 16 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 },
  conditionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  conditionText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  statIcon: { marginBottom: 8 },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '900', color: colors.textPrimary },
  statUnit: { fontSize: 10, color: colors.textSecondary },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 12 },

  linkCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.glassBorder },
  referralCodeText: { fontSize: 32, fontWeight: '900', color: colors.accentPrimary, textAlign: 'center', letterSpacing: 2, marginBottom: 20 },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  linkText: { flex: 1, fontSize: 12, fontFamily: 'monospace', color: colors.textSecondary, marginRight: 12 },
  iconCopyBtn: { padding: 4 },
  actionRow: { flexDirection: 'row', gap: 12 },
  copyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: colors.bgPrimary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder },
  actionBtnText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  inviteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: colors.accentPrimary, borderRadius: 16, shadowColor: colors.accentPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  inviteBtnText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },

  stepsContainer: { gap: 12 },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
  stepNumberBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  stepText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  referredList: { backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, marginBottom: 4 },
  emptyText: { fontSize: 12, color: colors.textSecondary },
  referredUserCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  referredUserIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(5, 150, 105, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  referredUserInitials: { fontSize: 14, fontWeight: 'bold', color: colors.accentPrimary },
  referredUserDetails: { flex: 1 },
  referredUserName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  referredUserDate: { fontSize: 11, color: colors.textSecondary },
  referredUserRight: { alignItems: 'flex-end' },
  referredUserAmount: { fontSize: 14, fontWeight: 'bold', color: colors.accentPrimary, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
});
