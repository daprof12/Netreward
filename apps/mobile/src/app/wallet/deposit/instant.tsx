import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/theme';
import NrtAmount from '@/components/ui/NrtAmount';

export default function InstantPurchaseScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const RATE = 450; // $450 per NRT
  const [usdAmount, setUsdAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'paystack' | 'flutterwave' | null>(null);
  const [sendToSolana, setSendToSolana] = useState(false);

  const nrtReceived = usdAmount ? (parseFloat(usdAmount) / RATE).toFixed(6) : '0';

  const presets = [10, 25, 50, 100];

  const handlePreset = (amount: number) => {
    setUsdAmount(amount.toString());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Instant Purchase</Text>
            <Text style={styles.headerSubtitle}>Quick buy at platform rate</Text>
          </View>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          
          <View style={styles.rateBanner}>
            <Zap size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={styles.rateBannerText}>Platform rate: 1 NRT = ${RATE} (instant settlement)</Text>
          </View>

          <View style={styles.calculatorCard}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>You pay ($)</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  value={usdAmount}
                  onChangeText={setUsdAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={[styles.calcRow, styles.calcRowNoBorder]}>
              <Text style={styles.calcLabel}>You receive (NRT)</Text>
              <View style={styles.receiveWrapper}>
                <NrtAmount value={nrtReceived} style={styles.receiveValue} unitStyle={styles.receiveSymbol} />
              </View>
            </View>
          </View>

          <View style={styles.presetsRow}>
            {presets.map((amount) => (
              <Pressable
                key={amount}
                style={[styles.presetBtn, usdAmount === amount.toString() && styles.presetBtnActive]}
                onPress={() => handlePreset(amount)}
              >
                <Text style={[styles.presetBtnText, usdAmount === amount.toString() && styles.presetBtnTextActive]}>${amount}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Deposit Method</Text>

          <Pressable
            style={[styles.methodCard, selectedMethod === 'paystack' && styles.methodCardActive]}
            onPress={() => setSelectedMethod('paystack')}
          >
            <View style={styles.methodIconWrapper}>
              <View style={[styles.methodIcon, { backgroundColor: '#e0f2fe' }]} />
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodName}>Paystack</Text>
              <Text style={styles.methodSub}>🌐 Nigeria · Ghana · SA · Kenya</Text>
            </View>
            <View style={styles.methodRight}>
              <Text style={styles.methodFee}>Fee: 1.5% + ₦100 cap</Text>
              <Text style={styles.methodType}>Popup Checkout</Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.methodCard, selectedMethod === 'flutterwave' && styles.methodCardActive]}
            onPress={() => setSelectedMethod('flutterwave')}
          >
            <View style={styles.methodIconWrapper}>
              <View style={[styles.methodIcon, { backgroundColor: '#fef3c7' }]} />
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodName}>Flutterwave</Text>
              <Text style={styles.methodSub}>🌐 Africa (35+ countries)</Text>
            </View>
            <View style={styles.methodRight}>
              <Text style={styles.methodFee}>Fee: 1.4%</Text>
              <Text style={styles.methodType}>Redirect Checkout</Text>
            </View>
          </Pressable>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.toggleTitle}>Send directly to Solana wallet</Text>
              <Text style={styles.toggleSubtitle}>Optional — leave off to keep NRT in your platform balance</Text>
            </View>
            <Switch
              value={sendToSolana}
              onValueChange={setSendToSolana}
              trackColor={{ false: colors.bgSecondary, true: colors.accentPrimary }}
              thumbColor="#fff"
            />
          </View>

          <Pressable
            style={[styles.submitBtn, (!usdAmount || parseFloat(usdAmount) <= 0 || !selectedMethod) && styles.submitBtnDisabled]}
            disabled={!usdAmount || parseFloat(usdAmount) <= 0 || !selectedMethod}
          >
            <Text style={styles.submitBtnText}>Continue</Text>
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
  
  rateBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  rateBannerText: { fontSize: 12, fontWeight: 'bold', color: '#f59e0b' },

  calculatorCard: { backgroundColor: colors.bgPrimary, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 16, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  calcRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.glassBorder },
  calcRowNoBorder: { borderBottomWidth: 0 },
  calcLabel: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { fontSize: 32, fontWeight: '900', color: colors.textTertiary, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '900', color: colors.textPrimary, padding: 0 },
  receiveWrapper: { flexDirection: 'row', alignItems: 'center' },
  receiveValue: { fontSize: 24, fontWeight: '900', color: colors.success, marginRight: 8 },
  receiveSymbol: { fontSize: 14, fontWeight: 'bold', color: colors.success, marginTop: 6 },

  presetsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 32 },
  presetBtn: { flex: 1, paddingVertical: 12, borderRadius: 24, backgroundColor: colors.bgSecondary, alignItems: 'center' },
  presetBtnActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: colors.success },
  presetBtnText: { fontSize: 13, fontWeight: 'bold', color: colors.textSecondary },
  presetBtnTextActive: { color: colors.success },

  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 16 },

  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  methodCardActive: { borderColor: colors.accentPrimary, backgroundColor: 'rgba(16, 185, 129, 0.05)' },
  methodIconWrapper: { marginRight: 12 },
  methodIcon: { width: 40, height: 40, borderRadius: 20 },
  methodDetails: { flex: 1 },
  methodName: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  methodSub: { fontSize: 10, color: colors.textSecondary },
  methodRight: { alignItems: 'flex-end' },
  methodFee: { fontSize: 11, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  methodType: { fontSize: 10, color: colors.textSecondary },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 32 },
  toggleTitle: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  toggleSubtitle: { fontSize: 11, color: colors.textSecondary, lineHeight: 16 },

  submitBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, backgroundColor: colors.accentPrimary, alignItems: 'center', shadowColor: colors.accentPrimary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  submitBtnDisabled: { backgroundColor: colors.textTertiary, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
