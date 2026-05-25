import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ArrowRight, ShieldAlert, Clock, Check, X, CreditCard, MessageCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useP2PStore } from '@/stores/useP2PStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useThemeColors } from '@/theme';

type P2PStep = 'enter-amount' | 'waiting-acceptance' | 'pay-seller' | 'waiting-payment' | 'success' | 'cancelled';

export default function P2PFlowScreen() {
  const router = useRouter();
  const { offerId } = useLocalSearchParams<{ offerId: string }>();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { user, profile } = useAuthStore();
  const { offers, paymentAccounts } = useP2PStore();
  const NRT_LIVE_PRICE = useTokenPrice();
  const { getCurrencyDetails } = useCurrencyStore();
  const { symbol } = getCurrencyDetails();

  const selectedOffer: any = offers.find((o: any) => o.id === offerId);
  const isSelling = selectedOffer?.type === 'buy'; 
  const currentPrice = selectedOffer?.price || NRT_LIVE_PRICE;

  const [step, setStep] = useState<P2PStep>('enter-amount');
  const [amount, setAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState(paymentAccounts[0]?.id || '');
  const [tradeId, setTradeId] = useState('');

  const nrtValue = isSelling ? parseFloat(amount || '0') : parseFloat(amount || '0') / currentPrice;
  const usdValue = isSelling ? parseFloat(amount || '0') * currentPrice : parseFloat(amount || '0');

  const handleStartTrade = () => {
    setTradeId('TRD-' + Math.random().toString(36).slice(2, 8).toUpperCase());
    setStep('waiting-acceptance');
    
    // Simulate seller accepting after 3 seconds
    setTimeout(() => {
      setStep('pay-seller');
    }, 3000);
  };

  const handlePaymentSent = () => {
    setStep('waiting-payment');

    // Simulate seller confirming payment
    setTimeout(() => {
      setStep('success');
    }, 4000);
  };

  const handleCancelTrade = () => {
    setStep('cancelled');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft size={24} color={colors.textPrimary} />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>P2P Trading</Text>
              {tradeId ? <Text style={styles.headerSubtitle}>Trade ID: {tradeId}</Text> : <Text style={styles.headerSubtitle}>{selectedOffer?.userName}</Text>}
            </View>
          </View>
          {['waiting-acceptance', 'pay-seller'].includes(step) && (
            <Pressable onPress={handleCancelTrade} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          
          {step === 'enter-amount' && (
            <View style={styles.stepContainer}>
              <View style={styles.titleSection}>
                <Text style={styles.title}>{isSelling ? 'Enter Sell Amount' : 'Enter Buy Amount'}</Text>
                <Text style={styles.subtitle}>{isSelling ? `Amount in NRT to sell` : `Amount in USD to pay`}</Text>
              </View>

              <View style={styles.calcCard}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>{isSelling ? 'You sell (NRT)' : 'You pay (USD)'}</Text>
                  <View style={styles.inputWrapper}>
                    {!isSelling && <Text style={styles.currencySymbol}>$</Text>}
                    <TextInput
                      style={styles.amountInput}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textTertiary}
                    />
                    {isSelling && <Text style={styles.currencySymbolRight}>NRT</Text>}
                  </View>
                </View>
                <View style={styles.calcRowBottom}>
                  <Text style={styles.calcLabel}>{isSelling ? 'You receive (USD)' : 'You receive (NRT)'}</Text>
                  <Text style={styles.receiveValue}>
                    {isSelling ? `$${usdValue.toFixed(2)}` : `${nrtValue.toFixed(6)} NRT`}
                  </Text>
                  <Text style={styles.rateText}>Rate: 1 NRT = ${currentPrice.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.presetsRow}>
                {(isSelling ? ['100', '500', '1000', '5000'] : ['10', '25', '50', '100']).map(q => (
                  <Pressable
                    key={q}
                    onPress={() => setAmount(q)}
                    style={[styles.presetBtn, amount === q && styles.presetBtnActive]}
                  >
                    <Text style={[styles.presetText, amount === q && styles.presetTextActive]}>{isSelling ? '' : '$'}{q}</Text>
                  </Pressable>
                ))}
              </View>

              {isSelling && (
                <View style={styles.paymentSection}>
                  <Text style={styles.sectionLabel}>Receiving Payment Method</Text>
                  {paymentAccounts.map((acc: any) => (
                    <Pressable
                      key={acc.id}
                      onPress={() => setPaymentMethodId(acc.id)}
                      style={[styles.paymentCard, paymentMethodId === acc.id && styles.paymentCardActive]}
                    >
                      <View style={styles.paymentCardLeft}>
                        <CreditCard size={16} color={colors.textSecondary} />
                        <View style={{ marginLeft: 12 }}>
                          <Text style={styles.paymentProvider}>{acc.provider}</Text>
                          <Text style={styles.paymentAccount}>{acc.accountNumber}</Text>
                        </View>
                      </View>
                      {paymentMethodId === acc.id && <Check size={16} color={colors.accentPrimary} />}
                    </Pressable>
                  ))}
                </View>
              )}

              <Pressable
                style={[styles.actionBtn, (!amount || parseFloat(amount) <= 0) && styles.actionBtnDisabled]}
                disabled={!amount || parseFloat(amount) <= 0}
                onPress={handleStartTrade}
              >
                <Text style={styles.actionBtnText}>{isSelling ? 'Sell NRT' : 'Buy NRT'} · 0 Fee</Text>
              </Pressable>
            </View>
          )}

          {step === 'waiting-acceptance' && (
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color={colors.accentPrimary} style={{ marginBottom: 24 }} />
              <Text style={styles.title}>Waiting for Seller</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 8 }]}>
                Your order for <Text style={{ color: colors.accentPrimary, fontWeight: 'bold' }}>{nrtValue.toFixed(2)} NRT</Text> has been sent.
              </Text>
              <View style={styles.timerBadge}>
                <Clock size={16} color={colors.accentPrimary} />
                <Text style={styles.timerText}>09:59</Text>
              </View>
            </View>
          )}

          {step === 'pay-seller' && (
            <View style={styles.stepContainer}>
              <View style={styles.titleSection}>
                <Text style={styles.title}>Pay the Seller</Text>
                <Text style={styles.subtitle}>Complete payment before the timer expires</Text>
              </View>

              <View style={styles.timerBadgeLarge}>
                <Clock size={20} color={colors.accentPrimary} />
                <Text style={styles.timerTextLarge}>14:59</Text>
              </View>

              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount to pay</Text>
                  <Text style={styles.detailValuePrimary}>${usdValue.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>You will receive</Text>
                  <Text style={styles.detailValue}>{nrtValue.toFixed(4)} NRT</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Seller Name</Text>
                  <Text style={styles.detailValue}>{selectedOffer?.userName}</Text>
                </View>
              </View>

              <View style={styles.bankCard}>
                <Text style={styles.bankLabel}>Bank Details</Text>
                <Text style={styles.bankName}>Chase Bank</Text>
                <Text style={styles.bankAccountName}>John Doe</Text>
                <Text style={styles.bankAccountNumber}>1234567890</Text>
              </View>

              <View style={styles.warningBox}>
                <ShieldAlert size={16} color="#f59e0b" />
                <Text style={styles.warningText}>Leave note empty. Do not include words like "crypto", "NRT" in the bank transfer reference.</Text>
              </View>

              <Pressable style={styles.actionBtn} onPress={handlePaymentSent}>
                <Text style={styles.actionBtnText}>Transferred, Notify Seller</Text>
              </Pressable>
            </View>
          )}

          {step === 'waiting-payment' && (
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color="#f59e0b" style={{ marginBottom: 24 }} />
              <Text style={styles.title}>Waiting for Release</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 8 }]}>
                You have notified the seller. They will release the NRT once they confirm the payment in their account.
              </Text>
              <View style={[styles.timerBadgeLarge, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                <Clock size={20} color="#f59e0b" />
                <Text style={[styles.timerTextLarge, { color: '#f59e0b' }]}>14:59</Text>
              </View>
            </View>
          )}

          {step === 'success' && (
            <View style={styles.centeredContainer}>
              <View style={styles.successCircle}>
                <Check size={40} color="#10b981" />
              </View>
              <Text style={styles.title}>Trade Successful!</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 8 }]}>
                <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>{nrtValue.toFixed(4)} NRT</Text> has been added to your balance.
              </Text>
              <Pressable style={[styles.actionBtn, { marginTop: 40, width: '100%' }]} onPress={() => router.replace('/wallet')}>
                <Text style={styles.actionBtnText}>Return to Wallet</Text>
              </Pressable>
            </View>
          )}

          {step === 'cancelled' && (
            <View style={styles.centeredContainer}>
              <View style={styles.errorCircle}>
                <X size={40} color="#ef4444" />
              </View>
              <Text style={styles.title}>Trade Cancelled</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 8 }]}>
                The trade has been cancelled. No assets were exchanged.
              </Text>
              <Pressable style={[styles.actionBtn, { marginTop: 40, width: '100%' }]} onPress={() => router.replace('/wallet/deposit/p2p')}>
                <Text style={styles.actionBtnText}>Return to Market</Text>
              </Pressable>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  cancelBtnText: { fontSize: 12, fontWeight: 'bold', color: '#ef4444' },

  container: { flex: 1, paddingHorizontal: 20 },
  stepContainer: { flex: 1 },
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 20 },

  titleSection: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

  calcCard: { backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder },
  calcRow: { borderBottomWidth: 1, borderBottomColor: colors.glassBorder, paddingBottom: 16, marginBottom: 16 },
  calcLabel: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 24, fontWeight: 'bold', color: colors.textTertiary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '900', color: colors.textPrimary, padding: 0 },
  currencySymbolRight: { fontSize: 16, fontWeight: 'bold', color: colors.textTertiary, marginLeft: 8, marginTop: 8 },
  
  calcRowBottom: {},
  receiveValue: { fontSize: 24, fontWeight: '900', color: colors.accentPrimary },
  rateText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  presetsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  presetBtn: { flex: 1, paddingVertical: 12, backgroundColor: colors.bgSecondary, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  presetBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: colors.accentPrimary },
  presetText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  presetTextActive: { color: colors.accentPrimary },

  paymentSection: { marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 12 },
  paymentCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.bgSecondary, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.glassBorder },
  paymentCardActive: { borderColor: colors.accentPrimary, backgroundColor: 'rgba(16, 185, 129, 0.05)' },
  paymentCardLeft: { flexDirection: 'row', alignItems: 'center' },
  paymentProvider: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  paymentAccount: { fontSize: 11, color: colors.textSecondary },

  actionBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, backgroundColor: colors.accentPrimary, alignItems: 'center', shadowColor: colors.accentPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  actionBtnDisabled: { backgroundColor: colors.textTertiary, shadowOpacity: 0 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  timerText: { fontSize: 14, fontWeight: 'bold', color: colors.accentPrimary, fontFamily: 'monospace' },
  
  timerBadgeLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24, paddingVertical: 16, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  timerTextLarge: { fontSize: 24, fontWeight: 'bold', color: colors.accentPrimary, fontFamily: 'monospace' },

  detailsCard: { backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValuePrimary: { fontSize: 16, fontWeight: 'bold', color: colors.accentPrimary },
  detailValue: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary },

  bankCard: { backgroundColor: colors.bgPrimary, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.glassBorder, borderStyle: 'dashed' },
  bankLabel: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  bankName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 2 },
  bankAccountName: { fontSize: 13, color: colors.textPrimary, marginBottom: 4 },
  bankAccountNumber: { fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold', color: colors.accentPrimary, letterSpacing: 2 },

  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', marginBottom: 24, gap: 12 },
  warningText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  errorCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
});
