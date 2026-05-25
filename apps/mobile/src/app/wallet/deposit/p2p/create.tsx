import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, DollarSign, ArrowRight, CheckCircle2, Info } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useP2PStore } from '@/stores/useP2PStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useThemeColors } from '@/theme';

export default function CreateP2POfferScreen() {
  const router = useRouter();
  const { editOfferId } = useLocalSearchParams<{ editOfferId: string }>();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const { user } = useAuthStore();
  const { offers, addOffer, updateOffer, paymentAccounts } = useP2PStore();
  const { showToast } = useToastStore();
  const NRT_LIVE_PRICE = useTokenPrice();
  const { getCurrencyDetails } = useCurrencyStore();
  const { symbol, rate } = getCurrencyDetails();

  const editOffer: any = offers.find((o: any) => o.id === editOfferId);

  const [type, setType] = useState<'buy' | 'sell'>(editOffer?.type || 'sell');
  const asset = 'NRT';
  const [priceType, setPriceType] = useState<'market' | 'fixed'>(editOffer ? 'fixed' : 'market');
  const [offset, setOffset] = useState<string>(editOffer?.offset?.toString() ?? '0');
  const [fixedPrice, setFixedPrice] = useState<string>(editOffer?.price?.toString() ?? '');
  const [minAmount, setMinAmount] = useState<string>(editOffer?.minAmount?.toString() ?? '');
  const [maxAmount, setMaxAmount] = useState<string>(editOffer?.maxAmount?.toString() ?? '');
  const [selectedPayments, setSelectedPayments] = useState<string[]>(editOffer?.paymentMethods || []);

  const priceSeeded = useRef(false);
  useEffect(() => {
    if (!priceSeeded.current && NRT_LIVE_PRICE > 0 && !editOffer) {
      setFixedPrice(NRT_LIVE_PRICE.toString());
      priceSeeded.current = true;
    }
  }, [NRT_LIVE_PRICE, editOffer]);

  const calculatedPrice = priceType === 'market'
    ? NRT_LIVE_PRICE * (1 + parseFloat(offset || '0') / 100)
    : parseFloat(fixedPrice || '0');

  const handleSubmit = () => {
    if (!minAmount || !maxAmount || selectedPayments.length === 0) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const offerData = {
      userId: user?.id || 'demo-user',
      userName: user?.email?.split('@')[0] || 'DemoUser',
      type,
      asset,
      price: calculatedPrice,
      priceType,
      offset: parseFloat(offset || '0'),
      minAmount: parseFloat(minAmount),
      maxAmount: parseFloat(maxAmount),
      paymentMethods: selectedPayments,
      status: 'active' as const,
      isVerified: true,
      completionRate: 100,
    };

    if (editOffer) {
      updateOffer(editOffer.id, offerData);
      showToast('Offer updated successfully!', 'success');
    } else {
      addOffer(offerData as any);
      showToast('Offer created successfully!', 'success');
    }

    router.replace('/wallet/deposit/p2p');
  };

  const togglePayment = (method: string) => {
    setSelectedPayments(prev =>
      prev.includes(method) ? prev.filter(p => p !== method) : [...prev, method]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>{editOffer ? 'Edit Offer' : 'Create Offer'}</Text>
            <Text style={styles.headerSubtitle}>{editOffer ? 'Update your trading terms' : 'Set your terms and start trading'}</Text>
          </View>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          
          {/* I Want To */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>I WANT TO</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                onPress={() => setType('buy')}
                style={[styles.segmentBtn, type === 'buy' && styles.segmentBtnActiveBuy]}
              >
                <Text style={[styles.segmentText, type === 'buy' && { color: '#10b981' }]}>Buy {asset}</Text>
              </Pressable>
              <Pressable
                onPress={() => setType('sell')}
                style={[styles.segmentBtn, type === 'sell' && styles.segmentBtnActiveSell]}
              >
                <Text style={[styles.segmentText, type === 'sell' && { color: '#ef4444' }]}>Sell {asset}</Text>
              </Pressable>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <DollarSign size={18} color={colors.accentPrimary} />
                <Text style={styles.cardTitle}>Pricing</Text>
              </View>
              <View style={styles.segmentedControlSmall}>
                <Pressable
                  onPress={() => setPriceType('market')}
                  style={[styles.segmentBtnSmall, priceType === 'market' && styles.segmentBtnSmallActive]}
                >
                  <Text style={[styles.segmentTextSmall, priceType === 'market' && { color: colors.textPrimary }]}>Market</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPriceType('fixed')}
                  style={[styles.segmentBtnSmall, priceType === 'fixed' && styles.segmentBtnSmallActive]}
                >
                  <Text style={[styles.segmentTextSmall, priceType === 'fixed' && { color: colors.textPrimary }]}>Fixed</Text>
                </Pressable>
              </View>
            </View>

            {priceType === 'market' ? (
              <View style={styles.pricingMarket}>
                <View style={styles.pricingRow}>
                  <View>
                    <Text style={styles.pricingLabel}>Market Price</Text>
                    <Text style={styles.pricingValue}>${NRT_LIVE_PRICE.toLocaleString(undefined, { maximumFractionDigits: 7 })}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.pricingLabel}>Your Price</Text>
                    <Text style={[styles.pricingValue, { color: colors.accentPrimary }]}>${calculatedPrice.toLocaleString(undefined, { maximumFractionDigits: 7 })}</Text>
                  </View>
                </View>
                <View style={styles.offsetRow}>
                  <Text style={styles.offsetLabel}>Price Offset</Text>
                  <Text style={[styles.offsetValue, parseFloat(offset) >= 0 ? { color: '#10b981' } : { color: '#ef4444' }]}>
                    {parseFloat(offset) >= 0 ? '+' : ''}{offset || '0'}%
                  </Text>
                </View>
                {/* Note: React Native does not have a native slider built-in without an external package, so we use a text input for offset in this mockup */}
                <TextInput
                  style={styles.input}
                  value={offset}
                  onChangeText={setOffset}
                  placeholder="e.g. -2.5"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            ) : (
              <View style={styles.pricingFixed}>
                <View style={styles.fixedHeader}>
                  <Text style={styles.pricingLabel}>Set Fixed Price (USD)</Text>
                  <Pressable onPress={() => setFixedPrice(NRT_LIVE_PRICE.toString())}>
                    <Text style={styles.useMarketText}>Use Market Price</Text>
                  </Pressable>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={fixedPrice}
                    onChangeText={setFixedPrice}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Limits */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <ArrowRight size={18} color={colors.accentPrimary} />
                <Text style={styles.cardTitle}>Order Limits</Text>
              </View>
            </View>
            <View style={styles.limitsGrid}>
              <View style={styles.limitCol}>
                <Text style={styles.pricingLabel}>Min {asset}</Text>
                <TextInput
                  style={styles.input}
                  value={minAmount}
                  onChangeText={setMinAmount}
                  placeholder="100"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.limitCol}>
                <Text style={styles.pricingLabel}>Max {asset}</Text>
                <TextInput
                  style={styles.input}
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                  placeholder="5000"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
            <View style={styles.limitsValueBox}>
              <Text style={styles.limitsValueText}>
                Value: <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>{symbol}{(parseFloat(minAmount || '0') * calculatedPrice * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</Text> to <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>{symbol}{(parseFloat(maxAmount || '0') * calculatedPrice * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 6 })}</Text>
              </Text>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Payment Methods</Text>
              <Pressable onPress={() => router.push('/wallet/deposit/p2p/accounts')}>
                <Text style={styles.addPaymentText}>+ Add New</Text>
              </Pressable>
            </View>

            {paymentAccounts.length > 0 ? (
              <View style={styles.paymentsList}>
                {paymentAccounts.map((acc: any) => (
                  <Pressable
                    key={acc.id}
                    onPress={() => togglePayment(acc.provider)}
                    style={[styles.paymentBtn, selectedPayments.includes(acc.provider) && styles.paymentBtnActive]}
                  >
                    <View style={styles.paymentBtnLeft}>
                      <View style={styles.paymentIcon}>
                        <DollarSign size={14} color={colors.textSecondary} />
                      </View>
                      <View>
                        <Text style={styles.paymentProvider}>{acc.provider}</Text>
                        <Text style={styles.paymentAccount}>{acc.accountNumber}</Text>
                      </View>
                    </View>
                    {selectedPayments.includes(acc.provider) && <CheckCircle2 size={20} color={colors.accentPrimary} />}
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.emptyPayments}>
                <Text style={styles.emptyPaymentsText}>No payment accounts found.</Text>
                <Pressable onPress={() => router.push('/wallet/deposit/p2p/accounts')} style={styles.setupBtn}>
                  <Text style={styles.setupBtnText}>Setup Payments</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Info size={20} color="#3b82f6" />
            <Text style={styles.warningText}>
              By creating this offer, you agree to our P2P trading rules. Your NRT will be placed in escrow upon a trade match.
            </Text>
          </View>

          <Pressable style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>{editOffer ? 'Save Changes' : 'Post Offer'}</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bgPrimary },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },

  container: { flex: 1, paddingHorizontal: 20 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  segmentedControl: { flexDirection: 'row', backgroundColor: colors.bgSecondary, padding: 4, borderRadius: 12 },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  segmentBtnActiveBuy: { backgroundColor: colors.bgPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentBtnActiveSell: { backgroundColor: colors.bgPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },

  card: { backgroundColor: colors.bgPrimary, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.glassBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  
  segmentedControlSmall: { flexDirection: 'row', backgroundColor: colors.bgSecondary, padding: 4, borderRadius: 8 },
  segmentBtnSmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  segmentBtnSmallActive: { backgroundColor: colors.bgPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  segmentTextSmall: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary },

  pricingMarket: { gap: 16 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pricingLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  pricingValue: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  offsetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  offsetLabel: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
  offsetValue: { fontSize: 12, fontWeight: 'bold' },

  pricingFixed: { gap: 12 },
  fixedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  useMarketText: { fontSize: 11, fontWeight: 'bold', color: colors.accentPrimary },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  currencySymbol: { position: 'absolute', left: 16, fontSize: 16, fontWeight: 'bold', color: colors.textSecondary, zIndex: 1 },
  amountInput: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, paddingVertical: 14, paddingLeft: 36, paddingRight: 16, fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },

  input: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },

  limitsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  limitCol: { flex: 1 },
  limitsValueBox: { backgroundColor: colors.bgSecondary, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  limitsValueText: { fontSize: 11, color: colors.textSecondary },

  addPaymentText: { fontSize: 12, fontWeight: 'bold', color: colors.accentPrimary },
  paymentsList: { gap: 8 },
  paymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  paymentBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: colors.accentPrimary },
  paymentBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  paymentProvider: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary },
  paymentAccount: { fontSize: 10, color: colors.textSecondary },
  
  emptyPayments: { alignItems: 'center', paddingVertical: 16 },
  emptyPaymentsText: { fontSize: 12, color: colors.textSecondary, marginBottom: 12 },
  setupBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.glassBorder },
  setupBtnText: { fontSize: 12, fontWeight: 'bold', color: colors.textPrimary },

  warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)', marginBottom: 24, gap: 12 },
  warningText: { flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 18 },

  submitBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, backgroundColor: colors.accentPrimary, alignItems: 'center', shadowColor: colors.accentPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
