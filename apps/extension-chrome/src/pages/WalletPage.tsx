import { Wallet, ArrowRightLeft, QrCode, ExternalLink, History } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

const WEB_APP_URL = 'https://netreward.online';

export default function WalletPage() {
  const { profile } = useAuthStore();

  const openWebApp = (path: string) => {
    window.open(`${WEB_APP_URL}${path}`, '_blank');
  };

  return (
    <div className="page fade-in">
      <div className="stat-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon" style={{ width: 40, height: 40, background: 'rgba(5, 150, 105, 0.15)', color: 'var(--accent-primary)' }}>
            <Wallet size={20} />
          </div>
          <div>
            <span className="stat-label">Total Balance</span>
            <div className="stat-value" style={{ fontSize: 24 }}>
              {profile?.nrt_balance?.toFixed(2) || '0.00'} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>NRT</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}
            onClick={() => openWebApp('/wallet/deposit/p2p')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <ArrowRightLeft size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: 14 }}>P2P Trading</span>
            </div>
            <ExternalLink size={14} color="var(--text-tertiary)" />
          </button>

          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}
            onClick={() => openWebApp('/wallet/scan-to-pay')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <QrCode size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: 14 }}>Scan2Pay</span>
            </div>
            <ExternalLink size={14} color="var(--text-tertiary)" />
          </button>

          <button 
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}
            onClick={() => openWebApp('/transactions')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <History size={16} color="var(--accent-primary)" />
              <span style={{ fontSize: 14 }}>Transaction History</span>
            </div>
            <ExternalLink size={14} color="var(--text-tertiary)" />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.4 }}>
          Complex operations like P2P trading and scanning QR codes are handled securely in the full Web App.
        </p>
      </div>
    </div>
  );
}
