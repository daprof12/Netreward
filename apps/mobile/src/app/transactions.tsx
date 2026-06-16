import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal } from 'react-native';;
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Search, TrendingUp, TrendingDown, ArrowDownToLine, ShoppingCart, SlidersHorizontal, QrCode, Gift, X, Check, Repeat, Coins, Lock, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTransactions, type Transaction } from '@/hooks/useTransactions';
import { Calendar } from 'lucide-react-native';
import { useThemeColors } from '@/theme';
import { formatNrtText } from '@/lib/formatNrt';
import BottomSheet from '@/components/ui/BottomSheet';
import TransactionDetailModal, { getTxMeta } from '@/components/wallet/TransactionDetailModal';
import NrtAmount from '@/components/ui/NrtAmount';

// Redefine locally or rely on getTxMeta from Modal file
const TYPE_OPTIONS = [
  { value: 'reward',         label: 'Rewards',     icon: TrendingUp,     color: '#34d399',  bg: 'rgba(52,211,153,0.12)' },
  { value: 'deposit',        label: 'Deposits',    icon: ArrowDownToLine, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { value: 'withdrawal',     label: 'Withdrawals', icon: TrendingDown,   color: '#f87171',  bg: 'rgba(248,113,113,0.12)' },
  { value: 'referral_bonus', label: 'Referrals',   icon: Gift,           color: '#fbbf24',  bg: 'rgba(251,191,36,0.12)' },
  { value: 'scan2pay',       label: 'Scan2Pay',    icon: QrCode,         color: '#a78bfa',  bg: 'rgba(167,139,250,0.12)' },
  { value: 'p2p',            label: 'P2P',         icon: Repeat,         color: '#60a5fa',  bg: 'rgba(96,165,250,0.12)' },
  { value: 'cashback',       label: 'Cashback',    icon: Coins,          color: '#fb923c',  bg: 'rgba(251,146,60,0.12)' },
  { value: 'escrow_lock',    label: 'Escrow',      icon: Lock,           color: '#22d3ee',  bg: 'rgba(34,211,238,0.12)' },
  { value: 'refund',         label: 'Refund',      icon: RefreshCw,      color: '#2dd4bf',  bg: 'rgba(45,212,191,0.12)' },
  { value: 'fee',            label: 'Fees',        icon: AlertCircle,    color: '#9ca3af',  bg: 'rgba(156,163,175,0.12)' },
];

const STATUS_OPTIONS = ['all', 'completed', 'pending', 'failed', 'rejected', 'cancelled'];

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

export default function TransactionsScreen() {
  const router = useRouter();
  const { merchant: merchantFilter } = useLocalSearchParams<{ merchant?: string }>();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { role } = useAuthStore();
  const { transactions, isLoading } = useTransactions();

  const [activeTab, setActiveTab] = useState<'transactions' | 'checkouts'>(merchantFilter ? 'checkouts' : 'transactions');
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [receipt, setReceipt] = useState<Transaction | null>(null);

  const activeFilterCount = selectedTypes.length + (selectedStatus !== 'all' ? 1 : 0);

  const checkoutTransactions = useMemo(() => {
    return transactions.filter(tx => tx.tx_type === 'scan2pay');
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const q = search.toLowerCase();
      const ms = tx.description.toLowerCase().includes(q) || tx.id.includes(q);
      const mt = selectedTypes.length === 0 || selectedTypes.includes(tx.tx_type);
      const mv = selectedStatus === 'all' || (tx.status || 'completed') === selectedStatus;
      const mm = merchantFilter ? tx.merchant_id === merchantFilter : true;
      return ms && mt && mv && mm;
    });
  }, [transactions, search, selectedTypes, selectedStatus, merchantFilter]);

  const filteredCheckouts = useMemo(() => {
    return checkoutTransactions.filter(chk => {
      const q = search.toLowerCase();
      const ms = chk.description.toLowerCase().includes(q);
      const mm = merchantFilter ? chk.merchant_id === merchantFilter : true;
      return ms && mm;
    });
  }, [checkoutTransactions, search, merchantFilter]);

  const toggleType = (v: string) =>
    setSelectedTypes(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedStatus('all');
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      completed: colors.success,
      pending: colors.warning,
      failed: colors.error,
      rejected: colors.textSecondary,
      cancelled: colors.textSecondary,
    };
    return map[status] || colors.textSecondary;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSubtitle}>View your past activities</Text>
          </View>
        </View>

        {/* SP Tabs */}
        {role === 'sp' && (
          <View style={styles.tabsContainer}>
            {(['transactions', 'checkouts'] as const).map(tab => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'transactions' ? 'Transactions' : 'Checkouts'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Search & Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Pressable
            style={[styles.filterBtn, activeFilterCount > 0 && styles.activeFilterBtn]}
            onPress={() => setShowFilter(true)}
          >
            <SlidersHorizontal size={20} color={activeFilterCount > 0 ? '#fff' : colors.textSecondary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* List */}
        <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 100 }}>
          {isLoading ? (
            <Text style={styles.emptyText}>Loading transactions...</Text>
          ) : activeTab === 'transactions' ? (
            filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => {
                const m = getTxMeta(tx.tx_type);
                const Icon = m.icon;
                const isPositive = tx.amount > 0;
                return (
                  <Pressable key={tx.id} style={styles.txCard} onPress={() => setReceipt(tx)}>
                    <View style={styles.txIconContainer}>
                      <Icon size={20} color={colors.accentPrimary} />
                    </View>
                    <View style={styles.txDetails}>
                      <View style={styles.txRow}>
                        <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                        <NrtAmount 
                          value={tx.amount} 
                          showSign={isPositive} 
                          style={[styles.txAmount, { color: isPositive ? colors.success : colors.error }]} 
                        />
                      </View>
                      <View style={styles.txRow}>
                        <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                        <Text style={[styles.txStatus, { color: getStatusColor(tx.status || 'completed') }]}>
                          {(tx.status || 'completed').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <TrendingUp size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No Transactions</Text>
                <Text style={styles.emptyText}>Your transaction history will appear here.</Text>
              </View>
            )
          ) : (
            filteredCheckouts.length > 0 ? (
              filteredCheckouts.map((chk) => (
                <Pressable key={chk.id} style={styles.txCard} onPress={() => setReceipt(chk)}>
                  <View style={styles.txIconContainer}>
                    <ShoppingCart size={20} color={colors.accentPrimary} />
                  </View>
                  <View style={styles.txDetails}>
                    <View style={styles.txRow}>
                      <Text style={styles.txDesc} numberOfLines={1}>{chk.description}</Text>
                      <NrtAmount 
                        value={Math.abs(chk.amount)} 
                        style={[styles.txAmount, { color: colors.textPrimary }]} 
                      />
                    </View>
                    <View style={styles.txRow}>
                      <Text style={styles.txDate}>{formatDate(chk.created_at)}</Text>
                      <Text style={[styles.txStatus, { color: getStatusColor(chk.status || 'completed') }]}>
                        {(chk.status || 'completed').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <ShoppingCart size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No Checkouts</Text>
                <Text style={styles.emptyText}>Scan2Pay checkout records will appear here.</Text>
              </View>
            )
          )}
        </ScrollView>

        {/* Filter Bottom Sheet */}
        <BottomSheet visible={showFilter} onClose={() => setShowFilter(false)} title="Filter Transactions">
          <ScrollView style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {/* TRANSACTION TYPE */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>TRANSACTION TYPE</Text>
              <View style={styles.typesGrid}>
                {TYPE_OPTIONS.map(t => {
                  const Icon = t.icon;
                  const isActive = selectedTypes.includes(t.value);
                  return (
                    <Pressable
                      key={t.value}
                      style={[styles.typeChip, isActive && styles.typeChipActive]}
                      onPress={() => toggleType(t.value)}
                    >
                      <View style={[styles.typeIconWrapper, isActive && styles.typeIconWrapperActive]}>
                        <Icon size={14} color={isActive ? colors.accentPrimary : colors.textSecondary} />
                      </View>
                      <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* STATUS */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>STATUS</Text>
              <View style={styles.chipsContainer}>
                {STATUS_OPTIONS.map(s => (
                  <Pressable
                    key={s}
                    style={[styles.statusChip, selectedStatus === s && styles.statusChipActive]}
                    onPress={() => setSelectedStatus(s)}
                  >
                    <Text style={[styles.statusChipText, selectedStatus === s && styles.statusChipTextActive]}>
                      {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* DATE RANGE */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>DATE RANGE</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>From</Text>
                  <View style={styles.dateInputWrapper}>
                    <Text style={styles.dateInputText}>dd/mm/yyyy</Text>
                    <Calendar size={16} color={colors.textSecondary} />
                  </View>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.dateLabel}>To</Text>
                  <View style={styles.dateInputWrapper}>
                    <Text style={styles.dateInputText}>dd/mm/yyyy</Text>
                    <Calendar size={16} color={colors.textSecondary} />
                  </View>
                </View>
              </View>
            </View>

            {activeFilterCount > 0 && (
              <Pressable style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </Pressable>
            )}

            <Pressable style={styles.applyBtn} onPress={() => setShowFilter(false)}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </Pressable>
          </ScrollView>
        </BottomSheet>

        {/* Receipt Modal — Web-matching design */}
        <TransactionDetailModal receipt={receipt} onClose={() => setReceipt(null)} />

      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary },
  
  tabsContainer: { flexDirection: 'row', backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTabBtn: { backgroundColor: colors.bgPrimary },
  tabText: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary },
  activeTabText: { color: colors.textPrimary },

  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 16, height: 50 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: 16 },
  filterBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  activeFilterBtn: { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
  filterBadge: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  listContainer: { flex: 1 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder },
  txIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txDetails: { flex: 1 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  txDesc: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, flex: 1, marginRight: 8 },
  txAmount: { fontSize: 15, fontWeight: '900' },
  txDate: { fontSize: 12, color: colors.textSecondary },
  txStatus: { fontSize: 10, fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  filterScroll: { maxHeight: '90%' },
  filterContent: { paddingVertical: 20 },
  filterSection: { marginBottom: 24 },
  filterSectionTitle: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeChip: { width: '47%', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  typeChipActive: { backgroundColor: 'rgba(16, 185, 129, 0.05)', borderWidth: 1, borderColor: colors.accentPrimary },
  typeIconWrapper: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  typeIconWrapperActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  typeChipText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  typeChipTextActive: { color: colors.textPrimary },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bgSecondary },
  statusChipActive: { backgroundColor: colors.accentPrimary },
  statusChipText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  statusChipTextActive: { color: '#fff' },
  
  dateRow: { flexDirection: 'row', gap: 12 },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 6 },
  dateInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  dateInputText: { fontSize: 13, color: colors.textPrimary },
  
  clearBtn: { padding: 16, alignItems: 'center', marginBottom: 8 },
  clearBtnText: { color: colors.error, fontSize: 16, fontWeight: 'bold' },
  applyBtn: { backgroundColor: colors.accentPrimary, padding: 16, borderRadius: 16, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  receiptCard: { width: '100%', backgroundColor: colors.bgPrimary, borderRadius: 24, overflow: 'hidden' },
  receiptHeader: { alignItems: 'center', padding: 28, backgroundColor: colors.bgSecondary, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  receiptIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  receiptAmount: { fontSize: 36, fontWeight: '900', marginBottom: 2 },
  receiptUnit: { fontSize: 14, color: colors.textSecondary, fontWeight: 'bold', marginBottom: 8 },
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
