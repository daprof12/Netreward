import { User, ExternalLink, LogOut, Shield, Bell } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTrackingStore } from '../stores/useTrackingStore';

export default function SettingsPage() {
  const { profile, signOut } = useAuthStore();
  const { isTracking, toggleTracking } = useTrackingStore();

  const roleLabel = { user: 'Standard User', sp: 'Service Provider', isp: 'ISP Network', admin: 'Administrator' };

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
        <span className="badge badge-role" style={{ flexShrink: 0 }}>
          {roleLabel[profile?.active_role || profile?.role || 'user']}
        </span>
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

        {/* Switch Role */}
        {(profile?.role === 'sp' || profile?.role === 'isp' || profile?.role === 'admin') && (
          <button
            onClick={() => window.open(`https://netreward.online/${profile.role === 'admin' ? 'admin' : `dashboard/${profile.role}`}`, '_blank')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', width: '100%',
              borderBottom: '1px solid var(--glass-border)',
            }}
          >
            <User size={16} color="var(--accent-primary)" />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Switch Role Context</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Open {roleLabel[profile.role]} Dashboard</p>
            </div>
          </button>
        )}

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
