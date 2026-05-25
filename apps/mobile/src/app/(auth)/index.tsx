import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions } from 'react-native';
import { useAuthStore } from '@/stores/useAuthStore';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, ChevronLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useThemeColors, shadows } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import LocationSearch from '@/components/LocationSearch';

const { width } = Dimensions.get('window');

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().optional(),
  country: z.string().optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [isLogin, setIsLogin] = useState(true);
  const [authView, setAuthView] = useState<'auth' | 'forgot' | 'forgot_sent'>('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const { control, handleSubmit, formState: { errors }, clearErrors, setError, setValue, watch } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '', displayName: '', country: '' }
  });

  const onSubmit = async (data: AuthFormValues) => {
    if (!isLogin) {
      if (!data.displayName || data.displayName.trim() === '') {
        setError('displayName', { type: 'manual', message: 'Display name is required' });
        return;
      }
      if (!data.country || data.country.trim() === '') {
        setError('country', { type: 'manual', message: 'Country is required' });
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
      } else {
        const { error, data: authData } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              display_name: data.displayName,
              country: data.country
            }
          }
        });
        if (error) throw error;

        if (authData.user) {
          await supabase.from('users').update({ country: data.country }).eq('id', authData.user.id);
        }

        Alert.alert('Success', 'Registration successful! Please check your email to verify your account.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotSubmit = async () => {
    const email = watch('email');
    if (!email) {
      Alert.alert('Error', 'Please enter your email first');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setForgotEmail(email);
      setAuthView('forgot_sent');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (login: boolean) => {
    setIsLogin(login);
    clearErrors();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Orbs to match Web theme */}
      <View style={styles.bgOrbTopLeft} />
      <View style={styles.bgOrbBottomRight} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <Text style={styles.title}>NetReward</Text>
            <Text style={styles.subtitle}>Your Data, Your Rewards, Your Growth</Text>
          </View>

          {authView === 'forgot_sent' && (
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <CheckCircle2 size={40} color={colors.success} />
              </View>
              <Text style={styles.cardTitle}>Check Your Email</Text>
              <Text style={styles.cardText}>We've sent a password reset link to</Text>
              <Text style={styles.emailText}>{forgotEmail}</Text>
              <Pressable style={styles.secondaryButton} onPress={() => setAuthView('auth')}>
                <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
              </Pressable>
            </View>
          )}

          {authView === 'forgot' && (
            <View style={styles.card}>
              <Pressable style={styles.backButton} onPress={() => setAuthView('auth')}>
                <ChevronLeft size={20} color={colors.textSecondary} />
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </Pressable>
              <Text style={styles.cardTitle}>Forgot Password?</Text>
              <Text style={styles.cardText}>Enter your email address to reset your password.</Text>
              
              <View style={styles.inputContainer}>
                <Mail color={colors.textSecondary} size={20} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      placeholderTextColor={colors.textTertiary}
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  )}
                />
              </View>

              <Pressable style={styles.primaryButton} onPress={onForgotSubmit} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.primaryButtonText}>Send Reset Link</Text>}
              </Pressable>
            </View>
          )}

          {authView === 'auth' && (
            <View style={styles.card}>
              <View style={styles.tabContainer}>
                <Pressable 
                  style={[styles.tab, isLogin && styles.activeTab]} 
                  onPress={() => toggleMode(true)}
                >
                  <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Login</Text>
                </Pressable>
                <Pressable 
                  style={[styles.tab, !isLogin && styles.activeTab]} 
                  onPress={() => toggleMode(false)}
                >
                  <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
                </Pressable>
              </View>

              {!isLogin && (
                <>
                  <View style={styles.inputContainer}>
                    <UserIcon color={colors.textSecondary} size={20} style={styles.inputIcon} />
                    <Controller
                      control={control}
                      name="displayName"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Display Name"
                          placeholderTextColor={colors.textTertiary}
                          value={value}
                          onChangeText={onChange}
                        />
                      )}
                    />
                  </View>
                  {errors.displayName && <Text style={styles.errorText}>{errors.displayName.message}</Text>}

                  <View style={{ marginBottom: 12 }}>
                    <Controller
                      control={control}
                      name="country"
                      render={({ field: { onChange, value } }) => (
                        <LocationSearch
                          value={value || ''}
                          onChange={onChange}
                          placeholder="Search country..."
                          hasError={!!errors.country}
                        />
                      )}
                    />
                  </View>
                  {errors.country && <Text style={styles.errorText}>{errors.country.message}</Text>}
                </>
              )}

              <View style={styles.inputContainer}>
                <Mail color={colors.textSecondary} size={20} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      placeholderTextColor={colors.textTertiary}
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  )}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

              <View style={styles.inputContainer}>
                <Lock color={colors.textSecondary} size={20} style={styles.inputIcon} />
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={colors.textTertiary}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                    />
                  )}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  {showPassword ? <EyeOff color={colors.textSecondary} size={20} /> : <Eye color={colors.textSecondary} size={20} />}
                </Pressable>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

              {isLogin && (
                <Pressable onPress={() => setAuthView('forgot')} style={{ alignItems: 'flex-end', marginTop: 8 }}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              )}

              <Pressable style={styles.primaryButton} onPress={handleSubmit(onSubmit)} disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
                    <ArrowRight size={20} color="#0f172a" />
                  </>
                )}
              </Pressable>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialContainer}>
                <Pressable 
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Notice', 'Google login will be handled by Expo AuthSession')}
                >
                  <Svg width="20" height="20" viewBox="0 0 24 24">
                    <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </Svg>
                </Pressable>
                <Pressable 
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Notice', 'Apple login will be handled by Expo AuthSession')}
                >
                  <Svg width="24" height="24" viewBox="0 0 24 24" fill={colors.textPrimary}>
                    <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.64-2.2.52-3.06-.4C3.79 16.17 4.36 9.93 8.69 9.67c1.24.07 2.1.72 2.82.78.86-.18 1.68-.88 2.63-.85 1.13.05 1.97.52 2.53 1.34-2.32 1.4-1.77 4.45.38 5.3-.46 1.2-.98 2.38-2.01 4.04zM12.05 9.6c-.12-2.07 1.5-3.84 3.44-4 .26 2.29-2.07 3.99-3.44 4z" />
                  </Svg>
                </Pressable>
              </View>

            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    position: 'relative',
  },
  bgOrbTopLeft: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(5, 150, 105, 0.15)', // Green accentPrimary with opacity
  },
  bgOrbBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.md,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgPrimary,
    padding: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.bgSecondary,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  forgotText: {
    color: colors.accentPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentPrimary,
    height: 56,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    ...shadows.glow,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    marginTop: 24,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accentPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  dividerText: {
    color: colors.textSecondary,
    paddingHorizontal: 16,
    fontSize: 12,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
