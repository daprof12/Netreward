import { useState } from 'react';
import { LogIn, Eye, EyeOff, ExternalLink, Loader2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup' | 'forgot-password';

export default function LoginPage() {
  const { signIn } = useAuthStore();
  const [mode, setMode] = useState<Mode>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    setSuccess('');

    if (mode === 'login') {
      if (!password) { setLoading(false); return; }
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    } else if (mode === 'signup') {
      if (!password) { setLoading(false); return; }
      try {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setSuccess('Signup successful! You can now log in.');
        setMode('login');
      } catch (err: any) {
        setError(err.message || 'Signup failed');
      }
    } else if (mode === 'forgot-password') {
      try {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email);
        if (err) throw err;
        setSuccess('Password reset instructions sent to your email.');
        setTimeout(() => setMode('login'), 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to send reset instructions');
      }
    }
    
    setLoading(false);
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError('');
      // Extension environment might need specific redirect or popup logic
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // You might need to configure this specifically for your extension
          redirectTo: chrome?.identity?.getRedirectURL ? chrome.identity.getRedirectURL() : window.location.origin
        }
      });
      if (err) throw err;
    } catch (err: any) {
      setError(err.message || `${provider} login failed`);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '32px 24px' }} className="fade-in">
      
      {mode !== 'login' && (
        <button 
          onClick={() => { setMode('login'); setError(''); setSuccess(''); }} 
          style={{ position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
      )}

      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }} className="glow-pulse">
          <img src="/nrt-logo.svg" alt="NetReward Logo" style={{ width: 32, height: 32 }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>NetReward</h1>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
          {mode === 'login' ? 'Sign in to start earning NRT' : mode === 'signup' ? 'Create an account to earn NRT' : 'Reset your password'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        
        {mode !== 'forgot-password' && (
          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {mode === 'login' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span 
              onClick={() => setMode('forgot-password')}
              style={{ fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
            >
              Forgot Password?
            </span>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#10b981', fontWeight: 600 }}>
            {success}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={16} />}
          {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
        </button>
      </form>

      {/* Social Logins */}
      {mode !== 'forgot-password' && (
        <div style={{ width: '100%', marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>OR CONTINUE WITH</span>
            <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              type="button"
              className="btn-secondary" 
              style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 10 }}
              onClick={() => handleSocialLogin('google')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </button>
            <button 
              type="button"
              className="btn-secondary" 
              style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 10 }}
              onClick={() => handleSocialLogin('apple')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M16.365 7.42c.797-.992 1.32-2.316 1.173-3.64-.108-.008-.224-.01-.337-.01-1.353 0-2.825.848-3.643 1.848-.737.902-1.332 2.277-1.157 3.565 1.488.115 2.923-.742 3.964-1.763zm-4.482 14.542c-1.304-.002-1.748-.828-3.238-.828-1.503 0-2.016.808-3.25.842-1.282.036-2.47-1.163-3.69-2.946-2.585-3.784-3.18-8.232-1.29-10.843 1.34-1.854 3.284-2.817 5.258-2.817 1.614 0 2.98.922 4.02.922 1.054 0 2.7-.935 4.546-.935 1.517.027 3.3.627 4.536 2.023-3.742 1.93-3.208 6.945.398 8.44-1.077 2.853-3.13 5.485-4.832 5.568-.788.038-1.554-.426-2.458-.426z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle mode */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }} 
            style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
          >
            {mode === 'login' ? 'Sign Up' : 'Log In'}
          </span>
        </p>
      </div>
    </div>
  );
}
