import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';;
import { ArrowDownToLine, ArrowUpFromLine, Users, QrCode, Wallet, Copy, Check, History, TrendingUp, TrendingDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '@/hooks/useWallet';
import { useWalletStore } from '@/stores/useWalletStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTransactions } from '@/hooks/useTransactions';
import { useThemeColors } from '@/theme';
import { formatNrtText } from '@/lib/formatNrt';
import WithdrawModal from '@/components/wallet/WithdrawModal';
import TransactionDetailModal from '@/components/wallet/TransactionDetailModal';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { wallet, isLoading: isWalletLoading } = useWallet();
  const { balanceNRT, fetchBalance, subscribeToWallet } = useWalletStore();
  const { user } = useAuthStore();
  const { selectedCurrency, convertNrt } = useCurrencyStore();
  
  const { transactions, isLoading: isTxLoading, totalEarned, totalWithdrawn } = useTransactions();
  
  const [copied, setCopied] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchBalance(user.id);
    const unsubscribe = subscribeToWallet(user.id);
    return () => unsubscribe();
  }, [user?.id, fetchBalance, subscribeToWallet]);

  const displayBalance = balanceNRT;
  const fiatPreview = convertNrt(displayBalance);

  const handleCopy = async () => {
    if (wallet?.solana_public_key) {
      await Clipboard.setStringAsync(wallet.solana_public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLoading = isWalletLoading || isTxLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const ACTIONS = [
    { icon: ArrowUpFromLine, label: 'Withdraw', color: '#10b981', onPress: () => setIsWithdrawModalOpen(true) },
    { icon: ArrowDownToLine, label: 'Deposit', color: colors.accentPrimary, onPress: () => router.push('/wallet/deposit' as any) },
    { icon: Users, label: 'Referral', color: '#f59e0b', onPress: () => router.push('/wallet/referral') },
    { icon: QrCode, label: 'Scan2Pay', color: '#3b82f6', onPress: () => router.push('/wallet/scan-to-pay' as any) },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Wallet</Text>
        </View>

        {/* Balance Card */}
        <LinearGradient
          colors={['#10b981', '#7c3aed', '#6366f1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceBgIcon}>
            <Wallet size={180} color="rgba(255,255,255,0.08)" strokeWidth={1.5} />
          </View>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>{formatNrtText(displayBalance)}</Text>
            <Text style={styles.balanceCurrency}>NRT</Text>
          </View>
          <Text style={styles.fiatPreview}>≈ {fiatPreview.symbol}{fiatPreview.amount} {selectedCurrency.split(' ')[0]}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Earned</Text>
              <Text style={styles.statValuePositive}>+{formatNrtText(totalEarned)} NRT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Withdrawn</Text>
              <Text style={styles.statValueNegative}>-{formatNrtText(totalWithdrawn)} NRT</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Actions Grid */}
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Pressable key={idx} style={styles.actionBtn} onPress={action.onPress}>
                <View style={[styles.actionIconWrapper, { backgroundColor: action.color + '15' }]}>
                  <Icon size={20} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Solana Network Address */}
        <View style={styles.networkCard}>
          <View style={styles.networkHeader}>
            <View style={styles.networkInfo}>
              <View style={styles.networkIconWrapper}>
                <Wallet size={16} color="#14F195" />
              </View>
              <View>
                <Text style={styles.networkTitle}>Solana Network</Text>
                <Text style={styles.networkSubtitle}>Token-2022 Standard • View Stats</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/wallet/deposit/address' as any)}>
              <Text style={styles.viewQrText}>View QR</Text>
            </Pressable>
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              {wallet?.solana_public_key || 'Generating address...'}
            </Text>
            <Pressable onPress={handleCopy} style={styles.copyBtn}>
              {copied ? <Check size={16} color={colors.success} /> : <Copy size={16} color={colors.textSecondary} />}
            </Pressable>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Transaction History</Text>
            <Pressable style={styles.historyBtn} onPress={() => router.push('/transactions')}>
              <History size={14} color={colors.accentPrimary} />
              <Text style={styles.historyBtnText}>History</Text>
            </Pressable>
          </View>

          <View style={styles.transactionsList}>
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <History size={32} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <Pressable key={tx.id} style={styles.txCard} onPress={() => setReceipt(tx)}>
                  <View style={[styles.txIconWrapper, { 
                    backgroundColor: tx.tx_type === 'reward' ? 'rgba(16, 185, 129, 0.1)' : 
                                     tx.tx_type === 'withdrawal' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(5, 150, 105, 0.1)' 
                  }]}>
                    {tx.tx_type === 'reward' ? (
                      <TrendingUp size={16} color={colors.success} />
                    ) : tx.tx_type === 'withdrawal' ? (
                      <TrendingDown size={16} color={colors.error} />
                    ) : (
                      <ArrowDownToLine size={16} color={colors.accentPrimary} />
                    )}
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: Number(tx.amount) > 0 ? colors.success : colors.textPrimary }]}>
                    {Number(tx.amount) > 0 ? '+' : ''}{formatNrtText(tx.amount)} NRT
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <WithdrawModal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} />
      <TransactionDetailModal receipt={receipt} onClose={() => setReceipt(null)} />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  container: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary },
  
  balanceCard: { borderRadius: 24, padding: 24, overflow: 'hidden', position: 'relative', marginBottom: 24, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  balanceBgIcon: { position: 'absolute', right: -30, top: -20 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', marginBottom: 4 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  balanceValue: { fontSize: 36, fontWeight: '900', color: '#fff' },
  balanceCurrency: { fontSize: 16, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' },
  fiatPreview: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  statBox: { flex: 1 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', marginBottom: 4 },
  statValuePositive: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  statValueNegative: { fontSize: 13, fontWeight: 'bold', color: '#fff' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  actionBtn: { width: (width - 40 - 36) / 4, backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  actionIconWrapper: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, textAlign: 'center' },

  networkCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 24 },
  networkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  networkInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  networkIconWrapper: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(20, 241, 149, 0.1)', alignItems: 'center', justifyContent: 'center' },
  networkTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  networkSubtitle: { fontSize: 10, color: colors.accentPrimary, fontWeight: 'bold' },
  viewQrText: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },
  addressBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgPrimary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.glassBorder },
  addressText: { flex: 1, fontSize: 12, fontFamily: 'monospace', color: colors.textSecondary, marginRight: 12 },
  copyBtn: { padding: 4 },

  historySection: { flex: 1 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(5, 150, 105, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(5, 150, 105, 0.2)' },
  historyBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },
  transactionsList: { backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, overflow: 'hidden' },
  emptyContainer: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },
  txCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  txIconWrapper: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  txDate: { fontSize: 11, color: colors.textSecondary },
  txAmount: { fontSize: 14, fontWeight: 'bold' },
});
