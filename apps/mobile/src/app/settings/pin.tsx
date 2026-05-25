import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Delete, CheckCircle2, Shield } from 'lucide-react-native';

import { useThemeColors } from '@/theme';
import { useSecurityStore } from '@/stores/useSecurityStore';

export default function PinScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();
  const { setPin, pin: currentPin } = useSecurityStore();
  
  const [pin, setPinState] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm' | 'success'>('enter');
  const [error, setError] = useState('');

  const handleNumber = (num: string) => {
    setError('');
    if (step === 'enter') {
      if (pin.length < 4) {
        const newPin = pin + num;
        setPinState(newPin);
        if (newPin.length === 4) {
          setTimeout(() => setStep('confirm'), 300);
        }
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + num;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 4) {
          if (newConfirm === pin) {
            setStep('success');
            setPin(newConfirm);
          } else {
            setError('PINs do not match. Try again.');
            setTimeout(() => {
              setConfirmPin('');
              setStep('enter');
              setPinState('');
            }, 1000);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'enter') {
      setPinState(pin.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{currentPin ? 'Change PIN' : 'Set PIN'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {step !== 'success' ? (
          <View style={styles.setupView}>
            <View style={styles.iconContainer}>
              <Shield size={32} color="#f97316" />
            </View>
            
            <Text style={styles.title}>
              {step === 'enter' ? 'Create a 4-Digit PIN' : 'Confirm your PIN'}
            </Text>
            <Text style={styles.desc}>
              {step === 'enter' 
                ? 'Enter a PIN to secure your transactions and login.' 
                : 'Please re-enter your PIN to confirm.'}
            </Text>

            <View style={styles.dotsContainer}>
              {[1, 2, 3, 4].map((i) => {
                const val = step === 'enter' ? pin : confirmPin;
                const isActive = val.length >= i;
                return (
                  <View 
                    key={i} 
                    style={[styles.dot, isActive && styles.dotActive]} 
                  />
                );
              })}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : <Text style={styles.errorText}> </Text>}

            <View style={styles.keypad}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['', '0', 'delete']
              ].map((row, i) => (
                <View key={i} style={styles.keypadRow}>
                  {row.map((key, j) => (
                    <Pressable 
                      key={j} 
                      style={({ pressed }) => [styles.keypadBtn, pressed && key !== '' && { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                      onPress={() => {
                        if (key === 'delete') handleDelete();
                        else if (key !== '') handleNumber(key);
                      }}
                      disabled={key === ''}
                    >
                      {key === 'delete' ? (
                        <Delete size={24} color={colors.textPrimary} />
                      ) : (
                        <Text style={styles.keypadBtnText}>{key}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.successView}>
            <View style={styles.successIcon}>
              <CheckCircle2 size={40} color="#22c55e" />
            </View>
            <Text style={styles.title}>PIN Set Successfully!</Text>
            <Text style={styles.desc}>Your PIN is now active and will be required for secure actions.</Text>
            
            <Pressable 
              style={styles.doneBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  
  setupView: { alignItems: 'center', width: '100%' },
  iconContainer: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(249, 115, 22, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  
  dotsContainer: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.glassBorder },
  dotActive: { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary },
  errorText: { color: '#ef4444', fontSize: 14, fontWeight: '500', height: 20, marginBottom: 32 },

  keypad: { width: '100%', maxWidth: 300 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  keypadBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  keypadBtnText: { fontSize: 28, color: colors.textPrimary, fontWeight: '500' },

  successView: { alignItems: 'center', width: '100%' },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 4, borderColor: 'rgba(34, 197, 94, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  doneBtn: { width: '100%', backgroundColor: colors.accentPrimary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
