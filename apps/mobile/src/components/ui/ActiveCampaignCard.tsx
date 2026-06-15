import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, Linking, ActivityIndicator, Alert } from 'react-native';
import { useThemeColors } from '@/theme';
import { GAMING_PLATFORMS, type GamingPlatform } from '@/hooks/useGamingAccounts';
import NrtAmount from './NrtAmount';
import PulseDot from './PulseDot';
import { MinusCircle, TrendingUp, ChevronRight } from 'lucide-react-native';

interface ActiveCampaignCardProps {
  campaign: any;
  enrollment: any;
  isRecent: boolean;
  onPress: () => void;
  onLeave?: () => void;
  isLeaving?: boolean;
  hideActions?: boolean;
}

export default function ActiveCampaignCard({ campaign, enrollment, isRecent, onPress, onLeave, isLeaving, hideActions = false }: ActiveCampaignCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const budgetPct = Math.min((campaign?.budget_spent / (campaign?.total_budget || 1)) * 100, 100);

  const platformButtons = [
    { platform: 'steam', url: campaign?.steam_url, label: 'Steam' },
    { platform: 'playstation', url: campaign?.playstation_url, label: 'PSN' },
    { platform: 'xbox', url: campaign?.xbox_url, label: 'Xbox' },
    { platform: 'oculus_vr', url: campaign?.oculus_url, label: 'Oculus' },
    { platform: 'nintendo_switch', url: campaign?.nintendo_url, label: 'Switch' },
    { platform: 'android', url: campaign?.android_url, label: 'Android' },
    { platform: 'ios', url: campaign?.ios_url, label: 'iOS' },
    { platform: 'web', url: campaign?.web_url, label: 'Web' }
  ].filter(p => !!p.url);

  return (
    <View style={styles.campaignCard}>
      {/* Top Part: Pressable to view details */}
      <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 12 }}>
        {/* Logo */}
        <View style={{ position: 'relative' }}>
          <View style={styles.campLogo}>
            {campaign?.logo_url ? (
              <Image
                source={{ uri: campaign.logo_url }}
                style={{ width: '100%', height: '100%', borderRadius: 10 }}
              />
            ) : (
              <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 20 }}>
                {campaign?.title?.[0] || '?'}
              </Text>
            )}
          </View>
          {campaign?.creator_logo && campaign.creator_logo !== campaign.logo_url && (
            <View style={{ position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.bgPrimary, backgroundColor: colors.bgSecondary, overflow: 'hidden' }}>
              <Image source={{ uri: campaign.creator_logo }} style={{ width: '100%', height: '100%' }} />
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.campTitle} numberOfLines={1}>{campaign?.title || 'Campaign'}</Text>
                {isRecent && <PulseDot size={7} />}
              </View>
              <Text style={styles.campDesc} numberOfLines={1}>
                {campaign?.creator_name || 'NetReward'} • {campaign?.category || 'General'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.campConsumed}>{Number(enrollment?.data_consumed_gb || 0).toFixed(6)} GB</Text>
              <Text style={styles.campConsumedLabel}>CONSUMED</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <View style={styles.campProgressBar}>
              <View style={[styles.campProgressFill, { width: `${budgetPct}%` }]} />
            </View>
            <NrtAmount value={(enrollment?.nrt_earned || 0) + (enrollment?.unclaimed_nrt || 0)} showSign style={styles.campNrt} />
          </View>
        </View>
      </Pressable>

      {/* Platform buttons (Launch row) */}
      {!hideActions && platformButtons.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.glassBorder + '20', paddingTop: 8 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginRight: 2 }}>Launch:</Text>
          {platformButtons.map(p => {
            const isWeb = p.platform === 'web';
            const brandColor = isWeb ? colors.accentPrimary : (GAMING_PLATFORMS[p.platform as GamingPlatform]?.color || '#a2aaad');
            return (
              <Pressable
                key={p.platform}
                style={({ pressed }) => [
                  styles.platformLaunchBtn,
                  { backgroundColor: brandColor, opacity: pressed ? 0.8 : 1 }
                ]}
                onPress={() => {
                  if (['playstation', 'xbox', 'nintendo_switch', 'oculus_vr'].includes(p.platform)) {
                    Alert.alert(
                      `Play on ${p.label}`,
                      `Turn on your ${p.label} and launch ${campaign?.title}. Rest assured, your telemetry tracking is actively capturing data and you will be rewarded with NRT!`
                    );
                  } else {
                    if (p.url) {
                      Linking.openURL(p.url).catch((err) => {
                        console.error("Failed to open platform URL:", err);
                      });
                    }
                  }
                }}
              >
                <Text style={styles.platformLaunchBtnText}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* View Earnings + Unjoin row (Bottom Actions) */}
      {!hideActions && onLeave && (
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.viewEarningsBtn,
              { opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={onPress}
          >
            <TrendingUp size={12} color={colors.accentPrimary} style={{ marginRight: 6 }} />
            <Text style={styles.viewEarningsBtnText}>View Earnings</Text>
            <ChevronRight size={12} color={colors.accentPrimary} style={{ marginLeft: 2 }} />
          </Pressable>

          <Pressable
            disabled={isLeaving}
            style={({ pressed }) => [
              styles.unjoinBtn,
              { opacity: pressed || isLeaving ? 0.6 : 1 }
            ]}
            onPress={onLeave}
          >
            {isLeaving ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <MinusCircle size={14} color="#ef4444" />
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  campaignCard: { backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12 },
  campLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder },
  campTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  campDesc: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  campConsumed: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },
  campConsumedLabel: { fontSize: 8, color: colors.textSecondary, fontWeight: 'bold', marginTop: 2 },
  campProgressBar: { flex: 1, height: 6, backgroundColor: colors.bgPrimary, borderRadius: 3, marginRight: 16, overflow: 'hidden' },
  campProgressFill: { height: '100%', backgroundColor: colors.accentPrimary, borderRadius: 3 },
  campNrt: { fontSize: 10, fontWeight: '900', color: colors.accentPrimary },
  platformLaunchBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  platformLaunchBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.glassBorder + '20', paddingTop: 12 },
  viewEarningsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  viewEarningsBtnText: { color: colors.accentPrimary, fontSize: 12, fontWeight: 'bold' },
  unjoinBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', justifyContent: 'center' },
});
