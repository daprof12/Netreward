import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, Code, Terminal, Key, FileJson, Layers, 
  ExternalLink, CheckCircle2, Eye, EyeOff, Copy, Check 
} from 'lucide-react-native';
import { useThemeColors } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';
import * as Clipboard from 'expo-clipboard';
import { useToastStore } from '@/stores/useToastStore';

type TabId = 'overview' | 'installation' | 'configuration' | 'events';

export default function SdkDocumentationScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { showToast } = useToastStore();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { profile } = useAuthStore();
  const { services } = useSpStore();
  const { networks } = useIspStore();

  const role = profile?.active_role || profile?.role;
  let apiKey: string | null = null;
  let secretKey: string | null = null;

  if (role === 'sp' && services.length > 0) {
    apiKey = services[0].apiKey || null;
    secretKey = services[0].secretKey || null;
  } else if (role === 'isp' && networks.length > 0) {
    apiKey = networks[0].apiKey || null;
    secretKey = networks[0].apiSecret || null;
  }

  const displayApiKey = apiKey || 'YOUR_API_KEY';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>NetReward Tracker SDK</Text>
          <Text style={styles.headerSubtitle}>v2.1.0 • Developer Documentation</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs Container */}
      <View style={styles.tabsWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsScrollContent}
        >
          {[
            { id: 'overview' as const, label: 'Overview', icon: Layers },
            { id: 'installation' as const, label: 'Installation', icon: Terminal },
            { id: 'configuration' as const, label: 'Configuration', icon: Key },
            { id: 'events' as const, label: 'Event Tracking', icon: FileJson },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              >
                <Icon size={16} color={isSelected ? '#fff' : colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content Container */}
      <ScrollView style={styles.contentContainer} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              <View style={styles.introRow}>
                <View style={styles.introIconWrapper}>
                  <Code size={24} color={colors.accentPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Introduction</Text>
                  <Text style={styles.sectionDesc}>
                    The NetReward Tracker SDK is an industrial-grade telemetry client designed for Mobile Applications (iOS/Android), Web Applications, and backend services. It securely records data consumption, user sessions, and custom application events to calculate and distribute NRT rewards with cryptographic verifiable accuracy.
                  </Text>
                </View>
              </View>

              {/* 4 Feature Items Stacked Vertically */}
              <View style={styles.featuresStack}>
                <View style={styles.featureBox}>
                  <View style={styles.featureHeader}>
                    <CheckCircle2 size={16} color="#10b981" style={{ marginRight: 8 }} />
                    <Text style={styles.featureTitle}>BGP IP Validation</Text>
                  </View>
                  <Text style={styles.featureDesc}>
                    Automatically resolves device IP against global BGP routing tables to verify ISP authenticity and prevent VPN abuse.
                  </Text>
                </View>

                <View style={styles.featureBox}>
                  <View style={styles.featureHeader}>
                    <CheckCircle2 size={16} color="#10b981" style={{ marginRight: 8 }} />
                    <Text style={styles.featureTitle}>Off-Chain Batching</Text>
                  </View>
                  <Text style={styles.featureDesc}>
                    Aggregates micro-transactions locally and flushes to the NetReward rollup periodically to save network bandwidth.
                  </Text>
                </View>

                <View style={styles.featureBox}>
                  <View style={styles.featureHeader}>
                    <CheckCircle2 size={16} color="#10b981" style={{ marginRight: 8 }} />
                    <Text style={styles.featureTitle}>End-to-End Encryption</Text>
                  </View>
                  <Text style={styles.featureDesc}>
                    All telemetry data is signed using an ed25519 payload signature ensuring tamper-proof reward claims.
                  </Text>
                </View>

                <View style={styles.featureBox}>
                  <View style={styles.featureHeader}>
                    <CheckCircle2 size={16} color="#10b981" style={{ marginRight: 8 }} />
                    <Text style={styles.featureTitle}>Multi-Platform</Text>
                  </View>
                  <Text style={styles.featureDesc}>
                    Available via NPM, CocoaPods, Gradle, and direct REST API for backend-to-backend integrations.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* INSTALLATION TAB */}
          {activeTab === 'installation' && (
            <View style={styles.tabContent}>
              <Text style={styles.tabSectionTitle}>Installation</Text>
              <Text style={styles.sectionDesc}>Install the core tracking library into your application.</Text>

              <View style={styles.codeSnippetSection}>
                <Text style={styles.codeLabel}>Web / React Native (NPM)</Text>
                <CodeBlock code="npm install @netreward/tracker-sdk" onCopy={() => copyToClipboard('npm install @netreward/tracker-sdk', 'NPM install command')} colors={colors} />
              </View>

              <View style={styles.codeSnippetSection}>
                <Text style={styles.codeLabel}>iOS (CocoaPods)</Text>
                <CodeBlock code={`pod 'NetRewardTracker', '~> 2.1.0'`} onCopy={() => copyToClipboard(`pod 'NetRewardTracker', '~> 2.1.0'`, 'CocoaPods config')} colors={colors} />
              </View>

              <View style={styles.codeSnippetSection}>
                <Text style={styles.codeLabel}>Android (Gradle)</Text>
                <CodeBlock code="implementation 'com.netreward.sdk:tracker:2.1.0'" onCopy={() => copyToClipboard("implementation 'com.netreward.sdk:tracker:2.1.0'", 'Gradle config')} colors={colors} />
              </View>
            </View>
          )}

          {/* CONFIGURATION TAB */}
          {activeTab === 'configuration' && (
            <View style={styles.tabContent}>
              <Text style={styles.tabSectionTitle}>Initialization & Configuration</Text>
              <Text style={styles.sectionDesc}>
                You must initialize the SDK as early as possible in your application lifecycle (e.g., inside App.tsx or AppDelegate).
              </Text>

              {/* Credentials Section */}
              <View style={{ gap: 12, marginVertical: 16 }}>
                <Text style={[styles.codeLabel, { color: colors.textPrimary }]}>Your Credentials ({role?.toUpperCase()})</Text>
                <CredentialDisplay label="SDK / Tracker API Key" value={apiKey} onCopy={() => apiKey && copyToClipboard(apiKey, 'API Key')} colors={colors} />
                <CredentialDisplay label="Secret Key (backend only)" value={secretKey} onCopy={() => secretKey && copyToClipboard(secretKey, 'Secret Key')} colors={colors} isSecret />
              </View>

              <Text style={styles.codeLabel}>React Native Code Sample</Text>
              <CodeBlock 
                code={`import { NetRewardTracker } from '@netreward/tracker-sdk';

NetRewardTracker.init({
  apiKey: '${displayApiKey}',
  environment: 'production',

  config: {
    batchIntervalMs: 60000,
    maxRetries: 3,
    logLevel: 'warn',
    captureBackground: true
  }
});`} 
                onCopy={() => copyToClipboard(`import { NetRewardTracker } from '@netreward/tracker-sdk';\n\nNetRewardTracker.init({\n  apiKey: '${displayApiKey}',\n  environment: 'production',\n  config: {\n    batchIntervalMs: 60000,\n    maxRetries: 3,\n    logLevel: 'warn',\n    captureBackground: true\n  }\n});`, 'Code Sample')} 
                colors={colors} 
              />

              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Security Warning</Text>
                <Text style={styles.warningDesc}>
                  Never expose your Secret Key on client-side applications. The API Key above is for client telemetry only. For secure backend verification, use your Secret Key via the REST API.
                </Text>
              </View>
            </View>
          )}

          {/* EVENT TRACKING TAB */}
          {activeTab === 'events' && (
            <View style={styles.tabContent}>
              <Text style={styles.tabSectionTitle}>Tracking Data & Events</Text>
              <Text style={styles.sectionDesc}>Track standard data consumption or custom conversion events.</Text>

              <View style={styles.codeSnippetSection}>
                <Text style={styles.codeLabel}>1. User Identification</Text>
                <Text style={styles.sectionDesc}>Link the telemetry to a specific user to ensure they receive NRT rewards.</Text>
                <CodeBlock 
                  code={`NetRewardTracker.identify('user_12345', {
  nrtWalletAddress: 'NRTx8p9b...',
  deviceType: 'ios'
});`} 
                  onCopy={() => copyToClipboard(`NetRewardTracker.identify('user_12345', {\n  nrtWalletAddress: 'NRTx8p9b...',\n  deviceType: 'ios'\n});`, 'Identification sample')} 
                  colors={colors} 
                />
              </View>

              <View style={styles.codeSnippetSection}>
                <Text style={styles.codeLabel}>2. Tracking Data Usage (Automated)</Text>
                <Text style={styles.sectionDesc}>Once initialized, the SDK automatically tracks network requests. To manually log bulk data:</Text>
                <CodeBlock 
                  code={`// Log 50MB of downloaded streaming data
NetRewardTracker.logDataConsumption({
  bytesReceived: 52428800,
  contentType: 'video/mp4',
  source: 'cdn-east-1'
});`} 
                  onCopy={() => copyToClipboard(`NetRewardTracker.logDataConsumption({\n  bytesReceived: 52428800,\n  contentType: 'video/mp4',\n  source: 'cdn-east-1'\n});`, 'Data usage sample')} 
                  colors={colors} 
                />
              </View>

              <View style={styles.codeSnippetSection}>
                <Text style={styles.codeLabel}>3. Custom Events</Text>
                <Text style={styles.sectionDesc}>Track user interactions that may trigger specific campaign bonuses.</Text>
                <CodeBlock 
                  code={`NetRewardTracker.track('Checkout_Completed', {
  orderValue: 125.50,
  currency: 'USD',
  items: ['Premium_Subscription']
});`} 
                  onCopy={() => copyToClipboard(`NetRewardTracker.track('Checkout_Completed', {\n  orderValue: 125.50,\n  currency: 'USD',\n  items: ['Premium_Subscription']\n});`, 'Custom events sample')} 
                  colors={colors} 
                />
              </View>
            </View>
          )}

        </View>

        {/* External Link at Bottom */}
        <Pressable 
          onPress={() => Linking.openURL('https://docs.netreward.io')} 
          style={styles.apiRefButton}
        >
          <Text style={styles.apiRefButtonText}>View full API Reference</Text>
          <ExternalLink size={14} color={colors.accentPrimary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  function copyToClipboard(text: string, label: string) {
    Clipboard.setStringAsync(text);
    showToast(`${label} copied to clipboard`, 'success');
  }
}

function CodeBlock({ code, onCopy, colors }: { code: string; onCopy: () => void; colors: any }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <View style={{ backgroundColor: '#0f172a', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, marginTop: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#10b981', lineHeight: 18 }}>
          {code}
        </Text>
      </ScrollView>
      <Pressable onPress={handleCopy} style={{ position: 'absolute', top: 10, right: 10, padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>
        {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} color="#64748b" />}
      </Pressable>
    </View>
  );
}

function CredentialDisplay({ label, value, onCopy, colors, isSecret = false }: { label: string; value: string | null; onCopy: () => void; colors: any; isSecret?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const display = value
    ? (isSecret && !visible ? value.slice(0, 12) + '••••••••••••••••' : value)
    : 'Not generated yet — create a service/network first';

  const handleCopy = () => {
    if (!value) return;
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{ backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, padding: 12, borderRadius: 12 }}>
      <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text numberOfLines={1} ellipsizeMode="middle" style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: value ? colors.accentPrimary : colors.textSecondary }}>
          {display}
        </Text>
        {value && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            {isSecret && (
              <Pressable onPress={() => setVisible(v => !v)} style={{ padding: 4 }}>
                {visible ? <EyeOff size={14} color={colors.textSecondary} /> : <Eye size={14} color={colors.textSecondary} />}
              </Pressable>
            )}
            <Pressable onPress={handleCopy} style={{ padding: 4 }}>
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} color={colors.textSecondary} />}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  
  tabsWrapper: { borderBottomWidth: 1, borderBottomColor: colors.glassBorder, backgroundColor: colors.bgSecondary },
  tabsScrollContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'transparent' },
  tabButtonActive: { backgroundColor: colors.accentPrimary },
  tabButtonText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  tabButtonTextActive: { color: '#fff' },
  
  contentContainer: { flex: 1, padding: 16 },
  card: { backgroundColor: colors.bgSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, padding: 16 },
  
  tabContent: { gap: 16 },
  introRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  introIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(5, 150, 105, 0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 4 },
  
  featuresStack: { gap: 12, marginTop: 8 },
  featureBox: { backgroundColor: colors.bgPrimary, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, padding: 12 },
  featureHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  featureTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  featureDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  
  tabSectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  codeSnippetSection: { gap: 4 },
  codeLabel: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary, marginTop: 4 },
  
  warningBox: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', padding: 12, borderRadius: 12, marginTop: 12 },
  warningTitle: { fontSize: 13, fontWeight: 'bold', color: '#d97706' },
  warningDesc: { fontSize: 11, color: 'rgba(217, 119, 6, 0.8)', marginTop: 4, lineHeight: 16 },
  
  apiRefButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24, paddingVertical: 12 },
  apiRefButtonText: { fontSize: 14, fontWeight: 'bold', color: colors.accentPrimary },
});
