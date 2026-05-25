import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Delete, CheckCircle2, Shield } from 'lucide-react-native';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { useThemeColors, shadows } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PinSetupScreen() {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{currentPin ? 'Change PIN' : 'Set PIN'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {step !== 'success' ? (
          <View style={styles.setupContainer}>
            <View style={styles.iconCircle}>
              <Shield size={32} color={colors.warning} />
            </View>
            
            <Text style={styles.title}>
              {step === 'enter' ? 'Create a 4-Digit PIN' : 'Confirm your PIN'}
            </Text>
            <Text style={styles.subtitle}>
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
                    style={[
                      styles.dot,
                      isActive ? styles.activeDot : styles.inactiveDot
                    ]}
                  />
                );
              })}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={40} color={colors.success} />
            </View>
            <Text style={styles.title}>PIN Set Successfully!</Text>
            <Text style={styles.subtitle}>
              Your PIN is now active and will be required for secure actions.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        )}

        {step !== 'success' && (
          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map((btn, i) => {
              if (btn === '') return <View key={i} style={styles.keypadBtn} />;
              if (btn === 'delete') {
                return (
                  <Pressable
                    key={i}
                    onPress={handleDelete}
                    style={styles.keypadBtn}
                  >
                    <Delete size={24} color={colors.textSecondary} />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={i}
                  onPress={() => handleNumber(btn)}
                  style={({ pressed }) => [
                    styles.keypadBtn,
                    pressed && styles.keypadBtnPressed
                  ]}
                >
                  <Text style={styles.keypadText}>{btn}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  setupContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  successContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 4,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  activeDot: {
    backgroundColor: colors.accentPrimary,
    borderColor: colors.accentPrimary,
    ...shadows.glow,
  },
  inactiveDot: {
    backgroundColor: 'transparent',
    borderColor: colors.glassBorder,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 280,
    gap: 16,
    marginBottom: 40,
  },
  keypadBtn: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
  },
  keypadBtnPressed: {
    backgroundColor: colors.bgSecondary,
  },
  keypadText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  doneButton: {
    width: '100%',
    height: 56,
    backgroundColor: colors.accentPrimary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    ...shadows.glow,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
