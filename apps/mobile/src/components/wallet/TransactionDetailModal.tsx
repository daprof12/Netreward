import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { TrendingUp, ArrowDownToLine, TrendingDown, Gift, QrCode, Repeat, Coins, Lock, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useThemeColors } from '@/theme';
import { formatNrtText } from '@/lib/formatNrt';
import NrtAmount from '@/components/ui/NrtAmount';

const TYPE_OPTIONS = [
  { value: 'reward', label: 'Rewards', icon: TrendingUp, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { value: 'deposit', label: 'Deposits', icon: ArrowDownToLine, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { value: 'withdrawal', label: 'Withdrawals', icon: TrendingDown, color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  { value: 'referral_bonus', label: 'Referrals', icon: Gift, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { value: 'scan2pay', label: 'Scan2Pay', icon: QrCode, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { value: 'p2p', label: 'P2P', icon: Repeat, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { value: 'cashback', label: 'Cashback', icon: Coins, color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  { value: 'escrow_lock', label: 'Escrow', icon: Lock, color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  { value: 'refund', label: 'Refund', icon: RefreshCw, color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  { value: 'fee', label: 'Fees', icon: AlertCircle, color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
];

export function getTxMeta(type: string) {
  return TYPE_OPTIONS.find(o => o.value === type) ?? TYPE_OPTIONS[0];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

interface TransactionDetailModalProps {
  receipt: any | null;
  onClose: () => void;
}

export default function TransactionDetailModal({ receipt, onClose }: TransactionDetailModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <Modal visible={!!receipt} transparent animationType="fade" onRequestClose={onClose}>
      {receipt && (() => {
        const m = getTxMeta(receipt.tx_type);
        const Icon = m.icon;
        const isPositive = receipt.amount > 0;
        const statusColor: Record<string, string> = {
          completed: colors.success, pending: colors.warning, failed: colors.error,
          rejected: colors.textSecondary, cancelled: colors.textSecondary,
        };
        const stColor = statusColor[receipt.status || 'completed'] || colors.textSecondary;

        return (
          <Pressable style={styles.modalOverlay} onPress={onClose}>
            <Pressable style={styles.receiptCard} onPress={e => e.stopPropagation()}>
              <View style={styles.receiptHeader}>
                <View style={[styles.receiptIconCircle, { backgroundColor: m.bg }]}>
                  <Icon size={32} color={m.color} />
                </View>
                <View style={styles.receiptAmountRow}>
                  <NrtAmount
                    value={receipt.amount}
                    showSign
                    style={[styles.receiptAmount, { color: isPositive ? colors.success : colors.error }]}
                    hideUnit
                  />
                  <Text style={styles.receiptUnit}>NRT</Text>
                </View>
                <Text style={styles.receiptDesc}>{receipt.description}</Text>
                <View style={styles.receiptBadgeRow}>
                  <View style={[styles.receiptBadge, { backgroundColor: m.bg }]}>
                    <Text style={[styles.receiptBadgeText, { color: m.color }]}>{m.label}</Text>
                  </View>
                  <View style={[styles.receiptBadge, { backgroundColor: `${stColor}18` }]}>
                    <Text style={[styles.receiptBadgeText, { color: stColor }]}>
                      {(receipt.status || 'completed').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.receiptBody}>
                {[
                  { label: 'Transaction ID', value: receipt.id.slice(0, 8) + '...' },
                  { label: 'Type', value: m.label },
                  { label: 'Date & Time', value: formatDate(receipt.created_at) },
                  { label: 'Status', value: (receipt.status || 'completed').charAt(0).toUpperCase() + (receipt.status || 'completed').slice(1) },
                ].map(({ label, value }) => (
                  <View key={label} style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>{label}</Text>
                    <Text style={styles.receiptValue}>{value}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={styles.closeReceiptBtn} onPress={onClose}>
                <Text style={styles.closeReceiptText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        );
      })()}
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  receiptCard: { width: '100%', backgroundColor: colors.bgPrimary, borderRadius: 24, overflow: 'hidden' },
  receiptHeader: { alignItems: 'center', padding: 28, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  receiptIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  receiptAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 2 },
  receiptAmount: { fontSize: 36, fontWeight: '900' },
  receiptUnit: { fontSize: 14, color: colors.textSecondary, fontWeight: 'bold' },
  receiptDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 },
  receiptBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  receiptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  receiptBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  receiptBody: { padding: 24, gap: 16 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptLabel: { fontSize: 14, color: colors.textSecondary },
  receiptValue: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  closeReceiptBtn: { padding: 16, borderTopWidth: 1, borderTopColor: colors.glassBorder, alignItems: 'center' },
  closeReceiptText: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
});
