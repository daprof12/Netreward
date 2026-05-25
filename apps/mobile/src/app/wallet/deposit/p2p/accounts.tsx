import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2, ShieldCheck, Banknote, Smartphone, CreditCard, X, Globe, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useP2PStore } from '@/stores/useP2PStore';
import type { PaymentAccount } from '@/stores/useP2PStore';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { useThemeColors } from '@/theme';
import * as z from 'zod';

const accountSchema = z.object({
  type: z.enum(['bank', 'mobile_money', 'fintech']),
  country: z.string().min(1, 'Location is required'),
  provider: z.string().min(2, 'Provider name is required'),
  accountName: z.string().min(2, 'Account name is required'),
  accountNumber: z.string().min(5, 'Account number must be at least 5 digits'),
});

export default function P2PPaymentAccountsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  
  const { paymentAccounts, addPaymentAccount, deletePaymentAccount } = useP2PStore();
  const { showToast } = useToastStore();
  
  const [localBanks, setLocalBanks] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [newAcc, setNewAcc] = useState<Partial<PaymentAccount>>({
    type: 'bank',
    provider: '',
    accountName: '',
    accountNumber: '',
    country: 'Nigeria',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('local_banks').select('*').eq('status', 'active').order('name');
      setLocalBanks(data || []);
    })();
  }, []);

  const filteredBanks = localBanks.filter((b: any) => b.country && newAcc.country?.includes(b.country) && b.status === 'active');

  const handleAdd = () => {
    try {
      accountSchema.parse(newAcc);
      setErrors({});
    } catch (error: any) {
      if (error && error.errors) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((e: any) => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
        showToast('Please fix the errors in the form', 'error');
        return;
      }
    }

    addPaymentAccount(newAcc as any);
    setShowAddModal(false);
    showToast('Payment account added!', 'success');
    setNewAcc({ type: 'bank', provider: '', accountName: '', accountNumber: '', country: 'Nigeria' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Payment Methods</Text>
            <Text style={styles.headerSubtitle}>Used for P2P transactions</Text>
          </View>
        </View>
        <Pressable onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Plus size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
        
        <View style={styles.accountsList}>
          {paymentAccounts.length > 0 ? (
            paymentAccounts.map((acc: any) => {
              const Icon = acc.type === 'bank' ? Banknote : acc.type === 'mobile_money' ? Smartphone : CreditCard;
              const iconColor = acc.type === 'bank' ? '#3b82f6' : acc.type === 'mobile_money' ? '#f59e0b' : '#a855f7';
              const iconBg = acc.type === 'bank' ? 'rgba(59, 130, 246, 0.1)' : acc.type === 'mobile_money' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(168, 85, 247, 0.1)';

              return (
                <View key={acc.id} style={styles.accountCard}>
                  <View style={[styles.accIconWrapper, { backgroundColor: iconBg }]}>
                    <Icon size={24} color={iconColor} />
                  </View>
                  <View style={styles.accDetails}>
                    <View style={styles.accNameRow}>
                      <Text style={styles.accProvider} numberOfLines={1}>{acc.provider}</Text>
                      {acc.isVerified && <ShieldCheck size={14} color="#10b981" />}
                    </View>
                    <View style={styles.accLocationRow}>
                      <Globe size={10} color={colors.textSecondary} />
                      <Text style={styles.accCountry}>{acc.country}</Text>
                    </View>
                    <Text style={styles.accName}>{acc.accountName}</Text>
                    <Text style={styles.accNumber}>{acc.accountNumber}</Text>
                  </View>
                  
                  <Pressable onPress={() => deletePaymentAccount(acc.id)} style={styles.deleteBtn}>
                    <Trash2 size={18} color={colors.textSecondary} />
                  </Pressable>

                  <View style={styles.statusBadge}>
                    <View style={[styles.statusPill, { backgroundColor: acc.isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
                      <Text style={[styles.statusText, { color: acc.isVerified ? '#10b981' : '#f59e0b' }]}>
                        {acc.isVerified ? 'VERIFIED' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No payment methods added yet.</Text>
              <Pressable onPress={() => setShowAddModal(true)}>
                <Text style={styles.emptyAddBtn}>+ Add Account</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.securityTip}>
          <Text style={styles.tipTitle}>SECURITY TIP</Text>
          <Text style={styles.tipText}>
            Always ensure your account name matches your KYC verified name. Sellers may reject payments from names that don't match the trade participant.
          </Text>
        </View>
      </ScrollView>

      {/* Add Account Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true} onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Account</Text>
              <Pressable onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>TYPE</Text>
                <View style={styles.typeRow}>
                  {['bank', 'mobile_money', 'fintech'].map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setNewAcc({ ...newAcc, type: t as any, provider: '' })}
                      style={[styles.typeBtn, newAcc.type === t && styles.typeBtnActive]}
                    >
                      <Text style={[styles.typeBtnText, newAcc.type === t && styles.typeBtnTextActive]}>
                        {t.replace('_', ' ').toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>LOCATION (COUNTRY)</Text>
                <TextInput
                  style={[styles.input, errors.country && styles.inputError]}
                  value={newAcc.country}
                  onChangeText={val => setNewAcc({ ...newAcc, country: val, provider: '' })}
                  placeholder="e.g. Nigeria"
                  placeholderTextColor={colors.textTertiary}
                />
                {errors.country && <Text style={styles.errorText}><AlertCircle size={12} /> {errors.country}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PROVIDER (BANK/WALLET NAME)</Text>
                <TextInput
                  style={[styles.input, errors.provider && styles.inputError]}
                  value={newAcc.provider}
                  onChangeText={val => setNewAcc({ ...newAcc, provider: val })}
                  placeholder={newAcc.type === 'bank' ? "e.g. GTBank" : "e.g. PayPal, CashApp"}
                  placeholderTextColor={colors.textTertiary}
                />
                {errors.provider && <Text style={styles.errorText}><AlertCircle size={12} /> {errors.provider}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ACCOUNT NAME</Text>
                <TextInput
                  style={[styles.input, errors.accountName && styles.inputError]}
                  value={newAcc.accountName}
                  onChangeText={val => setNewAcc({ ...newAcc, accountName: val })}
                  placeholder="Matches your KYC"
                  placeholderTextColor={colors.textTertiary}
                />
                {errors.accountName && <Text style={styles.errorText}><AlertCircle size={12} /> {errors.accountName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ACCOUNT NUMBER / ID</Text>
                <TextInput
                  style={[styles.input, styles.monoInput, errors.accountNumber && styles.inputError]}
                  value={newAcc.accountNumber}
                  onChangeText={val => setNewAcc({ ...newAcc, accountNumber: val })}
                  placeholder="0000 0000 0000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
                {errors.accountNumber && <Text style={styles.errorText}><AlertCircle size={12} /> {errors.accountNumber}</Text>}
              </View>

              <Pressable style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>Save Account</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentPrimary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accentPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },

  container: { flex: 1, paddingHorizontal: 20 },
  
  accountsList: { marginBottom: 24 },
  accountCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.glassBorder, position: 'relative', overflow: 'hidden' },
  accIconWrapper: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  accDetails: { flex: 1 },
  accNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  accProvider: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  accLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  accCountry: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary, textTransform: 'uppercase' },
  accName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  accNumber: { fontSize: 12, fontFamily: 'monospace', color: colors.textSecondary, letterSpacing: 1 },
  deleteBtn: { padding: 8, marginLeft: 8 },
  
  statusBadge: { position: 'absolute', top: 0, right: 0 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderBottomLeftRadius: 12 },
  statusText: { fontSize: 8, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: colors.bgSecondary, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  emptyAddBtn: { fontSize: 14, fontWeight: 'bold', color: colors.accentPrimary },

  securityTip: { backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  tipTitle: { fontSize: 10, fontWeight: 'bold', color: '#3b82f6', marginBottom: 8, letterSpacing: 1 },
  tipText: { fontSize: 11, color: colors.textSecondary, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgPrimary, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  
  modalBody: { padding: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.bgSecondary, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  typeBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.accentPrimary },
  typeBtnText: { fontSize: 10, fontWeight: 'bold', color: colors.textSecondary },
  typeBtnTextActive: { color: colors.accentPrimary },
  
  input: { backgroundColor: colors.bgSecondary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: colors.textPrimary, borderWidth: 1, borderColor: colors.glassBorder },
  inputError: { borderColor: '#ef4444' },
  monoInput: { fontFamily: 'monospace', letterSpacing: 1 },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: '500' },
  
  saveBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, backgroundColor: colors.accentPrimary, alignItems: 'center', marginTop: 12, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
