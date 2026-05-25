import { useEffect } from 'react';
import { Wallet, Activity, Zap, ArrowUpDown, TrendingUp, Wifi } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTrackingStore } from '../stores/useTrackingStore';
import { useSettingsStore } from '../stores/useSettingsStore';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const { currency, nrtPrice } = useSettingsStore();
  const { isTracking, nrtBalance, todayBytesUp, todayBytesDown, todayNrtEarned, activeCampaignCount, toggleTracking, fetchDashboardData } = useTrackingStore();

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData(profile.id);
    }
  }, [profile?.id]);

  const totalBytes = todayBytesUp + todayBytesDown;
  
  // Basic mock conversion rate for display purposes only
  const conversionRates: Record<string, number> = { USD: 0.005, EUR: 0.0046, GBP: 0.00395, NGN: 7.5 };
  const baseRate = conversionRates[currency] || 0.005;
  const rate = nrtPrice * (baseRate / 0.005);
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₦';
  const equivalentBalance = (nrtBalance * rate).toFixed(10);

  return (
    <div className="page fade-in">
      {/* Welcome + Tracking Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700 }}>
            Welcome, <span style={{ color: 'var(--accent-primary)' }}>{profile?.display_name || profile?.email?.split('@')[0]}</span>
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
            {isTracking ? '🟢 Tracking active' : '🔴 Tracking paused'}
          </p>
        </div>
        <div className={`toggle ${isTracking ? 'active' : ''}`} onClick={toggleTracking}>
          <div className="toggle-dot" />
        </div>
      </div>

      {/* Main Balance Card */}
      <div className="glass" style={{ borderRadius: 16, padding: 16, background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={16} color="#6366f1" />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NRT Balance</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline' }}>
          {nrtBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700, marginLeft: 6 }}>NRT</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>
          ≈ {currencySymbol}{equivalentBalance} {currency}
        </div>
      </div>

      {/* Today's Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <TrendingUp size={14} color="#10b981" />
          </div>
          <span className="stat-label">Earned Today</span>
          <span className="stat-value" style={{ fontSize: 16, color: '#10b981' }}>
            +{todayNrtEarned.toFixed(4)}
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <ArrowUpDown size={14} color="#3b82f6" />
          </div>
          <span className="stat-label">Data Today</span>
          <span className="stat-value" style={{ fontSize: 16 }}>
            {formatBytes(totalBytes)}
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Activity size={14} color="#f59e0b" />
          </div>
          <span className="stat-label">Active Campaigns</span>
          <span className="stat-value" style={{ fontSize: 16 }}>
            {activeCampaignCount}
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <Wifi size={14} color="#8b5cf6" />
          </div>
          <span className="stat-label">Upload</span>
          <span className="stat-value" style={{ fontSize: 16 }}>
            {formatBytes(todayBytesUp)}
          </span>
        </div>
      </div>

      {/* Tracking Status Banner */}
      {isTracking && (
        <div className="glass" style={{ borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="glow-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Telemetry Active</p>
            <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Data is being tracked across your browsing sessions</p>
          </div>
        </div>
      )}
    </div>
  );
}
