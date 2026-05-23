import { useState } from 'react';
import { LogIn, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

export default function LoginPage() {
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '32px 24px' }} className="fade-in">
      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }} className="glow-pulse">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>NetReward</h1>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Sign in to start earning NRT</p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
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

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <LogIn size={16} />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Web App Link */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={() => window.open('https://netreward.online', '_blank')}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto' }}
        >
          <ExternalLink size={12} />
          Open Web Dashboard
        </button>
        <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Don't have an account?{' '}
          <span onClick={() => window.open('https://netreward.online/auth', '_blank')} style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}>
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}
