import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';;
import { useRouter } from 'expo-router';
import { ChevronLeft, Copy, Share2, AlertTriangle, Check } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '@/hooks/useWallet';
import { useThemeColors } from '@/theme';

export default function DepositAddressScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { wallet, isLoading } = useWallet();
  const [copied, setCopied] = useState(false);

  const walletAddress = wallet?.solana_public_key || 'Generating address...';

  const handleCopy = async () => {
    if (wallet?.solana_public_key) {
      await Clipboard.setStringAsync(wallet.solana_public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (wallet?.solana_public_key) {
      try {
        await Share.share({
          message: `Here is my NRT wallet address:\n${wallet.solana_public_key}`,
          title: 'My NRT Wallet Address'
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>My NRT Wallet</Text>
          <Text style={styles.headerSubtitle}>Receive NRT to this address</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Main QR Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={walletAddress}
              size={180}
              color="#000"
              backgroundColor="#fff"
            />
          </View>
          
          <Text style={styles.addressLabel}>Wallet Address</Text>
          
          <View style={styles.addressBox}>
            <Text style={styles.addressText} numberOfLines={2}>{walletAddress}</Text>
            <Pressable onPress={handleCopy} style={styles.copyBtn}>
              {copied ? <Check size={18} color={colors.success} /> : <Copy size={18} color={colors.textSecondary} />}
            </Pressable>
          </View>

          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Share2 size={18} color={colors.textPrimary} />
            <Text style={styles.shareBtnText}>Share Address</Text>
          </Pressable>
        </View>

        {/* Warning Box */}
        <View style={styles.warningBox}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={16} color="#f59e0b" />
            <Text style={styles.warningTitle}>Important</Text>
          </View>
          <Text style={styles.warningText}>
            Only send <Text style={styles.boldText}>NRT tokens</Text> to this address. Sending any other token may result in permanent loss of funds.
          </Text>
        </View>

        {/* Network Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Network Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network</Text>
            <Text style={styles.detailValue}>Solana (SPL)</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Token</Text>
            <Text style={styles.detailValue}>NRT</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Min. deposit</Text>
            <Text style={styles.detailValue}>1 NRT</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.detailLabel}>Confirmations</Text>
            <Text style={styles.detailValue}>32 blocks</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  
  container: { flex: 1, paddingHorizontal: 20 },
  
  qrCard: { backgroundColor: colors.bgSecondary, borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  addressLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 12, fontWeight: '500' },
  addressBox: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder },
  addressText: { flex: 1, fontSize: 13, fontFamily: 'monospace', color: colors.textPrimary, marginRight: 12, lineHeight: 20 },
  copyBtn: { padding: 4 },
  
  shareBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, backgroundColor: colors.bgPrimary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder },
  shareBtnText: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },

  warningBox: { backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  warningTitle: { fontSize: 14, fontWeight: 'bold', color: '#f59e0b' },
  warningText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  boldText: { fontWeight: 'bold', color: colors.textPrimary },

  detailsCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.glassBorder },
  detailsTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
});
