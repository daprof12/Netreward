import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Fingerprint, KeyRound, ShieldCheck } from 'lucide-react-native';

import { useThemeColors } from '@/theme';
import { useSecurityStore } from '@/stores/useSecurityStore';
import BottomSheet from '@/components/ui/BottomSheet';

export default function SecurityScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { 
    biometricsEnabled, 
    isBiometricSetup, 
    setBiometricsEnabled,
    pin
  } = useSecurityStore();

  const [showSetupModal, setShowSetupModal] = useState(false);

  const handleToggleBiometrics = () => {
    if (!biometricsEnabled && !isBiometricSetup) {
      setShowSetupModal(true);
    } else {
      setBiometricsEnabled(!biometricsEnabled);
    }
  };

  const handleEnableBiometrics = () => {
    setBiometricsEnabled(true);
    useSecurityStore.setState({ isBiometricSetup: true });
    setShowSetupModal(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Security & 2FA</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={[styles.row, styles.borderBottom]}>
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Fingerprint size={24} color={colors.accentPrimary} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Biometric Login</Text>
                <Text style={styles.rowDesc}>Use Face ID or Touch ID</Text>
              </View>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: colors.bgPrimary, true: colors.accentPrimary }}
              thumbColor="#fff"
            />
          </View>

          <Pressable 
            style={styles.row}
            onPress={() => router.push('/settings/pin')}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                <KeyRound size={24} color="#f97316" />
              </View>
              <View>
                <Text style={styles.rowTitle}>Transaction PIN</Text>
                <Text style={styles.rowDesc}>{pin ? 'Change your 4-digit PIN' : 'Set a 4-digit PIN'}</Text>
              </View>
            </View>
            <View style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>{pin ? 'Change' : 'Set PIN'}</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoIcon}>
            <ShieldCheck size={24} color="#22c55e" />
          </View>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Account Secured. </Text>
            We use industry standard encryption and on-device biometric storage to protect your assets and private keys.
          </Text>
        </View>
      </View>

      <BottomSheet visible={showSetupModal} onClose={() => setShowSetupModal(false)} title="Setup Biometrics">
        <View style={styles.sheetContent}>
          <View style={styles.sheetIconWrapper}>
            <Fingerprint size={48} color={colors.accentPrimary} />
          </View>
          <Text style={styles.sheetTitle}>Enable Biometric Login</Text>
          <Text style={styles.sheetDesc}>
            Use your device's native biometric authentication (Face ID or Touch ID) to securely and quickly access your account without entering a password.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={handleEnableBiometrics}>
            <Text style={styles.primaryBtnText}>Enable Biometrics</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  content: { padding: 16, flex: 1 },
  
  card: { backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  rowDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  actionBtn: { backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  actionBtnText: { color: colors.accentPrimary, fontSize: 12, fontWeight: 'bold' },

  infoBox: { flexDirection: 'row', gap: 16, backgroundColor: 'rgba(34, 197, 94, 0.05)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(34, 197, 94, 0.1)', alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

  sheetContent: { paddingBottom: 24, alignItems: 'center' },
  sheetIconWrapper: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  sheetDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  primaryBtn: { width: '100%', backgroundColor: colors.accentPrimary, padding: 16, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
