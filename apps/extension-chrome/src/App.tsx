import { useState, useEffect } from 'react';
import { Home, Zap, Settings, Loader2 } from 'lucide-react';
import { useAuthStore } from './stores/useAuthStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import SettingsPage from './pages/SettingsPage';

type Tab = 'dashboard' | 'campaigns' | 'settings';

export default function App() {
  const { profile, isLoading, isAuthenticated, initialize } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    initialize();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 520, gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Loading NetReward...</p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !profile) {
    return <LoginPage />;
  }

  // Authenticated — show tabbed interface
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 520 }}>
      {/* Header */}
      <div className="header">
        <div className="header-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <span>NetReward</span>
        </div>
        <span className="badge badge-active" style={{ fontSize: 9 }}>
          ● Connected
        </span>
      </div>

      {/* Page Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'campaigns' && <CampaignsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>

      {/* Bottom Navigation */}
      <div className="nav">
        {([
          { id: 'dashboard' as Tab, icon: Home, label: 'Dashboard' },
          { id: 'campaigns' as Tab, icon: Zap, label: 'Campaigns' },
          { id: 'settings' as Tab, icon: Settings, label: 'Settings' },
        ]).map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
