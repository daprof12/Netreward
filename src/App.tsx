import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, Target, Settings as SettingsIcon, Smartphone, Wallet } from 'lucide-react';
import Campaigns from '@/pages/Campaigns';
import Devices from '@/pages/Devices';
import Auth from '@/pages/Auth';
import Onboarding from '@/pages/Onboarding';
import Settings from '@/pages/Settings';
import Support from '@/pages/Support';
import ReportsPage from './pages/ReportsPage';
import SpDashboard from '@/pages/SpDashboard';
import IspDashboard from '@/pages/IspDashboard';
import DeviceDetail from '@/pages/DeviceDetail';
import UserHome from '@/pages/UserHome';
import WalletPage from '@/pages/WalletPage';
import DepositHub from '@/pages/DepositHub';
import P2PFlow from '@/pages/P2PFlow';
import InstantPurchase from '@/pages/InstantPurchase';
import OPayReturn from '@/pages/OPayReturn';
import VerifiedExchanger from '@/pages/VerifiedExchanger';
import TransactionHistory from './pages/TransactionHistory';
import ScanToPay from '@/pages/ScanToPay';
import PaymentAuthorize from '@/pages/PaymentAuthorize';
import P2PMarketplace from '@/pages/P2PMarketplace';
import CreateP2POffer from '@/pages/CreateP2POffer';
import P2PPaymentAccounts from '@/pages/P2PPaymentAccounts';
import DisputeCenter from '@/pages/DisputeCenter';

import NrtWalletAddress from '@/pages/NrtWalletAddress';
import NrtTokenInfo from '@/pages/NrtTokenInfo';
import SdkDocumentation from '@/pages/SdkDocumentation';
import PaymentApiDocumentation from '@/pages/PaymentApiDocumentation';
import Referral from '@/pages/Referral';
import ProfileSettings from '@/pages/ProfileSettings';
import KYCVerification from '@/pages/KYCVerification';
import ResetPassword from '@/pages/ResetPassword';
import AdminLogin from '@/pages/admin/AdminLogin';
import SecuritySettings from '@/pages/SecuritySettings';
import NotificationSettings from '@/pages/NotificationSettings';
import PrivacySettings from '@/pages/PrivacySettings';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicyFull from '@/pages/PrivacyPolicyFull';
import AboutPage from '@/pages/AboutPage';
import PinSetupPage from '@/pages/PinSetupPage';
import GamingAccounts from '@/pages/GamingAccounts';
import ToastContainer from '@/components/ui/ToastContainer';
import NrtLoader from '@/components/ui/NrtLoader';
import AppLock from '@/components/ui/AppLock';
import NetworkStatusManager from '@/components/NetworkStatusManager';
import ThemeManager from '@/components/ThemeManager';
import { SolanaProvider } from '@/components/SolanaProvider';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';
import { useSystemStore } from '@/stores/useSystemStore';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { useWalletAutomation } from '@/hooks/useWalletAutomation';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { supabase } from '@/lib/supabase';

import CreateService from './pages/CreateService';
import CreateCampaign from './pages/CreateCampaign';
import CreateNetwork from './pages/CreateNetwork';
import CreateIspCampaign from './pages/CreateIspCampaign';
import EditService from './pages/EditService';
import EditCampaign from './pages/EditCampaign';
import EditNetwork from './pages/EditNetwork';
import EditIspCampaign from './pages/EditIspCampaign';

// Admin imports
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAudit from './pages/admin/AdminAudit';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRoles from './pages/admin/AdminRoles';
import AdminKYC from './pages/admin/AdminKYC';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminCheckout from './pages/admin/AdminCheckout';
import AdminEarnings from './pages/admin/AdminEarnings';
import AdminWallets from './pages/admin/AdminWallets';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminExchangers from './pages/admin/AdminExchangers';
import AdminPayments from './pages/admin/AdminPayments';
import AdminCampaigns from './pages/admin/AdminCampaigns';
import AdminServices from './pages/admin/AdminServices';
import AdminNetworks from './pages/admin/AdminNetworks';
import AdminDevices from './pages/admin/AdminDevices';
import AdminReferrals from './pages/admin/AdminReferrals';
import AdminTracking from './pages/admin/AdminTracking';
import AdminRewardSettings from './pages/admin/AdminRewardSettings';
import AdminTokenConfig from './pages/admin/AdminTokenConfig';
import AdminTokenLaunch from './pages/admin/AdminTokenLaunch';
import AdminApiEndpoints from './pages/admin/AdminApiEndpoints';
import AdminP2P from './pages/admin/AdminP2P';
import AdminSupport from './pages/admin/AdminSupport';
import AdminCRM from './pages/admin/AdminCRM';
import AdminSystemHealth from './pages/admin/AdminSystemHealth';
import AdminRateLimits from './pages/admin/AdminRateLimits';
import AdminSecurity from './pages/admin/AdminSecurity';
import AdminSystemOps from './pages/admin/AdminSystemOps';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import AdminBackup from './pages/admin/AdminBackup';
import AdminSettings from './pages/admin/AdminSettings';
import AdminTreasury from './pages/admin/AdminTreasury';

function BottomNav() {
  const location = useLocation();

  // Hide BottomNav on full-screen creation flows and admin routes
  const isFullScreenFlow = 
    location.pathname.includes('/create-') || 
    location.pathname.includes('/create-network') || 
    location.pathname.includes('/create-isp-campaign') ||
    location.pathname.includes('/edit-service') ||
    location.pathname.includes('/edit-campaign') ||
    location.pathname.includes('/edit-network') ||
    location.pathname.includes('/edit-isp-campaign') ||
    location.pathname === '/pay';
  const isAdmin = location.pathname.startsWith('/admin');
  if (isFullScreenFlow || isAdmin) return null;

  const navItems = [
    { icon: Home, label: 'Home', to: '/' },
    { icon: Target, label: 'Campaigns', to: '/campaigns' },
    { icon: Smartphone, label: 'Devices', to: '/devices' },
    { icon: Wallet, label: 'Wallet', to: '/wallet' },
    { icon: SettingsIcon, label: 'Settings', to: '/settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 glass border-t border-glass-border pb-safe z-50">
      <div className="flex justify-around items-center p-2 max-w-md mx-auto w-full">
        {navItems.map(({ icon: Icon, label, to }) => {
          const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to) && !location.pathname.includes('/create-'));
          return (
            <Link 
              key={label} 
              to={to} 
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors active:scale-95 ${
                isActive ? 'text-accent-primary' : 'text-text-secondary hover:text-accent-primary'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function WalletAutomationManager() {
  useWalletAutomation();
  return null;
}

function DeviceAutomationManager() {
  useDeviceManager();
  return null;
}

function App() {
  const { user, role, isOnboarded, isLoading, initialize: initAuth } = useAuthStore();
  const { initialize: initSp } = useSpStore();
  const { initialize: initIsp } = useIspStore();
  const { fetchSettings } = useSystemStore();
  const isLocked = useSecurityStore((state) => state.isLocked);
  const pin = useSecurityStore((state) => state.pin);
  const biometricsEnabled = useSecurityStore((state) => state.biometricsEnabled);
  const setIsLocked = useSecurityStore((state) => state.setIsLocked);
  const hasInitialized = useRef(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // Check maintenance mode from kv_settings
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { data } = await supabase.from('kv_settings').select('value').eq('key', 'maintenance_mode').single();
        setIsMaintenanceMode(data?.value === 'true');
      } catch { /* setting may not exist */ }
    };
    checkMaintenance();
    const id = setInterval(checkMaintenance, 30000); // Re-check every 30s
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hasInitialized.current) {
      initAuth();
      fetchSettings();
      hasInitialized.current = true;
    }
  }, [initAuth, fetchSettings]);

  // Lock the app initially if security is enabled and user is present
  const hasCheckedSecurity = useRef(false);
  useEffect(() => {
    if (user && !hasCheckedSecurity.current) {
      if (pin || biometricsEnabled) {
        setIsLocked(true);
      }
      hasCheckedSecurity.current = true;
    }
  }, [user, pin, biometricsEnabled, setIsLocked]);

  useEffect(() => {
    if (user && role === 'sp') {
      initSp(user.id);
    } else if (user && role === 'isp') {
      initIsp(user.id);
    }
  }, [user, role, initSp, initIsp]);

  if (isLoading) {
    return <NrtLoader message="Authenticating…" />;
  }

  if (!isOnboarded) {
    return (
      <>
        <ToastContainer />
        <NetworkStatusManager />
        <ThemeManager />
        <Onboarding />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <ToastContainer />
        <NetworkStatusManager />
        <ThemeManager />
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="*" element={<Auth />} />
        </Routes>
      </>
    );
  }

  // If user is present and app is locked via PIN/Biometric, show LockScreen
  if (isLocked) {
    return (
      <>
        <ToastContainer />
        <NetworkStatusManager />
        <ThemeManager />
        <AppLock />
        <WalletAutomationManager />
        {role !== 'admin' && <DeviceAutomationManager />}
      </>
    );
  }

  // Show maintenance screen for non-admin users
  if (isMaintenanceMode && role !== 'admin') {
    return (
      <>
        <ToastContainer />
        <ThemeManager />
        <MaintenanceScreen />
      </>
    );
  }

  // Determine Home component based on role
  const HomeComponent = role === 'sp' ? SpDashboard : role === 'isp' ? IspDashboard : UserHome;

  return (
    <SolanaProvider>
      <div className={role === 'admin' ? "min-h-screen bg-bg-primary text-text-primary font-sans w-full selection:bg-accent-primary/20" : "min-h-screen bg-bg-primary text-text-primary font-sans max-w-md mx-auto w-full shadow-2xl relative overflow-x-hidden selection:bg-accent-primary/20"}>
        <ToastContainer />
        <NetworkStatusManager />
        <ThemeManager />
        <WalletAutomationManager />
        {role !== 'admin' && <DeviceAutomationManager />}
        
        {role === 'admin' ? (
          <Routes>
            {/* Redirect root to admin dashboard */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="roles" element={<AdminRoles />} />
              <Route path="kyc" element={<AdminKYC />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="checkout" element={<AdminCheckout />} />
              <Route path="earnings" element={<AdminEarnings />} />
              <Route path="wallets" element={<AdminWallets />} />
              <Route path="withdrawals" element={<AdminWithdrawals />} />
              <Route path="exchangers" element={<AdminExchangers />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="networks" element={<AdminNetworks />} />
              <Route path="devices" element={<AdminDevices />} />
              <Route path="tracking" element={<AdminTracking />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="config/rewards" element={<AdminRewardSettings />} />
              <Route path="config/token" element={<AdminTokenConfig />} />
              <Route path="config/launch" element={<AdminTokenLaunch />} />
              <Route path="config/api" element={<AdminApiEndpoints />} />
              <Route path="config/treasury" element={<AdminTreasury />} />
              <Route path="p2p" element={<AdminP2P />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="crm" element={<AdminCRM />} />
              <Route path="system/health" element={<AdminSystemHealth />} />
              <Route path="system/ratelimit" element={<AdminRateLimits />} />
              <Route path="system/security" element={<AdminSecurity />} />
              <Route path="system/ops" element={<AdminSystemOps />} />
              <Route path="system/backup" element={<AdminBackup />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        ) : (
          <>
            <Routes>
              <Route path="/" element={<HomeComponent />} />
              <Route path="/token-info" element={<NrtTokenInfo />} />
              <Route path="/documentation/sdk" element={<SdkDocumentation />} />
              <Route path="/documentation/payment" element={<PaymentApiDocumentation />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/create-service" element={<CreateService />} />
              <Route path="/campaigns/create-campaign" element={<CreateCampaign />} />
              <Route path="/campaigns/create-network" element={<CreateNetwork />} />
              <Route path="/campaigns/create-isp-campaign" element={<CreateIspCampaign />} />
              <Route path="/campaigns/edit-service/:serviceId" element={<EditService />} />
              <Route path="/campaigns/edit-campaign/:campaignId" element={<EditCampaign />} />
              <Route path="/campaigns/edit-network/:networkId" element={<EditNetwork />} />
              <Route path="/campaigns/edit-isp-campaign/:campaignId" element={<EditIspCampaign />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/devices/:deviceId" element={<DeviceDetail />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/wallet/deposit" element={<DepositHub />} />
              <Route path="/wallet/deposit/p2p" element={<P2PMarketplace />} />
              <Route path="/wallet/deposit/p2p/create" element={<CreateP2POffer />} />
              <Route path="/wallet/deposit/p2p/accounts" element={<P2PPaymentAccounts />} />
              <Route path="/wallet/deposit/p2p/flow" element={<P2PFlow />} />
              <Route path="/wallet/deposit/p2p/orders/:orderId" element={<P2PFlow />} />
              <Route path="/wallet/deposit/p2p/disputes" element={<DisputeCenter />} />
              <Route path="/wallet/deposit/p2p/my-offers" element={<P2PMarketplace />} />
              <Route path="/wallet/deposit/instant" element={<InstantPurchase />} />
              <Route path="/wallet/deposit/opay-return" element={<OPayReturn />} />
              <Route path="/wallet/deposit/exchanger" element={<VerifiedExchanger />} />
              <Route path="/wallet/deposit/address" element={<NrtWalletAddress />} />
              <Route path="/wallet/scan-to-pay" element={<ScanToPay />} />
              <Route path="/pay" element={<PaymentAuthorize />} />
              <Route path="/wallet/referral" element={<Referral />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/kyc" element={<KYCVerification />} />
              <Route path="/settings/security" element={<SecuritySettings />} />
              <Route path="/settings/security/pin" element={<PinSetupPage />} />
              <Route path="/settings/notifications" element={<NotificationSettings />} />
              <Route path="/settings/privacy" element={<PrivacySettings />} />
              <Route path="/settings/privacy/terms" element={<TermsOfService />} />
              <Route path="/settings/privacy/full" element={<PrivacyPolicyFull />} />
              <Route path="/settings/gaming" element={<GamingAccounts />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/support" element={<Support />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <BottomNav />
          </>
        )}
        <WalletAutomationManager />
      </div>
    </SolanaProvider>
  );
}

export default App;
