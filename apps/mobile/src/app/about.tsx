import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';;
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck, Globe, Zap, Lock, Gift, Star, Cpu } from 'lucide-react-native';
import { useThemeColors } from '@/theme';

const SECTIONS = [
  {
    title: "The Ecosystem",
    icon: Globe,
    iconColor: '#3b82f6', // blue-500
    content: "NetReward NRT creates a revolutionary cyclical economy where Standard Users, Service Providers (SPs), and Internet Service Providers (ISPs) interact in a transparent, rewarding loop. Users earn for their data, SPs acquire highly targeted engagement, and ISPs monetize their network quality—all governed by smart contracts on the blockchain."
  },
  {
    title: "Trust & Security First",
    icon: ShieldCheck,
    iconColor: '#22c55e', // green-500
    content: "Security is built into our core. All biometric and PIN data is encrypted and stored locally on your device. We use industry-standard decentralized protocols ensuring your data remains private and your wallet assets are fully under your control."
  },
  {
    title: "Zero-Loss Payment for SPs",
    icon: Lock,
    iconColor: '#f97316', // orange-500
    content: "Service Providers never lose payments due to privacy concerns. Our Web3 payment infrastructure guarantees swift, secure, and verifiable transactions, ensuring that SP platforms receive exact settlements without the risk of traditional chargebacks."
  },
  {
    title: "Innovation & Technology",
    icon: Cpu,
    iconColor: '#a855f7', // purple-500
    content: "Powered by edge computing and real-time telemetry pipelines, NetReward accurately measures data consumption and engagement. This innovative tracking guarantees fair rewards while maintaining an incredibly low latency footprint across all networks."
  },
  {
    title: "A Rewarding Data Experience",
    icon: Gift,
    iconColor: '#059669', // accent-primary
    content: "You are the owner of your data. The NetReward ecosystem directly rewards you with NRT tokens for your active participation. Trade, hold, or utilize NRT for premium services within the platform."
  }
];

export default function AboutScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>About NetReward NRT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.logoWrapper}>
            <Zap size={40} color={colors.accentPrimary} />
          </View>
          <Text style={styles.heroTitle}>NetReward</Text>
          <Text style={styles.heroSubtitle}>
            Empowering the next generation of data monetization through transparent, secure, and rewarding web3 technology.
          </Text>
        </View>

        {/* Sections */}
        <View style={styles.sectionsContainer}>
          {SECTIONS.map((section, idx) => {
            const Icon = section.icon;
            return (
              <View key={idx} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrapper}>
                    <Icon size={24} color={section.iconColor} />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.sectionContent}>{section.content}</Text>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.versionBadge}>
            <Star size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
          <Text style={styles.copyrightText}>© 2026 NetReward. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  
  container: { flex: 1, padding: 20 },
  
  heroCard: { backgroundColor: colors.bgSecondary, borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(5, 150, 105, 0.2)', marginBottom: 24 },
  logoWrapper: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder, shadowColor: colors.accentPrimary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: colors.textPrimary, marginBottom: 12 },
  heroSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  sectionsContainer: { gap: 16 },
  sectionCard: { backgroundColor: colors.bgSecondary, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.glassBorder },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  sectionIconWrapper: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, flex: 1 },
  sectionContent: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

  footer: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  versionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 16 },
  versionText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
  copyrightText: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 },
});
