import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { ArrowRight, Building, Plus, AlertCircle, Wallet, CheckCircle2 } from 'lucide-react-native';
import BottomSheet from '@/components/ui/BottomSheet';
import { useWallet } from '@/hooks/useWallet';
import { useWithdrawals } from '@/hooks/useWithdrawals';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { useThemeColors } from '@/theme';
import { formatNrtText } from '@/lib/formatNrt';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  
  const { wallet } = useWallet();
  const { balanceNRT } = useWalletStore();
  const { platformBanks, paymentMethods, addPaymentMethod, requestWithdrawal, isRequestingWithdrawal, isAddingMethod } = useWithdrawals();
  const { selectedCurrency, convertNrt } = useCurrencyStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  
  const [bankId, setBankId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const availableBalance = balanceNRT;
  const withdrawAmount = Number(amount) || 0;
  const isAmountValid = withdrawAmount > 0 && withdrawAmount <= availableBalance;
  
  const fiatPreview = convertNrt(withdrawAmount);

  const handleNextAmount = () => {
    if (!isAmountValid) return;
    setStep(2);
  };

  const handleAddBank = async () => {
    if (!bankId || !accountNumber || !accountName) {
      console.warn('Please fill all bank details');
      return;
    }
    try {
      const newMethod = await addPaymentMethod({ bank_id: bankId, account_number: accountNumber, account_name: accountName });
      setSelectedMethodId(newMethod.id);
      setStep(4);
    } catch (error: any) {
      console.error('Failed to add bank account', error);
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!selectedMethodId) return;
    try {
      await requestWithdrawal({
        amountNrt: withdrawAmount,
        paymentMethodId: selectedMethodId,
        fiatAmount: Number(fiatPreview.amount),
        currency: selectedCurrency.split(' ')[0]
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setTimeout(() => { setStep(1); setAmount(''); setIsSuccess(false); setSelectedMethodId(null); }, 500);
      }, 3000);
    } catch (error: any) {
      console.error('Withdrawal failed', error);
    }
  };

  return (
    <>
      <BottomSheet visible={isOpen && !showBankPicker} onClose={onClose} title="Withdraw Fiat">
        <View style={styles.content}>
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>{formatNrtText(availableBalance)} NRT</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>WITHDRAW AMOUNT (NRT)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="numeric"
                  />
                  <Pressable style={styles.maxBtn} onPress={() => setAmount(availableBalance.toString())}>
                    <Text style={styles.maxBtnText}>MAX</Text>
                  </Pressable>
                </View>
                {withdrawAmount > availableBalance && (
                  <View style={styles.errorRow}>
                    <AlertCircle size={12} color={colors.error} />
                    <Text style={styles.errorText}>Insufficient balance</Text>
                  </View>
                )}
              </View>

              <View style={styles.previewBox}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>You will receive approx:</Text>
                  <Text style={styles.previewValue}>{fiatPreview.symbol}{fiatPreview.amount}</Text>
                </View>
                <Text style={styles.previewSubtext}>Based on current NRT rate</Text>
              </View>

              <Pressable
                style={[styles.primaryBtn, !isAmountValid && styles.disabledBtn]}
                onPress={handleNextAmount}
                disabled={!isAmountValid}
              >
                <Text style={styles.primaryBtnText}>Continue</Text>
                <ArrowRight size={20} color="#fff" />
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Select Destination Account</Text>

              <ScrollView style={styles.methodsList}>
                {paymentMethods?.map(method => (
                  <Pressable
                    key={method.id}
                    style={styles.methodCard}
                    onPress={() => { setSelectedMethodId(method.id); setStep(4); }}
                  >
                    <View style={styles.methodIconWrapper}>
                      <Building size={20} color="#a855f7" />
                    </View>
                    <View style={styles.methodDetails}>
                      <Text style={styles.methodName}>{method.platform_banks?.name}</Text>
                      <Text style={styles.methodNumber}>•••• {method.account_number.slice(-4)}</Text>
                    </View>
                    <ArrowRight size={16} color={colors.textSecondary} />
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable style={styles.addBtn} onPress={() => setStep(3)}>
                <Plus size={18} color={colors.accentPrimary} />
                <Text style={styles.addBtnText}>Add New Bank Account</Text>
              </Pressable>

              <Pressable style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Add Bank Account</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>SELECT BANK</Text>
                <Pressable style={styles.selectBtn} onPress={() => setShowBankPicker(true)}>
                  <Text style={styles.selectBtnText}>
                    {platformBanks?.find(b => b.id === bankId)?.name || '-- Choose your bank --'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ACCOUNT NUMBER</Text>
                <TextInput
                  style={styles.inputField}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="e.g. 0123456789"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ACCOUNT NAME</Text>
                <TextInput
                  style={styles.inputField}
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="Exact name on account"
                  placeholderTextColor={colors.textTertiary}
                />
                <Text style={styles.helpText}>Must match your verified KYC document.</Text>
              </View>

              <Pressable
                style={[styles.primaryBtn, (isAddingMethod || !bankId || !accountNumber || !accountName) && styles.disabledBtn]}
                onPress={handleAddBank}
                disabled={isAddingMethod || !bankId || !accountNumber || !accountName}
              >
                {isAddingMethod ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Bank & Continue</Text>}
              </Pressable>
              
              <Pressable style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            </View>
          )}

          {step === 4 && !isSuccess && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Review Withdrawal</Text>

              <View style={styles.reviewBox}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Amount</Text>
                  <Text style={styles.reviewValue}>{withdrawAmount} NRT</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Fiat Equivalent</Text>
                  <Text style={[styles.reviewValue, { color: colors.success }]}>{fiatPreview.symbol}{fiatPreview.amount}</Text>
                </View>
                <View style={[styles.reviewRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Text style={styles.reviewLabel}>Destination</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.reviewValue}>{paymentMethods?.find(m => m.id === selectedMethodId)?.platform_banks?.name}</Text>
                    <Text style={styles.reviewSubValue}>•••• {paymentMethods?.find(m => m.id === selectedMethodId)?.account_number.slice(-4)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.alertBox}>
                <AlertCircle size={16} color={colors.warning} />
                <Text style={styles.alertText}>Withdrawals may take up to 24 hours to process and reflect in your bank account.</Text>
              </View>

              <Pressable
                style={[styles.primaryBtn, isRequestingWithdrawal && styles.disabledBtn]}
                onPress={handleConfirmWithdrawal}
                disabled={isRequestingWithdrawal}
              >
                {isRequestingWithdrawal ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm Withdrawal</Text>}
              </Pressable>

              <Pressable style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>
            </View>
          )}

          {isSuccess && (
            <View style={styles.successContainer}>
              <View style={styles.successIconWrapper}>
                <CheckCircle2 size={40} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Withdrawal Requested</Text>
              <Text style={styles.successSubtitle}>Your withdrawal of {withdrawAmount} NRT has been requested and is pending approval.</Text>
            </View>
          )}

        </View>
      </BottomSheet>

      <BottomSheet visible={showBankPicker} onClose={() => setShowBankPicker(false)} title="Select Bank">
        <ScrollView style={{ paddingVertical: 12 }}>
          {platformBanks?.map(bank => (
            <Pressable
              key={bank.id}
              style={styles.pickerOption}
              onPress={() => {
                setBankId(bank.id);
                setShowBankPicker(false);
              }}
            >
              <Text style={[styles.pickerOptionText, bankId === bank.id && styles.pickerOptionTextActive]}>{bank.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  content: { paddingVertical: 20 },
  stepContainer: { gap: 16 },
  balanceHeader: { alignItems: 'center', marginBottom: 16 },
  balanceLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  balanceValue: { fontSize: 32, fontWeight: '900', color: colors.textPrimary },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8, letterSpacing: 1 },
  inputWrapper: { position: 'relative' },
  input: { width: '100%', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  maxBtn: { position: 'absolute', right: 12, top: 16, backgroundColor: 'rgba(5, 150, 105, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  maxBtnText: { color: colors.accentPrimary, fontSize: 12, fontWeight: 'bold' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  errorText: { color: colors.error, fontSize: 12 },

  inputField: { width: '100%', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.textPrimary },
  selectBtn: { width: '100%', backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center' },
  selectBtnText: { fontSize: 16, color: colors.textPrimary },
  helpText: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },

  previewBox: { backgroundColor: colors.bgSecondary, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  previewLabel: { fontSize: 14, color: colors.textSecondary },
  previewValue: { fontSize: 18, fontWeight: 'bold', color: colors.success },
  previewSubtext: { fontSize: 10, color: colors.textSecondary, textAlign: 'right' },

  primaryBtn: { width: '100%', backgroundColor: colors.accentPrimary, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabledBtn: { opacity: 0.5 },

  stepTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  methodsList: { maxHeight: 200 },
  methodCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.bgSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 12 },
  methodIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168, 85, 247, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  methodDetails: { flex: 1 },
  methodName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  methodNumber: { fontSize: 12, color: colors.textSecondary },

  addBtn: { width: '100%', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { color: colors.accentPrimary, fontSize: 14, fontWeight: 'bold' },
  backBtn: { width: '100%', paddingVertical: 16, alignItems: 'center' },
  backBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: 'bold' },

  reviewBox: { backgroundColor: colors.bgSecondary, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: colors.glassBorder, gap: 16 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.glassBorder, paddingBottom: 16 },
  reviewLabel: { fontSize: 14, color: colors.textSecondary },
  reviewValue: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  reviewSubValue: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  alertBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', padding: 12, borderRadius: 12, gap: 8 },
  alertText: { flex: 1, fontSize: 10, color: colors.warning, lineHeight: 14 },

  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successIconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },

  pickerOption: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  pickerOptionText: { fontSize: 16, color: colors.textPrimary },
  pickerOptionTextActive: { color: colors.accentPrimary, fontWeight: 'bold' },
});
