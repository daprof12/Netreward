import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { colors, shadows } from '../theme';

type FilterType = 'all' | 'earnings' | 'withdrawals' | 'p2p' | 'purchases';

export default function TransactionHistoryScreen() {
  const { profile } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchTransactions();
  }, [profile?.id, filter]);

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'earnings') {
      query = query.in('tx_type', ['telemetry_reward', 'referral_bonus', 'welcome_bonus']);
    } else if (filter === 'withdrawals') {
      query = query.eq('tx_type', 'withdrawal');
    } else if (filter === 'p2p') {
      query = query.like('tx_type', 'p2p_%');
    } else if (filter === 'purchases') {
      query = query.eq('tx_type', 'nrt_purchase');
    }

    const { data } = await query;
    setTransactions(data || []);
    setLoading(false);
  };

  const getTxIcon = (type: string) => {
    if (type.includes('reward') || type.includes('bonus')) return { icon: '⚡', bg: 'rgba(16,185,129,0.12)' };
    if (type === 'withdrawal') return { icon: '↗️', bg: 'rgba(239,68,68,0.12)' };
    if (type.includes('p2p')) return { icon: '🤝', bg: 'rgba(59,130,246,0.12)' };
    if (type === 'nrt_purchase') return { icon: '💳', bg: 'rgba(139,92,246,0.12)' };
    return { icon: '📄', bg: 'rgba(107,114,128,0.12)' };
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.title}>Transactions</Text>
      <Text style={s.subtitle}>Your complete NRT history</Text>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
        {(['all', 'earnings', 'withdrawals', 'p2p', 'purchases'] as FilterType[]).map(f => (
          <Pressable
            key={f}
            style={[s.filterPill, filter === f && s.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterPillText, filter === f && s.filterPillTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: 40 }} />
      ) : transactions.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 32 }}>🧾</Text>
          <Text style={s.emptyTitle}>No transactions found</Text>
          <Text style={s.emptyDesc}>Try changing your filter</Text>
        </View>
      ) : (
        <View style={s.listContainer}>
          {transactions.map(tx => {
            const isPositive = Number(tx.amount) > 0;
            const style = getTxIcon(tx.tx_type);
            return (
              <View key={tx.id} style={s.txRow}>
                <View style={[s.txIcon, { backgroundColor: style.bg }]}>
                  <Text style={{ fontSize: 16 }}>{style.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txTitle}>{tx.description || tx.tx_type.replace(/_/g, ' ')}</Text>
                  <Text style={s.txDate}>
                    {new Date(tx.created_at).toLocaleDateString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.txAmount, { color: isPositive ? '#10b981' : colors.textPrimary }]}>
                    {isPositive ? '+' : ''}{Number(tx.amount).toFixed(4)} NRT
                  </Text>
                  <Text style={s.txStatus}>{tx.status.toUpperCase()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },

  filterScroll: { marginBottom: 16, flexGrow: 0 },
  filterPill: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  filterPillActive: { backgroundColor: 'rgba(99,102,241,0.1)', borderColor: colors.accentPrimary },
  filterPillText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary },
  filterPillTextActive: { color: colors.accentPrimary },

  listContainer: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, overflow: 'hidden' },

  emptyState: { alignItems: 'center', paddingVertical: 48, backgroundColor: colors.bgSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginTop: 8 },
  emptyDesc: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, textTransform: 'capitalize' },
  txDate: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '900' },
  txStatus: { fontSize: 9, fontWeight: '800', color: colors.textSecondary, marginTop: 2 },
});
