import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { colors, shadows } from '../theme';

export default function ScanToPayScreen() {
  const { profile } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [profile?.id]);

  const fetchSessions = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('scan2pay_sessions')
      .select('*')
      .eq('payer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setSessions(data || []);
    setLoading(false);
  };

  const handlePay = async () => {
    if (!amount || !recipientId || !profile?.id) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('scan2pay_sessions').insert({
        payer_id: profile.id,
        merchant_id: recipientId,
        amount: Number(amount),
        currency: 'NRT',
        status: 'pending',
      });
      if (error) throw error;
      Alert.alert('Success', 'Payment initiated successfully');
      setAmount('');
      setRecipientId('');
      fetchSessions();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Payment failed');
    }
    setProcessing(false);
  };

  const statusColors: Record<string, string> = {
    completed: '#10b981',
    pending: '#f59e0b',
    failed: '#ef4444',
    expired: '#6b7280',
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.title}>Scan2Pay</Text>
      <Text style={s.subtitle}>Send NRT instantly with QR codes</Text>

      {/* Quick Pay */}
      <View style={[s.card, { gap: 14 }]}>
        <View style={s.cardHeader}>
          <Text style={{ fontSize: 20 }}>💸</Text>
          <Text style={s.cardTitle}>Quick Send</Text>
        </View>

        <View>
          <Text style={s.inputLabel}>RECIPIENT ID</Text>
          <TextInput
            style={s.input}
            placeholder="Enter merchant or user ID"
            placeholderTextColor={colors.textTertiary}
            value={recipientId}
            onChangeText={setRecipientId}
          />
        </View>

        <View>
          <Text style={s.inputLabel}>AMOUNT (NRT)</Text>
          <TextInput
            style={s.input}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <Pressable
          style={[s.payButton, (!amount || !recipientId || processing) && { opacity: 0.5 }]}
          disabled={!amount || !recipientId || processing}
          onPress={handlePay}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.payButtonText}>Send Payment</Text>
          )}
        </Pressable>
      </View>

      {/* QR Scanner Placeholder */}
      <Pressable style={s.qrButton}>
        <Text style={{ fontSize: 28 }}>📷</Text>
        <View>
          <Text style={s.qrTitle}>Scan QR Code</Text>
          <Text style={s.qrDesc}>Scan a merchant's QR code to pay</Text>
        </View>
      </Pressable>

      {/* Recent Payments */}
      <Text style={[s.sectionLabel, { marginTop: 20 }]}>RECENT PAYMENTS</Text>

      {loading ? (
        <ActivityIndicator color={colors.accentPrimary} style={{ marginTop: 20 }} />
      ) : sessions.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 32 }}>💳</Text>
          <Text style={s.emptyTitle}>No payments yet</Text>
          <Text style={s.emptyDesc}>Your payment history will appear here</Text>
        </View>
      ) : (
        sessions.map(session => (
          <View key={session.id} style={s.txRow}>
            <View style={s.txIcon}>
              <Text style={{ fontSize: 16 }}>{session.status === 'completed' ? '✅' : session.status === 'pending' ? '⏳' : '❌'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.txTitle}>Payment to {session.merchant_id?.substring(0, 8)}...</Text>
              <Text style={s.txDate}>{new Date(session.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.txAmount}>-{Number(session.amount).toFixed(4)} NRT</Text>
              <View style={[s.statusDot, { backgroundColor: statusColors[session.status] || colors.textTertiary }]} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },

  card: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },

  inputLabel: { fontSize: 9, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, padding: 14, fontSize: 13, color: colors.textPrimary },

  payButton: { backgroundColor: colors.accentPrimary, borderRadius: 12, padding: 14, alignItems: 'center', ...shadows.accent },
  payButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  qrButton: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, padding: 16, marginTop: 12 },
  qrTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  qrDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  sectionLabel: { fontSize: 10, fontWeight: '900', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 10 },

  emptyState: { alignItems: 'center', paddingVertical: 36, backgroundColor: colors.bgSecondary, borderRadius: 16, borderWidth: 1, borderColor: colors.glassBorder },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginTop: 8 },
  emptyDesc: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  txIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  txDate: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800', color: colors.destructive },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
});
