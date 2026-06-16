import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User, ShieldCheck, Lock, UserCog, Gamepad2, History, FileText, Gift,
  Banknote, Globe, Moon, Bell, CreditCard, Code, Info, HelpCircle,
  LogOut, ChevronRight, Check, AlertCircle, X, Loader2, Copy, QrCode, ArrowRight
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

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
import { getRoleKycStatus } from '@/lib/kycUtils';

export default function SettingsScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user, role, setUser, signOut } = useAuthStore();
  const { profile, switchRole, isSwitchingRole } = useProfile();
  const { services, profileLogo: spLogo, checkoutSessions, createCheckoutSession } = useSpStore();
  const { networks, profileLogo: ispLogo } = useIspStore();
  const { gamingAccounts } = useGamingAccounts();
  const { showToast } = useToastStore();

  const { selectedCurrency, setCurrency } = useCurrencyStore();
  const { theme, setTheme } = useThemeStore();
  const [language, setLanguage] = useState('English (US)');

  const [selectedUpgradeRole, setSelectedUpgradeRole] = useState<'user' | 'sp' | 'isp'>('sp');

  // Modal States
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [showServiceDetail, setShowServiceDetail] = useState(false);
  const [showNetworkDetail, setShowNetworkDetail] = useState(false);
  const [showPaymentHub, setShowPaymentHub] = useState(false);
  const [selectedPaymentServiceIdx, setSelectedPaymentServiceIdx] = useState(0);
  const [activeQrSession, setActiveQrSession] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCloseQr = () => {
    setActiveQrSession(null);
    setShowPaymentHub(true);
  };
  const [testAmount, setTestAmount] = useState('');
  const [testDesc, setTestDesc] = useState('');

  // Switch Account States
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<'select' | 'details'>('select');

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

  const handleCopy = (text: string, id: string) => {
    Clipboard.setStringAsync(text);
    setCopiedId(id);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string, id: string }) => (
    <Pressable onPress={() => handleCopy(text, id)} style={{ padding: 4 }}>
      {copiedId === id ? (
        <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
          <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 'bold' }}>Copied</Text>
        </View>
      ) : (
        <Copy size={16} color={colors.accentPrimary} />
      )}
    </Pressable>
  );

  const currentKycStatus = getRoleKycStatus(profile, role === 'sp' ? 'sp' : role === 'isp' ? 'isp' : 'user');
  const upgradeKycStatus = getRoleKycStatus(profile, selectedUpgradeRole);
  const kycLabel = currentKycStatus === 'verified' ? '✓ Verified' : currentKycStatus === 'pending' ? 'Pending Review' : currentKycStatus === 'rejected' ? 'Rejected' : 'Unverified';
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
          { icon: ShieldCheck, label: 'KYC Verification', value: kycLabel, highlight: currentKycStatus !== 'verified', onPress: () => router.push({ pathname: '/settings/kyc', params: { targetRole: role === 'sp' ? 'sp' : role === 'isp' ? 'isp' : 'user' } } as any) },
          { icon: Lock, label: 'Security & 2FA', href: '/settings/security' },
          { icon: UserCog, label: 'Switch Account Type', onPress: () => { setUpgradeStep('select'); setShowUpgradeSheet(true); } },
          { icon: Gamepad2, label: 'Gaming Accounts', value: gamingAccounts.length > 0 ? `${gamingAccounts.length} Linked` : 'None', highlight: gamingAccounts.length === 0, href: '/settings/gaming' },
        ])}

        {renderGroup('Reports & Finances', [
          { icon: History, label: 'Transaction History', href: '/transactions' },
          { icon: CreditCard, label: 'Manage Subscriptions', href: '/settings/subscriptions' },
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
          { icon: CreditCard, label: 'Payment API', value: services.length > 0 ? `${services.length} Ready` : 'No Services', highlight: services.length === 0, onPress: () => { setSelectedPaymentServiceIdx(0); setShowPaymentHub(true); } },
          { icon: Code, label: 'Service API', value: `${services.length} Integrated`, onPress: () => setShowServiceDetail(true) },
        ])}

        {role === 'isp' && renderGroup('API & Integrations', [
          { icon: Code, label: 'Network API', value: `${networks.length} Integrated`, onPress: () => setShowNetworkDetail(true) },
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
                  if (upgradeKycStatus !== 'verified') {
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
            {upgradeKycStatus === 'pending' ? (
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
              {upgradeKycStatus !== 'pending' && (
                <Pressable style={[styles.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={() => {
                  setShowUpgradeSheet(false);
                  router.push({ pathname: '/settings/kyc', params: { targetRole: selectedUpgradeRole } } as any);
                }}>
                  <Text style={styles.primaryBtnText}>Start KYC</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </BottomSheet>

      <BottomSheet visible={showServiceDetail} onClose={() => setShowServiceDetail(false)} title="Integrated Services">
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {services.length === 0 ? (
            <Text style={{ textAlign: 'center', marginVertical: 20, color: colors.textSecondary }}>No services registered yet.</Text>
          ) : (
            services.map(svc => (
              <View key={svc.id} style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  {svc.logoUrl ? (
                    <Image source={{ uri: svc.logoUrl }} style={styles.detailLogo} />
                  ) : (
                    <View style={[styles.detailLogo, { backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center' }]}>
                      <Code size={20} color={colors.accentPrimary} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailTitle}>{svc.name}</Text>
                    <Text style={styles.detailSubtitle}>{svc.category} • {svc.status}</Text>
                  </View>
                  <View style={[styles.verifiedBadge, svc.verified ? styles.verifiedBadgeActive : styles.verifiedBadgePending]}>
                    <Text style={[styles.verifiedBadgeText, svc.verified ? { color: '#10B981' } : { color: '#F59E0B' }]}>
                      {svc.verified ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                </View>
                {svc.webUrl ? <Text style={styles.urlText}><Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Web:</Text> {svc.webUrl}</Text> : null}
                {svc.androidUrl ? <Text style={styles.urlText}><Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Android:</Text> {svc.androidUrl}</Text> : null}
                {svc.iosUrl ? <Text style={styles.urlText}><Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>iOS:</Text> {svc.iosUrl}</Text> : null}
                {svc.apiKey ? (
                  <View style={styles.apiKeyCopyContainer}>
                    <Text style={styles.apiKeyText} numberOfLines={1}>{svc.apiKey}</Text>
                    <CopyButton text={svc.apiKey} id={`svc-${svc.id}`} />
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      {/* ISP Network Details BottomSheet */}
      <BottomSheet visible={showNetworkDetail} onClose={() => setShowNetworkDetail(false)} title="Integrated Networks">
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {networks.length === 0 ? (
            <Text style={{ textAlign: 'center', marginVertical: 20, color: colors.textSecondary }}>No networks registered yet.</Text>
          ) : (
            networks.map(net => (
              <View key={net.id} style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  {net.logoUrl ? (
                    <Image source={{ uri: net.logoUrl }} style={styles.detailLogo} />
                  ) : (
                    <View style={[styles.detailLogo, { backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' }]}>
                      <Code size={20} color="#3b82f6" />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailTitle}>{net.name}</Text>
                    <Text style={styles.detailSubtitle}>{net.category} • {net.country || 'N/A'}</Text>
                  </View>
                  <View style={[styles.verifiedBadge, net.verified ? styles.verifiedBadgeActive : styles.verifiedBadgePending]}>
                    <Text style={[styles.verifiedBadgeText, net.verified ? { color: '#10B981' } : { color: '#F59E0B' }]}>
                      {net.verified ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
                </View>
                {net.signalStrength !== undefined && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginRight: 8 }}>Signal:</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: colors.bgPrimary, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', backgroundColor: net.signalStrength >= 75 ? '#10B981' : net.signalStrength >= 40 ? '#F59E0B' : '#EF4444', width: `${net.signalStrength}%` }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 8 }}>{net.signalStrength}%</Text>
                  </View>
                )}
                {net.coverage ? <Text style={styles.urlText}><Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>Coverage:</Text> {net.coverage}</Text> : null}
                {net.asn ? <Text style={styles.urlText}><Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>ASN:</Text> {net.asn}</Text> : null}
                {net.apiKey ? (
                  <View style={styles.apiKeyCopyContainer}>
                    <Text style={styles.apiKeyText} numberOfLines={1}>{net.apiKey}</Text>
                    <CopyButton text={net.apiKey} id={`net-${net.id}`} />
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </BottomSheet>

      {/* SP Payment API Hub BottomSheet */}
      <BottomSheet visible={showPaymentHub} onClose={() => setShowPaymentHub(false)} title="Payment API">
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {services.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <CreditCard size={28} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 }}>No Services Yet</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, marginBottom: 24 }}>
                Create a service first to enable Payment API. Each service gets its own API key for both SDK tracking and payments.
              </Text>
              <Pressable
                style={[styles.primaryBtn, { width: '100%', marginTop: 0 }]}
                onPress={() => {
                  setShowPaymentHub(false);
                  router.push('/campaigns/create-service');
                }}
              >
                <Text style={styles.primaryBtnText}>Create Service</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Service Selector (Horizontal Scroll if > 1) */}
              {services.length > 1 && (
                <View>
                  <Text style={styles.sectionLabel}>Select Service</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    {services.map((svc, idx) => (
                      <Pressable
                        key={svc.id}
                        onPress={() => setSelectedPaymentServiceIdx(idx)}
                        style={[
                          styles.selectorBtn,
                          idx === selectedPaymentServiceIdx && styles.selectorBtnActive
                        ]}
                      >
                        {svc.logoUrl ? (
                          <Image source={{ uri: svc.logoUrl }} style={{ width: 20, height: 20, borderRadius: 10 }} />
                        ) : (
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(139, 92, 246, 0.2)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.accentPrimary }}>{svc.name[0]}</Text>
                          </View>
                        )}
                        <Text style={[styles.selectorBtnText, idx === selectedPaymentServiceIdx && { color: colors.accentPrimary }]}>{svc.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Selected Service Status */}
              {(() => {
                const svc = services[selectedPaymentServiceIdx] || services[0];
                if (!svc) return null;
                return (
                  <View style={{ gap: 16 }}>
                    <View style={[styles.statusBanner, svc.verified ? styles.statusBannerActive : styles.statusBannerPending]}>
                      <AlertCircle size={18} color={svc.verified ? '#10B981' : '#F59E0B'} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.statusBannerTitle, svc.verified ? { color: '#10B981' } : { color: '#F59E0B' }]}>
                          {svc.verified ? 'Payment Ready' : 'Pending Verification'}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{svc.name} • {svc.category}</Text>
                      </View>
                    </View>

                    {/* API Key */}
                    {svc.apiKey && (
                      <View style={styles.apiBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.apiBoxLabel}>Service API Key</Text>
                          <Text style={styles.apiBoxValue} numberOfLines={1}>{svc.apiKey}</Text>
                        </View>
                        <CopyButton text={svc.apiKey} id={`pay-svc-key-${svc.id}`} />
                      </View>
                    )}

                    {/* Test Scan2Pay (Only verified) */}
                    {svc.verified && (
                      <View style={styles.testCard}>
                        <Text style={styles.testCardTitle}>Test Scan2Pay</Text>
                        
                        <View style={{ gap: 12 }}>
                          <View>
                            <Text style={styles.inputLabel}>Amount (NRT)</Text>
                            <TextInput
                              keyboardType="numeric"
                              placeholder="15.00"
                              placeholderTextColor={colors.textTertiary}
                              value={testAmount}
                              onChangeText={setTestAmount}
                              style={styles.textInput}
                            />
                          </View>

                          <View>
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                              placeholder="Netflix Subscription"
                              placeholderTextColor={colors.textTertiary}
                              value={testDesc}
                              onChangeText={setTestDesc}
                              style={styles.textInput}
                            />
                          </View>

                          <Pressable
                            style={styles.testBtn}
                            onPress={async () => {
                              if (!testAmount || parseFloat(testAmount) <= 0) { showToast('Enter a valid amount', 'warning'); return; }
                              if (!testDesc.trim()) { showToast('Enter a description', 'warning'); return; }
                              try {
                                const session = await createCheckoutSession(parseFloat(testAmount), testDesc.trim());
                                showToast('Test checkout session created!', 'success');
                                setTestAmount('');
                                setTestDesc('');
                                setShowPaymentHub(false);
                                setActiveQrSession(session);
                              } catch (err: any) {
                                showToast(err.message || 'Failed', 'danger');
                              }
                            }}
                          >
                            <Text style={styles.testBtnText}>Generate Test QR Code</Text>
                          </Pressable>
                        </View>
 
                        {/* Active Sessions */}
                        {checkoutSessions.length > 0 && (
                          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 16 }}>
                            <Text style={styles.activeSessionsLabel}>Active Sessions</Text>
                            <View style={{ gap: 8, marginTop: 8 }}>
                              {checkoutSessions.map(session => (
                                <View key={session.id} style={styles.activeSessionRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.activeSessionDesc} numberOfLines={1}>{session.description}</Text>
                                    <Text style={styles.activeSessionAmount}>{session.amountNrt} NRT</Text>
                                  </View>
                                  <Pressable onPress={() => { setShowPaymentHub(false); setActiveQrSession(session); }} style={styles.qrIconBtn}>
                                    <QrCode size={14} color={colors.accentPrimary} />
                                  </Pressable>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* View Documentation Link */}
                    <Pressable
                      style={styles.docsLinkBtn}
                      onPress={() => {
                        setShowPaymentHub(false);
                        router.push('/documentation/sdk');
                      }}
                    >
                      <Text style={styles.docsLinkBtnText}>View Documentation</Text>
                    </Pressable>
                  </View>
                );
              })()}
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* QR Code Display Modal */}
      <Modal visible={activeQrSession !== null} transparent animationType="fade" onRequestClose={handleCloseQr}>
        <TouchableWithoutFeedback onPress={handleCloseQr}>
          <View style={styles.qrModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.qrModalContent}>
                <View style={styles.qrModalHeader}>
                  <View style={{ flex: 1, alignItems: 'flex-start' }}>
                    <Text style={styles.qrModalTitle}>Test Scan2Pay</Text>
                    <Text style={styles.qrModalSubtitle} numberOfLines={1}>{activeQrSession?.description}</Text>
                  </View>
                  <Pressable onPress={handleCloseQr} style={styles.closeBtn}>
                    <X size={18} color={colors.textPrimary} />
                  </Pressable>
                </View>

                {activeQrSession && (
                  <View style={{ alignItems: 'center', gap: 16 }}>
                    <View style={styles.qrCodeWrapper}>
                      <Image
                        source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeQrSession.qrPayload)}` }}
                        style={{ width: 180, height: 180 }}
                      />
                    </View>

                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.accentPrimary }}>{activeQrSession.amountNrt} NRT</Text>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Pay with NetReward App</Text>
                    </View>

                    <View style={styles.qrInfoBox}>
                      <Info size={16} color={colors.accentPrimary} style={{ marginTop: 2 }} />
                      <Text style={styles.qrInfoText}>
                        Open your <Text style={{ fontWeight: 'bold', color: colors.accentPrimary }}>NetReward Mobile App</Text> and scan this QR code to complete the test payment transaction.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  detailCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLogo: { width: 40, height: 40, borderRadius: 12 },
  detailTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  detailSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  verifiedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  verifiedBadgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  verifiedBadgePending: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  verifiedBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  urlText: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  apiKeyCopyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgPrimary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  apiKeyText: { fontSize: 10, fontFamily: 'monospace', color: colors.textSecondary, flex: 1, marginRight: 8 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bgSecondary, paddingHorizontal: 12, paddingVertical: 8 },
  selectorBtnActive: { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: colors.accentPrimary },
  selectorBtnText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  statusBannerActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  statusBannerPending: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' },
  statusBannerTitle: { fontSize: 13, fontWeight: 'bold' },
  apiBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.glassBorder },
  apiBoxLabel: { fontSize: 9, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  apiBoxValue: { fontSize: 11, fontFamily: 'monospace', color: colors.textPrimary },
  testCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.glassBorder },
  testCardTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  inputLabel: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  textInput: { backgroundColor: colors.bgPrimary, borderColor: colors.glassBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: colors.textPrimary, borderWidth: 1 },
  testBtn: { backgroundColor: colors.accentPrimary, paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  testBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  activeSessionsLabel: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  activeSessionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgPrimary, borderRadius: 8, padding: 10 },
  activeSessionDesc: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary },
  activeSessionAmount: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  qrIconBtn: { padding: 6, backgroundColor: colors.bgSecondary, borderRadius: 6, borderWidth: 1, borderColor: colors.glassBorder },
  docsLinkBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', backgroundColor: colors.bgSecondary },
  docsLinkBtnText: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary },
  qrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  qrModalContent: { backgroundColor: colors.bgPrimary, borderRadius: 24, padding: 20, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: colors.glassBorder },
  qrModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qrModalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  qrModalSubtitle: { fontSize: 12, color: colors.textSecondary },
  closeBtn: { padding: 4 },
  qrCodeWrapper: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignSelf: 'center', marginBottom: 16 },
  qrInfoBox: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(139, 92, 246, 0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.1)' },
  qrInfoText: { flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 16 }
});
