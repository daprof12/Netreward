import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/stores/useAuthStore';
import { supabase } from './src/lib/supabase';
import { colors, borderRadius, shadows, spacing } from './src/theme';

// ── Tab Type ────────────────────────────────────────────────────────────────
type Tab = 'home' | 'campaigns' | 'wallet' | 'devices' | 'settings';

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.bgPrimary} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { profile, isLoading, isAuthenticated, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgPrimary }]}>
        <StatusBar style="light" />
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
        <Text style={styles.loadingText}>Loading NetReward...</Text>
      </View>
    );
  }

  if (!isAuthenticated || !profile) {
    return <LoginScreen />;
  }

  return <MainTabs />;
}

// ── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen() {
  const { signIn } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.loginContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}
      style={{ backgroundColor: colors.bgPrimary }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>NR</Text>
        </View>
        <Text style={styles.appName}>NetReward</Text>
        <Text style={styles.tagline}>Earn rewards from your network data</Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        <Text style={styles.inputLabel}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.inputLabel, { marginTop: 14 }]}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.primaryButton, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Main Tabs ───────────────────────────────────────────────────────────────
function MainTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const insets = useSafeAreaInsets();

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen />;
      case 'campaigns': return <CampaignsScreen />;
      case 'wallet': return <WalletScreen />;
      case 'devices': return <DevicesScreen />;
      case 'settings': return <SettingsScreen />;
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'campaigns', label: 'Campaigns', icon: '⚡' },
    { id: 'wallet', label: 'Wallet', icon: '💰' },
    { id: 'devices', label: 'Devices', icon: '📱' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {/* Safe area for screen content (excludes bottom for tab bar) */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {renderScreen()}
      </SafeAreaView>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── Home Screen ─────────────────────────────────────────────────────────────
function HomeScreen() {
  const { profile } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [campaignCount, setCampaignCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('nrt_balance')
        .eq('user_id', profile.id)
        .maybeSingle();
      setBalance(Number(wallet?.nrt_balance || 0));

      const { data: enrollments } = await supabase
        .from('user_campaigns')
        .select('id')
        .eq('user_id', profile.id)
        .eq('status', 'active');
      setCampaignCount(enrollments?.length || 0);
    })();
  }, [profile?.id]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      {/* Welcome */}
      <Text style={styles.greeting}>
        Welcome, <Text style={{ color: colors.accentPrimary }}>{profile?.display_name || profile?.email?.split('@')[0]}</Text>
      </Text>

      {/* Balance Card */}
      <View style={[styles.balanceCard, shadows.accent]}>
        <Text style={styles.balanceLabel}>NRT BALANCE</Text>
        <Text style={styles.balanceValue}>
          {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          <Text style={styles.balanceCurrency}> NRT</Text>
        </Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={styles.statLabel}>Active Campaigns</Text>
          <Text style={styles.statValue}>{campaignCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📊</Text>
          <Text style={styles.statLabel}>Today's Data</Text>
          <Text style={styles.statValue}>0 MB</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🏆</Text>
          <Text style={styles.statLabel}>Earned Today</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>+0.0000</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🔗</Text>
          <Text style={styles.statLabel}>Role</Text>
          <Text style={[styles.statValue, { color: colors.accentPrimary, fontSize: 14 }]}>
            {(profile?.active_role || profile?.role || 'user').toUpperCase()}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Campaigns Screen ────────────────────────────────────────────────────────
function CampaignsScreen() {
  const { profile } = useAuthStore();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .limit(50);
      setCampaigns(data || []);
      setLoading(false);
    })();
  }, [profile?.id]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Text style={styles.screenTitle}>Campaigns</Text>
      <Text style={styles.subtitle}>{campaigns.length} campaigns available</Text>

      {loading ? (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: 40 }} />
      ) : (
        campaigns.map((c) => (
          <View key={c.id} style={styles.campaignCard}>
            <View style={styles.campaignIcon}>
              <Text style={{ fontSize: 16 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.campaignTitle}>{c.title}</Text>
              <Text style={styles.campaignRate}>
                {Number(c.reward_rate_per_gb || 0).toFixed(2)} NRT/GB
              </Text>
            </View>
            <Pressable style={styles.joinButton}>
              <Text style={styles.joinButtonText}>Join</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ── Wallet Screen ───────────────────────────────────────────────────────────
function WalletScreen() {
  const { profile } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('nrt_balance')
        .eq('user_id', profile.id)
        .maybeSingle();
      setBalance(Number(wallet?.nrt_balance || 0));

      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setTransactions(txns || []);
    })();
  }, [profile?.id]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Text style={styles.screenTitle}>Wallet</Text>

      <View style={[styles.balanceCard, shadows.accent]}>
        <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
        <Text style={styles.balanceValue}>
          {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          <Text style={styles.balanceCurrency}> NRT</Text>
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { marginTop: 20 }]}>RECENT TRANSACTIONS</Text>
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet</Text>
      ) : (
        transactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc}>{tx.description || tx.tx_type}</Text>
              <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.txAmount, Number(tx.amount) > 0 ? { color: colors.success } : { color: colors.destructive }]}>
              {Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount).toFixed(4)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ── Devices Screen ──────────────────────────────────────────────────────────
function DevicesScreen() {
  const { profile } = useAuthStore();
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      setDevices(data || []);
    })();
  }, [profile?.id]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Text style={styles.screenTitle}>Devices</Text>
      <Text style={styles.subtitle}>{devices.length} registered devices</Text>

      {devices.map((d) => (
        <View key={d.id} style={styles.campaignCard}>
          <View style={styles.campaignIcon}>
            <Text style={{ fontSize: 16 }}>📱</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.campaignTitle}>{d.device_name || d.name || 'Unknown'}</Text>
            <Text style={styles.campaignRate}>{d.platform || 'Mobile'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <Text style={[styles.badgeText, { color: colors.success }]}>Active</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Settings Screen ─────────────────────────────────────────────────────────
function SettingsScreen() {
  const { profile, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Profile Card */}
      <View style={[styles.profileCard, shadows.sm]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile?.display_name || profile?.email || 'U')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{profile?.display_name || 'User'}</Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: 'rgba(99,102,241,0.15)' }]}>
          <Text style={[styles.badgeText, { color: colors.accentPrimary }]}>
            {(profile?.active_role || 'user').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Settings List */}
      <View style={styles.settingsList}>
        {[
          { icon: '👤', label: 'Profile', desc: 'Update your info' },
          { icon: '🔐', label: 'Security', desc: 'Password & biometrics' },
          { icon: '🔔', label: 'Notifications', desc: 'Push & email alerts' },
          { icon: '🌐', label: 'Language', desc: 'English' },
          { icon: '📄', label: 'Terms of Service', desc: '' },
          { icon: '🔒', label: 'Privacy Policy', desc: '' },
        ].map((item, i) => (
          <Pressable key={i} style={styles.settingsItem}>
            <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsLabel}>{item.label}</Text>
              {item.desc ? <Text style={styles.settingsDesc}>{item.desc}</Text> : null}
            </View>
            <Text style={{ color: colors.textTertiary }}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.versionText}>NetReward Mobile v1.0.0</Text>
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loadingText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

  // Login
  loginContainer: { flexGrow: 1, paddingHorizontal: 28, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText: { fontSize: 24, fontWeight: '900', color: colors.accentPrimary },
  appName: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  formContainer: { width: '100%' },
  inputLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 14, fontSize: 14, color: colors.textPrimary },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 8, padding: 10, marginTop: 12 },
  errorText: { fontSize: 12, color: colors.destructive, fontWeight: '600' },
  primaryButton: { backgroundColor: colors.accentPrimary, borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Screen
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  screenContent: { padding: 16, paddingBottom: 32 },
  screenTitle: { fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },
  greeting: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 10 },
  emptyText: { fontSize: 13, color: colors.textTertiary, textAlign: 'center', marginTop: 20 },

  // Balance
  balanceCard: { backgroundColor: '#1a1a32', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderRadius: 18, padding: 20 },
  balanceLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  balanceValue: { fontSize: 32, fontWeight: '900', color: colors.textPrimary },
  balanceCurrency: { fontSize: 16, color: colors.textSecondary, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 12, gap: 4 },
  statEmoji: { fontSize: 18, marginBottom: 2 },
  statLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },

  // Campaign Card
  campaignCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 14, marginBottom: 8 },
  campaignIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center' },
  campaignTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  campaignRate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  joinButton: { backgroundColor: colors.accentPrimary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  joinButtonText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Badge
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

  // Transactions
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  txDesc: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  txDate: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },

  // Settings
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 14, marginTop: 16 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900', color: colors.accentPrimary },
  profileName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  profileEmail: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  settingsList: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, marginTop: 16, overflow: 'hidden' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  settingsLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  settingsDesc: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  signOutButton: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  signOutText: { fontSize: 13, fontWeight: '800', color: colors.destructive },
  versionText: { fontSize: 10, color: colors.textTertiary, textAlign: 'center', marginTop: 16 },

  // Tab Bar
  tabBar: { flexDirection: 'row', backgroundColor: colors.bgSecondary, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingTop: 6 },
  tabItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
  tabItemActive: { },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 9, fontWeight: '700', color: colors.textTertiary },
  tabLabelActive: { color: colors.accentPrimary },
});
