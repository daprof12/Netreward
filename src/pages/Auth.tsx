import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, type UserRole } from '@/stores/useAuthStore';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, Fingerprint, Loader2, KeyRound, ChevronLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import LocationSearch from '@/components/LocationSearch';
import { useToastStore } from '@/stores/useToastStore';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import nrtLogo from '@/assets/nrt-logo.png';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().optional(),
  country: z.string().optional(),
});

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type AuthFormValues = z.infer<typeof authSchema>;
type ForgotFormValues = z.infer<typeof forgotSchema>;
type AuthView = 'auth' | 'forgot' | 'forgot_sent';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('auth');
  const { setUser } = useAuthStore();
  const { biometricsEnabled, isBiometricSetup, pin } = useSecurityStore();
  const { showToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [displayNameSuggestion, setDisplayNameSuggestion] = useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);

  const { register, handleSubmit, formState: { errors }, clearErrors, setError, setValue, watch } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '', displayName: '', country: '' }
  });

  const watchedDisplayName = watch('displayName');

  useEffect(() => {
    if (isLogin || !watchedDisplayName || watchedDisplayName.trim().length < 2) {
      setDisplayNameSuggestion(null);
      if (errors.displayName?.type === 'manual') clearErrors('displayName');
      return;
    }

    const checkName = async () => {
      setIsCheckingName(true);
      try {
        const { data, error } = await supabase.rpc('check_display_name_availability', {
          p_display_name: watchedDisplayName.trim()
        });

        if (error) throw error;

        if (data && !data.available) {
          setError('displayName', { type: 'manual', message: 'Display name is taken' });
          if (data.suggestion) {
            setDisplayNameSuggestion(data.suggestion);
          }
        } else {
          if (errors.displayName?.type === 'manual') clearErrors('displayName');
          setDisplayNameSuggestion(null);
        }
      } catch (err) {
        console.error('Error checking display name:', err);
      } finally {
        setIsCheckingName(false);
      }
    };

    const timeoutId = setTimeout(checkName, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedDisplayName, isLogin, setError, clearErrors]);

  const { register: registerForgot, handleSubmit: handleForgotSubmit, formState: { errors: forgotErrors } } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' }
  });

  const onSubmit = async (data: AuthFormValues) => {
    if (!isLogin) {
      let hasError = false;
      if (!data.displayName || data.displayName.trim() === '') {
        setError('displayName', { type: 'manual', message: 'Display name is required' });
        hasError = true;
      }
      if (!data.country || data.country.trim() === '') {
        setError('country', { type: 'manual', message: 'Please select your location' });
        hasError = true;
      }
      if (hasError) return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        showToast('Logged in successfully', 'success');
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

        // Ensure the location is synced to the public table immediately
        if (authData.user) {
          await supabase.from('users').update({ country: data.country }).eq('id', authData.user.id);
        }

        showToast('Registration successful! Please check your email to verify your account.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotSubmit = async (data: ForgotFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotEmail(data.email);
      setAuthView('forgot_sent');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset email. Please try again.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };


  const toggleMode = (login: boolean) => {
    setIsLogin(login);
    clearErrors();
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent-primary/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px] pointer-events-none"></div>

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src={nrtLogo} alt="NetReward" className="w-10 h-10 rounded-xl object-contain" />
            <h1 className="text-2xl font-bold tracking-tight text-gradient">NetReward</h1>
          </div>
          <p className="text-text-secondary text-sm">Your Data, Your Rewards, Your Growth</p>
        </div>

        <AnimatePresence mode="wait">

          {/* ── FORGOT PASSWORD — EMAIL SENT ── */}
          {authView === 'forgot_sent' && (
            <motion.div
              key="forgot_sent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-[24px] p-8 shadow-2xl shadow-accent-primary/5 text-center"
            >
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/20">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Check Your Email</h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-2">
                We've sent a password reset link to
              </p>
              <p className="font-bold text-accent-primary mb-6 break-all">{forgotEmail}</p>
              <p className="text-text-secondary text-xs mb-8">
                Click the link in the email to reset your password. The link expires in 1 hour.
              </p>
              <button
                onClick={() => setAuthView('auth')}
                className="w-full py-3 bg-bg-secondary rounded-xl font-semibold text-sm text-text-secondary hover:text-text-primary transition-colors border border-glass-border"
              >
                Back to Sign In
              </button>
            </motion.div>
          )}

          {/* ── FORGOT PASSWORD — FORM ── */}
          {authView === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-[24px] p-6 shadow-2xl shadow-accent-primary/5"
            >
              <button
                type="button"
                onClick={() => setAuthView('auth')}
                className="flex items-center gap-1.5 text-text-secondary text-sm font-medium mb-5 hover:text-text-primary transition-colors"
              >
                <ChevronLeft size={18} /> Back to Sign In
              </button>

              <h2 className="text-2xl font-bold mb-1">Forgot Password?</h2>
              <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                No worries! Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleForgotSubmit(onForgotSubmit)} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                    <input
                      type="email"
                      placeholder="Your email address"
                      {...registerForgot('email')}
                      className={`w-full bg-bg-secondary border ${forgotErrors.email ? 'border-red-500' : 'border-glass-border'} rounded-xl py-3 pl-10 pr-4 text-text-primary outline-none focus:border-accent-primary transition-colors`}
                    />
                  </div>
                  {forgotErrors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {forgotErrors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-accent-primary text-primary-foreground font-semibold py-3.5 rounded-xl shadow-lg shadow-accent-primary/25 active:scale-[0.98] transition-all disabled:opacity-70"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Send Reset Link <ArrowRight size={20} /></>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── MAIN AUTH FORM ── */}
          {authView === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-[24px] p-6 shadow-2xl shadow-accent-primary/5"
            >
              <div className="flex bg-bg-secondary p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => toggleMode(true)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => toggleMode(false)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-secondary'}`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Simple conditional for Display Name */}
                {!isLogin && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="relative overflow-hidden mb-4"
                    >
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                        <input
                          type="text"
                          placeholder="Display Name"
                          {...register('displayName', { required: !isLogin })}
                          className={`w-full bg-bg-secondary border ${errors.displayName ? 'border-red-500' : 'border-glass-border'} rounded-xl py-3 pl-10 pr-10 text-text-primary outline-none focus:border-accent-primary transition-colors`}
                        />
                        {isCheckingName && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-text-secondary" />
                          </div>
                        )}
                      </div>
                      {errors.displayName && (
                        <div className="mt-1">
                          <p className="text-red-500 text-xs flex items-center gap-1">
                            <AlertCircle size={12} /> {errors.displayName.message}
                          </p>
                          {displayNameSuggestion && (
                            <p className="text-xs text-text-secondary mt-1">
                              Suggestion:{' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setValue('displayName', displayNameSuggestion, { shouldValidate: true });
                                  setDisplayNameSuggestion(null);
                                  clearErrors('displayName');
                                }}
                                className="text-accent-primary font-bold hover:underline"
                              >
                                {displayNameSuggestion}
                              </button>
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="relative z-50 mb-4"
                    >
                      <LocationSearch
                        value={watch('country') || ''}
                        onChange={(val) => {
                          setValue('country', val, { shouldValidate: true });
                          if (val) clearErrors('country');
                        }}
                        placeholder="Search your country or city"
                        hasError={!!errors.country}
                      />
                      {errors.country && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {errors.country.message}
                        </p>
                      )}
                    </motion.div>
                  </>
                )}

                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                    <input
                      type="email"
                      placeholder="Email address"
                      {...register('email')}
                      className={`w-full bg-bg-secondary border ${errors.email ? 'border-red-500' : 'border-glass-border'} rounded-xl py-3 pl-10 pr-4 text-text-primary outline-none focus:border-accent-primary transition-colors`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      {...register('password')}
                      className={`w-full bg-bg-secondary border ${errors.password ? 'border-red-500' : 'border-glass-border'} rounded-xl py-3 pl-10 pr-12 text-text-primary outline-none focus:border-accent-primary transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.password.message}
                    </p>
                  )}
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setAuthView('forgot')}
                      className="text-sm font-medium text-accent-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || isBiometricLoading}
                    className="w-full flex items-center justify-center gap-2 bg-accent-primary text-primary-foreground font-semibold py-3.5 rounded-xl shadow-lg shadow-accent-primary/25 active:scale-[0.98] transition-all disabled:opacity-70"
                  >
                    <span key={isLoading ? 'loading' : 'content'} className="flex items-center gap-2">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {isLogin ? 'Sign In' : 'Sign Up'}
                          <ArrowRight size={20} />
                        </>
                      )}
                    </span>
                  </button>

                  {isLogin && (
                    <div className="text-center mt-4">
                      <p className="text-xs text-text-secondary">
                        Security Notice: Biometric and PIN unlock are configured in Settings after logging in.
                      </p>
                    </div>
                  )}
                </div>
              </form>

              <div className="mt-6">
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-glass-border"></div>
                  <span className="flex-shrink-0 mx-4 text-text-secondary text-sm">or continue with</span>
                  <div className="flex-grow border-t border-glass-border"></div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: { redirectTo: `${window.location.origin}` }
                        });
                        if (error) throw error;
                      } catch (err: any) {
                        showToast(err.message || 'Google sign-in failed', 'danger');
                      }
                    }}
                    className="flex-1 glass flex items-center justify-center py-2.5 rounded-xl border border-glass-border hover:bg-glass-bg/50 transition-colors active:scale-[0.97]"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.signInWithOAuth({
                          provider: 'apple',
                          options: { redirectTo: `${window.location.origin}` }
                        });
                        if (error) throw error;
                      } catch (err: any) {
                        showToast(err.message || 'Apple sign-in failed', 'danger');
                      }
                    }}
                    className="flex-1 glass flex items-center justify-center py-2.5 rounded-xl border border-glass-border hover:bg-glass-bg/50 transition-colors active:scale-[0.97]"
                  >
                    <svg className="w-7 h-7 text-text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.64-2.2.52-3.06-.4C3.79 16.17 4.36 9.93 8.69 9.67c1.24.07 2.1.72 2.82.78.86-.18 1.68-.88 2.63-.85 1.13.05 1.97.52 2.53 1.34-2.32 1.4-1.77 4.45.38 5.3-.46 1.2-.98 2.38-2.01 4.04zM12.05 9.6c-.12-2.07 1.5-3.84 3.44-4 .26 2.29-2.07 3.99-3.44 4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>

    </div>
  );
}
