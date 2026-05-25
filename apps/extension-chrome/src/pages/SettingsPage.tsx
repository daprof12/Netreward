import { User, ExternalLink, LogOut, Shield, Bell, Moon, Sun, Globe, DollarSign, Gamepad2 } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTrackingStore } from '../stores/useTrackingStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export default function SettingsPage() {
  const { profile, signOut } = useAuthStore();
  const { isTracking, toggleTracking } = useTrackingStore();
  const { theme, setTheme, language, setLanguage, currency, setCurrency } = useSettingsStore();

  return (
    <div className="page fade-in">
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 900 }}>Settings</h2>
        <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>Manage your extension preferences</p>
      </div>

      {/* Profile Card */}
      <div className="glass" style={{ borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover' }} />
          ) : (
            <User size={20} color="#6366f1" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile?.display_name || profile?.email?.split('@')[0]}
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{profile?.email}</p>
        </div>
        <span className="badge badge-role" style={{ flexShrink: 0 }}>Standard User</span>
      </div>

      {/* Settings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
        
        {/* Tracking Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={16} color="var(--accent-primary)" />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700 }}>Data Tracking</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Allow network usage monitoring</p>
            </div>
          </div>
          <div className={`toggle ${isTracking ? 'active' : ''}`} onClick={toggleTracking}>
            <div className="toggle-dot" />
          </div>
        </div>

        {/* Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {theme === 'dark' ? <Moon size={16} color="#8b5cf6" /> : <Sun size={16} color="#f59e0b" />}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700 }}>Theme</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Light or Dark mode</p>
            </div>
          </div>
          <div className={`toggle ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <div className="toggle-dot" />
          </div>
        </div>

        {/* Language */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={16} color="#3b82f6" />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700 }}>Language</p>
            </div>
          </div>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as any)}
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, outline: 'none' }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>

        {/* Currency */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DollarSign size={16} color="#10b981" />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700 }}>Currency</p>
            </div>
          </div>
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value as any)}
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, outline: 'none' }}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="NGN">NGN (₦)</option>
          </select>
        </div>

        {/* Gaming Accounts */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gamepad2 size={16} color="#ec4899" />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700 }}>Gaming Accounts</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Manage linked game profiles</p>
            </div>
          </div>
          <button style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>
            Manage
          </button>
        </div>

        {/* Notifications */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={16} color="#f59e0b" />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700 }}>Notifications</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Reward and campaign alerts</p>
            </div>
          </div>
          <div className="toggle active">
            <div className="toggle-dot" />
          </div>
        </div>

        {/* Open Web Dashboard */}
        <button
          onClick={() => window.open('https://netreward.online', '_blank')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px',
            background: 'transparent', border: 'none',
            cursor: 'pointer', width: '100%',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <ExternalLink size={16} color="#3b82f6" />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Open Full Dashboard</p>
            <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>netreward.online</p>
          </div>
        </button>

        {/* Sign Out */}
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px',
            background: 'transparent', border: 'none',
            cursor: 'pointer', width: '100%',
          }}
        >
          <LogOut size={16} color="#ef4444" />
          <p style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', textAlign: 'left' }}>Sign Out</p>
        </button>
      </div>

      {/* Version */}
      <p style={{ fontSize: 9, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 4 }}>
        NetReward Extension v1.0.0
      </p>
    </div>
  );
}
