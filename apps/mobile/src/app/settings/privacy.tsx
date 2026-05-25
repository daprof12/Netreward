import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Modal, SafeAreaView as RNSafeAreaView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck, Activity, Database, AlertCircle, X } from 'lucide-react-native';
import { useThemeColors } from '@/theme';

export default function PrivacyScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const [dataTrackingEnabled, setDataTrackingEnabled] = useState(true);
  
  const [showDoc, setShowDoc] = useState<'terms' | 'privacy' | null>(null);

  const renderDocModal = () => (
    <Modal visible={!!showDoc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDoc(null)}>
      <RNSafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{showDoc === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Text>
          <Pressable onPress={() => setShowDoc(null)} style={styles.modalCloseBtn}>
            <X size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.docText}>
            {showDoc === 'terms' ? (
              `NetReward Terms of Service\n\nLast Updated: May 2026\n\n1. Acceptance of Terms\nBy accessing and using the NetReward application, you accept and agree to be bound by the terms and provision of this agreement.\n\n2. User Accounts\nTo use certain features, you must register for an account. You agree to provide accurate information and keep it updated.\n\n3. NRT Rewards\nNRT tokens are rewarded based on data sharing and campaign participation. NetReward reserves the right to adjust reward rates at any time.\n\n4. Prohibited Activities\nYou agree not to engage in any automated farming, exploitation of campaigns, or generation of fake data to earn rewards.`
            ) : (
              `NetReward Privacy Policy\n\nLast Updated: May 2026\n\n1. Data Collection\nWe collect information you provide directly, such as your profile details. We also collect background data usage statistics to calculate rewards.\n\n2. Use of Information\nYour data is used to provide, maintain, and improve our services, process transactions, and send related information.\n\n3. Data Sharing\nWe do not sell your personal data. Aggregated, anonymized data may be shared with ISP/SP partners for campaign analytics.\n\n4. Security\nWe implement security measures to protect your information, including end-to-end encryption for sensitive data like biometric keys.`
            )}
          </Text>
        </ScrollView>
      </RNSafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <ShieldCheck size={32} color={colors.accentPrimary} />
          </View>
          <Text style={styles.heroTitle}>Data & Privacy</Text>
          <Text style={styles.heroDesc}>Review our terms and manage how your data is tracked for campaign rewards.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Tracking Consent</Text>
          
          <View style={styles.infoRow}>
            <Activity size={20} color="#3b82f6" style={{ marginTop: 2 }} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Foreground & Background Tracking</Text>
              <Text style={styles.infoDesc}>By default, our app tracks and monitors background and foreground data usage using the system's inbuilt data consumption reports to accurately calculate your NRT rewards.</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Allow Data Tracking</Text>
              {!dataTrackingEnabled && (
                <View style={styles.warningRow}>
                  <AlertCircle size={12} color="#ef4444" />
                  <Text style={styles.warningText}>Earnings paused while disabled</Text>
                </View>
              )}
            </View>
            <Switch
              value={dataTrackingEnabled}
              onValueChange={setDataTrackingEnabled}
              trackColor={{ false: colors.bgPrimary, true: colors.accentPrimary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.linksContainer}>
          <Pressable style={styles.linkBtn} onPress={() => setShowDoc('terms')}>
            <View style={styles.linkLeft}>
              <Database size={20} color={colors.textSecondary} />
              <Text style={styles.linkText}>Terms of Service</Text>
            </View>
            <ChevronLeft size={20} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }], opacity: 0.5 }} />
          </Pressable>

          <Pressable style={[styles.linkBtn, { marginTop: 12 }]} onPress={() => setShowDoc('privacy')}>
            <View style={styles.linkLeft}>
              <ShieldCheck size={20} color={colors.textSecondary} />
              <Text style={styles.linkText}>Full Privacy Policy</Text>
            </View>
            <ChevronLeft size={20} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }], opacity: 0.5 }} />
          </Pressable>
        </View>
      </ScrollView>

      {renderDocModal()}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  content: { padding: 16, paddingBottom: 40 },

  hero: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  heroDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 300, lineHeight: 22 },

  card: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.glassBorder, paddingBottom: 12, marginBottom: 16 },
  
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  infoDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 16 },
  toggleTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  warningText: { fontSize: 10, color: '#ef4444' },

  linksContainer: {},
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkText: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },

  modalContainer: { flex: 1, backgroundColor: colors.bgPrimary },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  modalContent: { padding: 20 },
  docText: { fontSize: 14, color: colors.textSecondary, lineHeight: 24 },
});
