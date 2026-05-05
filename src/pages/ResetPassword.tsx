import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/useToastStore';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sets the session automatically when the user clicks the reset link.
  // We listen to the auth state change to confirm the session is ready.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const passwordStrength = (): { label: string; color: string; width: string } => {
    if (password.length === 0) return { label: '', color: 'bg-bg-secondary', width: '0%' };
    if (password.length < 6) return { label: 'Too short', color: 'bg-red-500', width: '25%' };
    if (password.length < 8) return { label: 'Weak', color: 'bg-orange-500', width: '50%' };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: 'Fair', color: 'bg-amber-500', width: '75%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = passwordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'danger');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'danger');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsSuccess(true);
      showToast('Password updated successfully!', 'success');
      setTimeout(() => navigate('/auth', { replace: true }), 3000);
    } catch (err: any) {
      showToast(err.message || 'Failed to update password. Please try again.', 'danger');
    } finally {
      setIsLoading(false);
    }
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gradient mb-2">NetReward</h1>
          <p className="text-text-secondary">Your Data, Your Rewards, Your Power</p>
        </div>

        <div className="glass rounded-[24px] p-6 shadow-2xl shadow-accent-primary/5">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/20">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Password Updated!</h2>
              <p className="text-text-secondary text-sm">
                Your password has been reset successfully. Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1">Set New Password</h2>
              <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                Choose a strong password to secure your NetReward account.
              </p>

              {!sessionReady && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-3 mb-4">
                  <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Waiting for secure session… If nothing happens, please re-click the link in your email.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl py-3 pl-10 pr-10 text-text-primary outline-none focus:border-accent-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${strength.color}`}
                          style={{ width: strength.width }}
                        />
                      </div>
                      <p className={`text-xs mt-1 font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className={`w-full bg-bg-secondary border ${confirmPassword && confirmPassword !== password ? 'border-red-500' : 'border-glass-border'} rounded-xl py-3 pl-10 pr-10 text-text-primary outline-none focus:border-accent-primary transition-colors`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Passwords do not match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !sessionReady || password.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-accent-primary text-primary-foreground font-semibold py-3.5 rounded-xl shadow-lg shadow-accent-primary/25 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Update Password <ArrowRight size={20} /></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
