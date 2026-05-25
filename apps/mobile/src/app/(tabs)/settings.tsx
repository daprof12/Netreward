import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User, ShieldCheck, Lock, UserCog, Gamepad2, History, FileText, Gift,
  Banknote, Globe, Moon, Bell, CreditCard, Code, Info, HelpCircle,
  LogOut, ChevronRight, Check, AlertCircle, X, Loader2
} from 'lucide-react-native';

import { useThemeColors, shadows } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';
import { useThemeStore, type Theme } from '@/stores/useThemeStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useProfile } from '@/hooks/useProfile';
import { useGamingAccounts } from '@/hooks/useGamingAccounts';
import { supabase } from '@/lib/supabase';

import BottomSheet from '@/components/ui/BottomSheet';
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, role, setUser, signOut } = useAuthStore();
  const { profile, switchRole, isSwitchingRole } = useProfile();
  const { services, profileLogo: spLogo } = useSpStore();
  const { networks, profileLogo: ispLogo } = useIspStore();
  const { gamingAccounts } = useGamingAccounts();
  const { showToast } = useToastStore();

  const { selectedCurrency, setCurrency } = useCurrencyStore();
  const { theme, setTheme } = useThemeStore();
  const [language, setLanguage] = useState('English (US)');

  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'verified' | 'rejected'>('none');

  // Modal States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showThemeSheet, setShowThemeSheet] = useState(false);

  // Switch Account States
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<'select' | 'details'>('select');
  const [selectedUpgradeRole, setSelectedUpgradeRole] = useState<'user' | 'sp' | 'isp'>('sp');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('kyc_status')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.kyc_status) setKycStatus(data.kyc_status as any);
      });
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      setShowLogoutConfirm(false);
      await signOut();
      showToast('Logged out successfully', 'success');
      router.replace('/(auth)');
    } catch (error) {
      showToast('Error logging out', 'danger');
    }
  };

  const kycLabel = kycStatus === 'verified' ? '✓ Verified' : kycStatus === 'pending' ? 'Pending Review' : kycStatus === 'rejected' ? 'Rejected' : 'Unverified';
  const displayRole = role === 'admin' ? 'Super Admin' : role === 'isp' ? 'ISP Account' : role === 'sp' ? 'Service Provider' : 'Standard User';
  const avatarUrl = role === 'sp' ? spLogo : role === 'isp' ? ispLogo : profile?.avatar_url;

  const renderGroup = (title: string, items: any[]) => (
    <View style={styles.groupContainer}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>
        {items.map((item, index) => (
          <Pressable
            key={index}
            style={[styles.menuItem, index !== items.length - 1 && styles.menuItemBorder]}
            onPress={() => {
              if (item.onPress) item.onPress();
              else if (item.href) router.push(item.href);
            }}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconContainer}>
                <item.icon size={18} color={colors.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <View style={styles.menuRight}>
              {item.value && (
                <Text style={[styles.menuValue, item.highlight && { color: colors.accentPrimary, fontWeight: 'bold' }]}>
                  {item.value}
                </Text>
              )}
              <ChevronRight size={18} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Settings</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'D'}</Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{profile?.display_name || 'Demo User'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || 'demo@netreward.online'}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{displayRole}</Text>
          </View>
        </View>

        {/* Menu Groups */}
        {renderGroup('Account', [
          { icon: User, label: 'Profile', value: user?.email || 'demo@netreward.online', href: '/settings/profile' },
          { icon: ShieldCheck, label: 'KYC Verification', value: kycLabel, highlight: kycStatus !== 'verified', href: '/settings/kyc' },
          { icon: Lock, label: 'Security & 2FA', href: '/settings/security' },
          { icon: UserCog, label: 'Switch Account Type', onPress: () => { setUpgradeStep('select'); setShowUpgradeSheet(true); } },
          { icon: Gamepad2, label: 'Gaming Accounts', value: gamingAccounts.length > 0 ? `${gamingAccounts.length} Linked` : 'None', highlight: gamingAccounts.length === 0, href: '/settings/gaming' },
        ])}

        {renderGroup('Reports & Finances', [
          { icon: History, label: 'Transaction History', href: '/transactions' },
          { icon: FileText, label: 'Financial Reports', href: '/reports' },
          { icon: Gift, label: 'Referral Rewards', href: '/wallet/referral' },
        ])}

        {renderGroup('Preferences', [
          { icon: Banknote, label: 'Default Currency', value: selectedCurrency, onPress: () => setShowCurrencySheet(true) },
          { icon: Globe, label: 'Language', value: language, onPress: () => setShowLanguageSheet(true) },
          { icon: Moon, label: 'Theme', value: theme, onPress: () => setShowThemeSheet(true) },
          { icon: Bell, label: 'Notifications', value: 'Enabled', href: '/settings/notifications' },
        ])}

        {role === 'sp' && renderGroup('API & Integrations', [
          { icon: CreditCard, label: 'Payment API', value: services.length > 0 ? `${services.length} Ready` : 'No Services', highlight: services.length === 0, onPress: () => showToast('Payment UI coming soon', 'warning') },
          { icon: Code, label: 'Service API', value: `${services.length} Integrated`, onPress: () => showToast('Service UI coming soon', 'warning') },
        ])}

        {role === 'isp' && renderGroup('API & Integrations', [
          { icon: Code, label: 'Network API', value: `${networks.length} Integrated`, onPress: () => showToast('Network UI coming soon', 'warning') },
        ])}

        {renderGroup('Support & About', [
          { icon: Info, label: 'About NetReward NRT', href: '/about' },
          { icon: HelpCircle, label: 'Support Center', href: '/support' },
          { icon: ShieldCheck, label: 'Privacy Policy', href: '/settings/privacy' },
        ])}

        {/* Logout Button */}
        <Pressable style={styles.logoutBtn} onPress={() => setShowLogoutConfirm(true)}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.versionText}>NetReward v1.0.0 (Build 2026.04)</Text>

      </ScrollView>

      {/* Sheets */}
      <BottomSheet visible={showCurrencySheet} onClose={() => setShowCurrencySheet(false)} title="Default Currency">
        {['USD ($)', 'EUR (€)', 'GBP (£)', 'NGN (₦)'].map(opt => (
          <Pressable key={opt} style={[styles.sheetOption, selectedCurrency === opt && styles.sheetOptionActive]} onPress={() => { setCurrency(opt); setShowCurrencySheet(false); }}>
            <Text style={[styles.sheetOptionText, selectedCurrency === opt && styles.sheetOptionTextActive]}>{opt}</Text>
            {selectedCurrency === opt && <Check size={18} color={colors.accentPrimary} />}
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={showLanguageSheet} onClose={() => setShowLanguageSheet(false)} title="Language">
        {['English (US)', 'English (UK)', 'Español', 'Français'].map(opt => (
          <Pressable key={opt} style={[styles.sheetOption, language === opt && styles.sheetOptionActive]} onPress={() => { setLanguage(opt); setShowLanguageSheet(false); }}>
            <Text style={[styles.sheetOptionText, language === opt && styles.sheetOptionTextActive]}>{opt}</Text>
            {language === opt && <Check size={18} color={colors.accentPrimary} />}
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={showThemeSheet} onClose={() => setShowThemeSheet(false)} title="Theme">
        {['System', 'Light', 'Dark'].map(opt => (
          <Pressable key={opt} style={[styles.sheetOption, theme === opt && styles.sheetOptionActive]} onPress={() => { setTheme(opt as Theme); setShowThemeSheet(false); }}>
            <Text style={[styles.sheetOptionText, theme === opt && styles.sheetOptionTextActive]}>{opt}</Text>
            {theme === opt && <Check size={18} color={colors.accentPrimary} />}
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={showUpgradeSheet} onClose={() => setShowUpgradeSheet(false)} title="Switch Account Type">
        {upgradeStep === 'select' ? (
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeDesc}>Select the account type you wish to switch to:</Text>

            <Pressable style={[styles.upgradeOption, selectedUpgradeRole === 'user' && styles.upgradeOptionActive]} onPress={() => setSelectedUpgradeRole('user')}>
              <View style={[styles.upgradeIconContainer, selectedUpgradeRole === 'user' && { backgroundColor: colors.accentPrimary }]}>
                <User size={20} color={selectedUpgradeRole === 'user' ? '#fff' : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeOptionTitle}>Standard User</Text>
                <Text style={styles.upgradeOptionDesc}>Basic earning & sharing</Text>
              </View>
              {selectedUpgradeRole === 'user' && <Check size={18} color={colors.accentPrimary} />}
            </Pressable>

            <Pressable style={[styles.upgradeOption, selectedUpgradeRole === 'sp' && styles.upgradeOptionActive]} onPress={() => setSelectedUpgradeRole('sp')}>
              <View style={[styles.upgradeIconContainer, selectedUpgradeRole === 'sp' && { backgroundColor: colors.accentPrimary }]}>
                <UserCog size={20} color={selectedUpgradeRole === 'sp' ? '#fff' : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeOptionTitle}>Service Provider (SP)</Text>
                <Text style={styles.upgradeOptionDesc}>For businesses & organizations</Text>
              </View>
              {selectedUpgradeRole === 'sp' && <Check size={18} color={colors.accentPrimary} />}
            </Pressable>

            <Pressable style={[styles.upgradeOption, selectedUpgradeRole === 'isp' && styles.upgradeOptionActive]} onPress={() => setSelectedUpgradeRole('isp')}>
              <View style={[styles.upgradeIconContainer, selectedUpgradeRole === 'isp' && { backgroundColor: colors.accentPrimary }]}>
                <Globe size={20} color={selectedUpgradeRole === 'isp' ? '#fff' : colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeOptionTitle}>Internet Service Provider</Text>
                <Text style={styles.upgradeOptionDesc}>For telecom & network operators</Text>
              </View>
              {selectedUpgradeRole === 'isp' && <Check size={18} color={colors.accentPrimary} />}
            </Pressable>

            <Pressable
              style={[styles.primaryBtn, isSwitchingRole && { opacity: 0.7 }]}
              disabled={isSwitchingRole}
              onPress={async () => {
                if (selectedUpgradeRole === 'user') {
                  try {
                    await switchRole('user');
                    setUser(user, 'user');
                    setShowUpgradeSheet(false);
                    showToast('Switched to Standard User', 'success');
                  } catch (e: any) {
                    showToast(e.message || 'Failed to switch role', 'danger');
                  }
                } else {
                  if (kycStatus !== 'verified') {
                    setUpgradeStep('details');
                  } else {
                    try {
                      await switchRole(selectedUpgradeRole);
                      setUser(user, selectedUpgradeRole);
                      setShowUpgradeSheet(false);
                      showToast(`Switched to ${selectedUpgradeRole.toUpperCase()} account`, 'success');
                    } catch (e: any) {
                      showToast(e.message || 'Failed to switch role', 'danger');
                    }
                  }
                }
              }}
            >
              <Text style={styles.primaryBtnText}>{selectedUpgradeRole === 'user' ? 'Switch to Standard User' : 'Continue'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.upgradeContent}>
            {kycStatus === 'pending' ? (
              <View style={styles.alertBoxInfo}>
                <AlertCircle size={20} color="#60a5fa" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitleInfo}>KYC Under Review</Text>
                  <Text style={styles.alertDesc}>Your documents are currently being reviewed by our team. You'll receive access once approved by an admin.</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.alertBoxWarn}>
                  <AlertCircle size={20} color="#f59e0b" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitleWarn}>KYC Verification Required</Text>
                    <Text style={styles.alertDesc}>To switch to {selectedUpgradeRole === 'sp' ? 'Service Provider' : 'Internet Service Provider'}, submit the required documents.</Text>
                  </View>
                </View>
                <Text style={styles.reqTitle}>Required Documents:</Text>
                <View style={styles.reqCard}>
                  {['Government Issued ID', 'Selfie Liveness Check', 'Business Registration', ...(selectedUpgradeRole === 'isp' ? ['ISP Telecom License'] : [])].map((doc, idx) => (
                    <View key={idx} style={styles.reqRow}>
                      <Text style={styles.reqText}>{doc}</Text>
                      <View style={styles.reqBadge}><Text style={styles.reqBadgeText}>REQUIRED</Text></View>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable style={styles.backBtn} onPress={() => setUpgradeStep('select')}>
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
              {kycStatus !== 'pending' && (
                <Pressable style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={() => {
                  setShowUpgradeSheet(false);
                  router.push('/settings/kyc');
                }}>
                  <Text style={styles.primaryBtnText}>Start KYC</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </BottomSheet>

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  scrollContent: { padding: 16, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 24 },

  profileCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: colors.textSecondary },
  roleBadge: { backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' },
  roleText: { color: colors.accentPrimary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },

  groupContainer: { marginBottom: 24 },
  groupTitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 8, marginBottom: 12 },
  groupCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.bgSecondary },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuValue: { fontSize: 14, color: colors.textSecondary },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', marginTop: 8 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
  versionText: { textAlign: 'center', fontSize: 12, color: colors.textSecondary, marginTop: 32 },

  // Sheet Styles
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 8 },
  sheetOptionActive: { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: colors.accentPrimary },
  sheetOptionText: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
  sheetOptionTextActive: { color: colors.accentPrimary },

  upgradeContent: { paddingBottom: 20 },
  upgradeDesc: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  upgradeOption: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12 },
  upgradeOptionActive: { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: colors.accentPrimary },
  upgradeIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  upgradeOptionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  upgradeOptionDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  primaryBtn: { backgroundColor: colors.accentPrimary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  alertBoxInfo: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(96, 165, 250, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.2)', marginBottom: 16 },
  alertTitleInfo: { fontSize: 14, fontWeight: 'bold', color: '#60a5fa', marginBottom: 4 },
  alertBoxWarn: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', marginBottom: 16 },
  alertTitleWarn: { fontSize: 14, fontWeight: 'bold', color: '#f59e0b', marginBottom: 4 },
  alertDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  reqTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  reqCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  reqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  reqText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  reqBadge: { backgroundColor: 'rgba(249, 115, 22, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  reqBadgeText: { fontSize: 10, fontWeight: '900', color: '#f97316' },

  backBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center' },
  backBtnText: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
});
