import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Image, ActivityIndicator } from 'react-native';
import { useThemeColors } from '@/theme';
import { X, Globe, Wifi, MapPin, ArrowDownToLine, Clock, CheckCircle2 } from 'lucide-react-native';
import { formatNrtText } from '@/lib/formatNrt';
import NrtAmount from './ui/NrtAmount';
import PulseDot from './ui/PulseDot';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface EarningsDetailModalProps {
  earningCampaign: any;
  onClose: () => void;
  enrollment: any;
  durationSecs: number;
  handleClaim: () => void;
  isClaiming: boolean;
  isRecent?: boolean;
}

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

export default function EarningsDetailModal({ 
  earningCampaign, 
  onClose, 
  enrollment, 
  durationSecs, 
  handleClaim, 
  isClaiming,
  isRecent = false
}: EarningsDetailModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { signalPercentage } = useNetworkStatus();
  const strength = signalPercentage
    ? (signalPercentage > 75 ? 4 : signalPercentage > 50 ? 3 : signalPercentage > 25 ? 2 : 1)
    : 4;

  if (!earningCampaign) return null;

  const totalData = enrollment?.data_consumed_gb || 0;
  const nrtEarned = (enrollment?.nrt_earned || 0) + (enrollment?.unclaimed_nrt || 0);

  const durationFormatted =
    durationSecs >= 3600
      ? `${(durationSecs / 3600).toFixed(1)} hrs`
      : durationSecs >= 60
      ? `${Math.floor(durationSecs / 60)} min ${durationSecs % 60}s`
      : `${durationSecs}s`;

  return (
    <Modal visible={!!earningCampaign} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.sheetHandle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Earnings Detail</Text>
              <Pressable onPress={onClose} style={styles.sheetClose}>
                <X size={16} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.sheetBody}>
              {/* App identity */}
              <View style={styles.sheetCard}>
                <View style={styles.sheetIdentityRow}>
                  <View style={styles.sheetLogoBox}>
                    {earningCampaign.logo_url ? (
                      <Image source={{ uri: earningCampaign.logo_url }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                    ) : (
                      <Text style={styles.sheetLogoText}>
                        {earningCampaign.target_app?.[0] || earningCampaign.title?.[0] || '?'}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetAppName}>{earningCampaign.target_app || earningCampaign.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Globe size={10} color={colors.accentPrimary} />
                      <Text style={styles.sheetAppCat}>{earningCampaign.category || 'General'}</Text>
                    </View>
                  </View>
                  <View style={styles.sheetActiveBadge}>
                    {isRecent && <PulseDot size={6} />}
                    <Text style={styles.sheetActiveBadgeText}>active</Text>
                  </View>
                </View>

                <Text style={styles.sheetDesc}>
                  You are earning rewards by using {earningCampaign.target_app || earningCampaign.title}. Keep the app open to maximize your earnings.
                </Text>

                {/* Tracking + signal */}
                <View style={styles.sheetTrackingRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Wifi size={12} color={colors.accentPrimary} />
                    <Text style={styles.sheetTrackingText}>Tracking Active</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.sheetTrackingText}>Signal</Text>
                    <SignalBars strength={strength} />
                  </View>
                </View>

                {/* Target regions */}
                {earningCampaign.target_locations?.length > 0 && (
                  <View style={styles.sheetLocations}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                      <MapPin size={10} color={colors.textSecondary} />
                      <Text style={styles.sheetLocationsLabel}>TARGET REGIONS</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {earningCampaign.target_locations.map((loc: any, idx: number) => (
                        <View key={idx} style={styles.sheetLocChip}>
                          <Text style={styles.sheetLocChipText}>
                            {loc.name?.split(',')[0]}
                            <Text style={{ color: colors.accentPrimary }}> ({loc.radiusKm}km)</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Data & Duration */}
                <View style={styles.sheetDataRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ArrowDownToLine size={12} color={colors.accentPrimary} />
                    <Text style={styles.sheetDataText}>
                      Total Data Tracked: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{Number(totalData).toFixed(6)} GB</Text>
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={12} color={colors.accentPrimary} />
                    <Text style={styles.sheetDataText}>
                      Duration: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{durationFormatted}</Text>
                    </Text>
                  </View>
                </View>

                {/* Totals */}
                <View style={styles.sheetTotalsRow}>
                  <View>
                    <Text style={styles.sheetTotalsLabel}>TOTAL DATA</Text>
                    <Text style={styles.sheetTotalsValue}>{Number(totalData).toFixed(6)} GB</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.sheetTotalsLabel}>NRT EARNED</Text>
                    <NrtAmount 
                      value={nrtEarned} 
                      style={[styles.sheetTotalsValue, { color: colors.accentPrimary }]} 
                    />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.sheetTotalsLabel}>RATE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <NrtAmount value={earningCampaign.reward_rate_per_gb} style={styles.sheetTotalsValue} hideUnit />
                      <Text style={[styles.sheetTotalsValue, { fontSize: 12, opacity: 0.7, marginLeft: 4 }]}>NRT/GB</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Pinned bottom actions */}
          <View style={styles.sheetFooter}>
            <Pressable style={styles.sheetCloseBtn} onPress={onClose}>
              <Text style={styles.sheetCloseBtnText}>Close</Text>
            </Pressable>
            <Pressable
              style={[styles.sheetClaimBtn, (!isClaiming && (enrollment?.unclaimed_nrt || 0) <= 0) && { opacity: 0.4 }]}
              onPress={handleClaim}
              disabled={isClaiming || (enrollment?.unclaimed_nrt || 0) <= 0}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color={colors.bgPrimary} />
              ) : (
                <CheckCircle2 size={16} color={colors.bgPrimary} />
              )}
              <Text style={styles.sheetClaimBtnText}>Claim Rewards</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
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
