import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Users, Zap, ShieldCheck, Wallet } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';

export default function DepositHubScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const methods = [
    {
      id: 'p2p',
      to: '/wallet/deposit/p2p',
      icon: Users,
      iconColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.1)',
      title: 'P2P',
      subtitle: 'Buy directly from other users',
      badge: 'Best Rate',
      badgeColor: 'rgba(59, 130, 246, 0.1)',
      badgeTextColor: '#3b82f6',
    },
    {
      id: 'instant',
      to: '/wallet/deposit/instant',
      icon: Zap,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.1)',
      title: 'Instant Purchase',
      subtitle: 'Quick buy at platform rate',
      badge: 'Fastest',
      badgeColor: 'rgba(245, 158, 11, 0.1)',
      badgeTextColor: '#f59e0b',
    },
    {
      id: 'exchanger',
      to: '/wallet/deposit/exchanger',
      icon: ShieldCheck,
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.1)',
      title: 'Verified Exchanger',
      subtitle: 'Buy via trusted exchange platforms',
      badge: 'Trusted',
      badgeColor: 'rgba(16, 185, 129, 0.1)',
      badgeTextColor: '#10b981',
    },
    {
      id: 'address',
      to: '/wallet/deposit/address',
      icon: Wallet,
      iconColor: '#8b5cf6',
      iconBg: 'rgba(139, 92, 246, 0.1)',
      title: 'My NRT Wallet',
      subtitle: 'Receive NRT to your unique address',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Buy NRT</Text>
          <Text style={styles.headerSubtitle}>Method to purchase for your local currency</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
        
        <View style={styles.methodsContainer}>
          {methods.map((method) => {
            const Icon = method.icon;
            return (
              <Pressable
                key={method.id}
                style={styles.methodCard}
                onPress={() => router.push(method.to as any)}
              >
                <View style={[styles.methodIconWrapper, { backgroundColor: method.iconBg }]}>
                  <Icon size={24} color={method.iconColor} />
                </View>
                <View style={styles.methodDetails}>
                  <View style={styles.methodTitleRow}>
                    <Text style={styles.methodTitle}>{method.title}</Text>
                    {method.badge && (
                      <View style={[styles.badge, { backgroundColor: method.badgeColor }]}>
                        <Text style={[styles.badgeText, { color: method.badgeTextColor }]}>{method.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            <Text style={styles.noticeBold}>Important: </Text>
            All purchases are subject to network fees. NRT will be credited to your wallet within the timeframe specified by your chosen method.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  
  container: { flex: 1, paddingHorizontal: 20 },
  
  methodsContainer: { gap: 12, marginBottom: 24 },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
  methodIconWrapper: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  methodDetails: { flex: 1, marginRight: 12 },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  methodTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  methodSubtitle: { fontSize: 12, color: colors.textSecondary },
  
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },

  noticeBox: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
  noticeText: { fontSize: 12, color: colors.textSecondary, lineHeight: 20 },
  noticeBold: { fontWeight: 'bold', color: colors.textPrimary },
});
