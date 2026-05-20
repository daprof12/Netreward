import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, ShieldCheck, Globe, Bell, Moon, ChevronRight, 
  LogOut, HelpCircle, Wallet, Banknote, CreditCard, 
  Code, UserCog, AlertCircle, X, Lock, Check, Key, Copy, Signal, ArrowRight, Loader2,
  History, FileText, Gift, QrCode, Info, Gamepad2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useSpStore } from '@/stores/useSpStore';
import { useIspStore } from '@/stores/useIspStore';
import { useThemeStore, type Theme } from '@/stores/useThemeStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useProfile } from '@/hooks/useProfile';
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useGamingAccounts } from '@/hooks/useGamingAccounts';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  value?: string;
  highlight?: boolean;
  to?: string;
  onClick?: () => void;
  customComponent?: React.ReactNode;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export default function Settings() {
  usePageTitle('Settings');
  const navigate = useNavigate();
  const { user, role, setUser, setHasOnboarded, signOut } = useAuthStore();
  const { services, profileLogo: spLogo, checkoutSessions, createCheckoutSession } = useSpStore();
  const { networks, profileLogo: ispLogo, initialize: initIsp } = useIspStore();
  const { profile, switchRole, isSwitchingRole } = useProfile();
  const { gamingAccounts } = useGamingAccounts();

  // KYC status fetched from Supabase
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'verified' | 'rejected'>('none');
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Fetch KYC
    supabase
      .from('users')
      .select('kyc_status')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.kyc_status) setKycStatus(data.kyc_status as any);
      });
      
    // Initialize Stores
    if (role === 'isp') {
      initIsp(user.id);
    } else if (role === 'sp') {
      const { initialize: initSp } = useSpStore.getState();
      initSp(user.id);
    }
  }, [user?.id, role, initIsp]);

  const kycLabel = kycStatus === 'verified' ? '✓ Verified' : kycStatus === 'pending' ? 'Pending Review' : kycStatus === 'rejected' ? 'Rejected' : 'Unverified';
  const kycHighlight = kycStatus !== 'verified';

  // Sheet states
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showThemeSheet, setShowThemeSheet] = useState(false);
  
  // Upgrade Flow states
  const [upgradeStep, setUpgradeStep] = useState<'select' | 'details'>('select');
  const [selectedUpgradeRole, setSelectedUpgradeRole] = useState<'user' | 'sp' | 'isp'>('sp');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showServiceDetail, setShowServiceDetail] = useState(false);
  const [showNetworkDetail, setShowNetworkDetail] = useState(false);
  const [showPaymentHub, setShowPaymentHub] = useState(false);
  const [selectedPaymentServiceIdx, setSelectedPaymentServiceIdx] = useState(0);
  const [activeQrSession, setActiveQrSession] = useState<any | null>(null);
  
  // Preference states
  const { selectedCurrency, setCurrency } = useCurrencyStore();
  const [language, setLanguage] = useState('English (US)');
  const { theme, setTheme } = useThemeStore();

  const { showToast } = useToastStore();

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      showToast('Error logging out', 'danger');
    }
  };

  const displayRole = role === 'admin' ? 'Super Admin' : role === 'isp' ? 'ISP Account' : role === 'sp' ? 'Service Provider' : 'Standard User';

  const handleWeb3Click = () => {
    showToast('Web3 Wallet coming soon!', 'warning');
  };

  // copied animation state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string, id: string }) => (
    <button onClick={() => handleCopy(text, id)} className="text-accent-primary transition-all duration-300 shrink-0">
      <AnimatePresence mode="wait">
        {copiedId === id ? (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full"
          >
            <Check size={8} strokeWidth={3} /> Copied
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Copy size={14} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );

  const menuGroups: MenuGroup[] = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile Information', value: user?.email || 'demo@netreward.online', to: '/settings/profile' },
        { icon: ShieldCheck, label: 'KYC Verification', value: kycLabel, highlight: kycHighlight, to: '/settings/kyc', onClick: () => navigate('/settings/kyc', { state: { targetRole: role === 'sp' ? 'sp' : role === 'isp' ? 'isp' : 'user' } }) },
        { icon: Lock, label: 'Security & 2FA', to: '/settings/security' },
        { icon: UserCog, label: 'Switch Account Type', onClick: () => setShowUpgradeSheet(true) },
        { icon: Gamepad2, label: 'Gaming Accounts', value: gamingAccounts.length > 0 ? `${gamingAccounts.length} Linked` : 'None', highlight: gamingAccounts.length === 0, to: '/settings/gaming' },
      ]
    },
    {
      title: 'Reports & Finances',
      items: [
        { icon: History, label: 'Transaction History', to: '/transactions' },
        { icon: FileText, label: 'Financial Reports', to: '/reports' },
        { icon: Gift, label: 'Referral Rewards', to: '/wallet/referral' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Banknote, label: 'Default Currency', value: selectedCurrency, onClick: () => setShowCurrencySheet(true) },
        { icon: Globe, label: 'Language', value: language, onClick: () => setShowLanguageSheet(true) },
        { icon: Moon, label: 'Theme', value: theme, onClick: () => setShowThemeSheet(true) },
        { icon: Bell, label: 'Notifications', value: 'Enabled', to: '/settings/notifications' },
      ]
    },
    ...(role === 'sp' ? [{
      title: 'API & Integrations',
      items: [
        { icon: CreditCard, label: 'Payment API', value: services.length > 0 ? `${services.length} Service${services.length > 1 ? 's' : ''} Ready` : 'No Services', highlight: services.length === 0, onClick: () => { setSelectedPaymentServiceIdx(0); setShowPaymentHub(true); } },
        { icon: Code, label: 'Service API', value: `${services.length} Integrated`, onClick: () => setShowServiceDetail(true) },
      ]
    }] : []),
    ...(role === 'isp' ? [{
      title: 'API & Integrations',
      items: [
        { icon: Code, label: 'Network API', value: `${networks.length} Integrated`, onClick: () => setShowNetworkDetail(true) },
      ]
    }] : []),
    {
      title: 'Support & About',
      items: [
        { icon: Info, label: 'About NetReward NRT', to: '/about' },
        { icon: HelpCircle, label: 'Support Center', to: '/support' },
        { icon: ShieldCheck, label: 'Privacy Policy', to: '/settings/privacy' },
      ]
    }
  ];

  const renderSheet = (
    show: boolean, 
    setShow: (v: boolean) => void, 
    title: string, 
    options: string[], 
    current: string, 
    setCurrent: (v: string) => void
  ) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">{title}</h3>
                <button onClick={() => setShow(false)} className="p-1.5 bg-bg-secondary rounded-full">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setCurrent(opt); setShow(false); }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      current === opt ? 'bg-accent-primary/10 border-accent-primary text-accent-primary' : 'glass border-glass-border hover:bg-glass-bg'
                    }`}
                  >
                    <span className="font-medium">{opt}</span>
                    {current === opt && <Check size={18} />}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div 
      className="space-y-6 pb-24 p-4 pt-8 min-h-screen relative overflow-x-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-2xl font-bold tracking-tight mb-6">Settings</h1>

      <div className="glass rounded-[20px] p-5 flex items-center gap-4 border border-glass-border">
        <div className="w-16 h-16 rounded-full bg-accent-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg shadow-accent-primary/20 shrink-0 overflow-hidden">
          {(role === 'sp' ? spLogo : role === 'isp' ? ispLogo : profile?.avatar_url) ? (
            <img 
              src={(role === 'sp' ? spLogo : role === 'isp' ? ispLogo : profile?.avatar_url)!} 
              alt="" 
              className="w-full h-full object-cover" 
            />
          ) : (
            profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || 'D'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-text-primary truncate">{profile?.display_name || 'Demo User'}</h2>
          <p className="text-sm text-text-secondary truncate">{user?.email || 'demo@netreward.online'}</p>
        </div>
        <div className="bg-bg-secondary px-3 py-1.5 rounded-full text-[10px] font-bold text-accent-primary border border-accent-primary/20 uppercase tracking-wider shrink-0 text-center">
          {displayRole}
        </div>
      </div>

      <div className="space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="text-sm font-semibold text-text-secondary mb-3 ml-2 uppercase tracking-wider">{group.title}</h3>
            <div className="glass rounded-2xl border border-glass-border overflow-hidden">
              {group.items.map((item, i) => {
                const commonProps = {
                  className: `flex items-center justify-between p-4 bg-bg-card hover:bg-bg-secondary transition-colors cursor-pointer ${
                    i !== group.items.length - 1 ? 'border-b border-glass-border' : ''
                  }`,
                  onClick: item.onClick ? (e: any) => {
                    e.preventDefault();
                    item.onClick!();
                  } : undefined,
                };

                const content = (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-secondary">
                        <item.icon size={18} />
                      </div>
                      <span className="font-medium text-text-primary">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.customComponent ? (
                        item.customComponent
                      ) : (
                        <>
                          {item.value && (
                            <span className={`text-sm ${item.highlight ? 'text-accent-primary font-semibold' : 'text-text-secondary'}`}>
                              {item.value}
                            </span>
                          )}
                          <ChevronRight size={18} className="text-text-secondary opacity-50" />
                        </>
                      )}
                    </div>
                  </>
                );

                return item.to ? (
                  <Link key={i} to={item.to} {...commonProps}>
                    {content}
                  </Link>
                ) : (
                  <div key={i} {...commonProps}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full mt-4 flex items-center justify-center gap-2 text-destructive font-semibold py-4 rounded-xl border border-destructive/20 bg-destructive/10 hover:bg-destructive/20 active:scale-[0.98] transition-all"
      >
        <LogOut size={20} />
        Log Out
      </button>

      <p className="text-center text-xs text-text-secondary mt-8">NetReward v1.0.0 (Build 2026.04)</p>

      {/* Sheets */}
      {renderSheet(showCurrencySheet, setShowCurrencySheet, 'Default Currency', ['USD ($)', 'EUR (€)', 'GBP (£)', 'NGN (₦)'], selectedCurrency, setCurrency)}
      {renderSheet(showLanguageSheet, setShowLanguageSheet, 'Language', ['English (US)', 'English (UK)', 'Español', 'Français'], language, setLanguage)}
      {renderSheet(showThemeSheet, setShowThemeSheet, 'Theme', ['System', 'Light', 'Dark'], theme, (v) => setTheme(v as Theme))}

      {/* Switch Account Type Bottom Sheet */}
      <AnimatePresence>
        {showUpgradeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUpgradeSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-lg">Switch Account Type</h3>
                  <button onClick={() => {
                    setShowUpgradeSheet(false);
                    setTimeout(() => {
                      setUpgradeStep('select');
                      setSelectedUpgradeRole('sp');
                    }, 300);
                  }} className="p-1.5 bg-bg-secondary rounded-full">
                    <X size={16} />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {upgradeStep === 'select' ? (
                    <motion.div
                      key="select"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3"
                    >
                      <p className="text-sm text-text-secondary mb-4">Select the account type you wish to switch to:</p>
                      
                      <button 
                        onClick={() => setSelectedUpgradeRole('user')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${selectedUpgradeRole === 'user' ? 'bg-accent-primary/10 border-accent-primary ring-1 ring-accent-primary' : 'glass border-glass-border hover:bg-glass-bg'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedUpgradeRole === 'user' ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-text-secondary'}`}>
                          <User size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-text-primary">Standard User</p>
                          <p className="text-xs text-text-secondary mt-0.5">Basic earning & sharing</p>
                        </div>
                        {selectedUpgradeRole === 'user' && <Check size={18} className="text-accent-primary" />}
                      </button>

                      <button 
                        onClick={() => setSelectedUpgradeRole('sp')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${selectedUpgradeRole === 'sp' ? 'bg-accent-primary/10 border-accent-primary ring-1 ring-accent-primary' : 'glass border-glass-border hover:bg-glass-bg'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedUpgradeRole === 'sp' ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-text-secondary'}`}>
                          <UserCog size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-text-primary">Service Provider (SP)</p>
                          <p className="text-xs text-text-secondary mt-0.5">For businesses & organizations</p>
                        </div>
                        {selectedUpgradeRole === 'sp' && <Check size={18} className="text-accent-primary" />}
                      </button>

                      <button 
                        onClick={() => setSelectedUpgradeRole('isp')}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${selectedUpgradeRole === 'isp' ? 'bg-accent-primary/10 border-accent-primary ring-1 ring-accent-primary' : 'glass border-glass-border hover:bg-glass-bg'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedUpgradeRole === 'isp' ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-text-secondary'}`}>
                          <Globe size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-text-primary">Internet Service Provider</p>
                          <p className="text-xs text-text-secondary mt-0.5">For telecom & network operators</p>
                        </div>
                        {selectedUpgradeRole === 'isp' && <Check size={18} className="text-accent-primary" />}
                      </button>

                      <button 
                        onClick={async () => {
                          if (selectedUpgradeRole === 'user') {
                            try {
                              await switchRole('user');
                              setUser(user, 'user');
                              setShowUpgradeSheet(false);
                              showToast('Switched to Standard User', 'success');
                            } catch (e: any) {
                              showToast(e.message || 'Failed to switch role', 'danger');
                            }
                          } else {
                            // Check KYC status before allowing upgrade
                            if (kycStatus !== 'verified') {
                              setUpgradeStep('details');
                            } else {
                              try {
                                await switchRole(selectedUpgradeRole);
                                setUser(user, selectedUpgradeRole);
                                setShowUpgradeSheet(false);
                                showToast(`Switched to ${selectedUpgradeRole.toUpperCase()} account`, 'success');
                              } catch (e: any) {
                                showToast(e.message || 'Failed to switch role', 'danger');
                              }
                            }
                          }
                        }}
                        disabled={isSwitchingRole}
                        className="w-full mt-6 py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSwitchingRole && <Loader2 size={18} className="animate-spin" />}
                        {selectedUpgradeRole === 'user' ? 'Switch to Standard User' : 'Continue'}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      {kycStatus === 'pending' ? (
                        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-4">
                          <AlertCircle size={20} className="text-blue-400 mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-blue-400">KYC Under Review</p>
                            <p className="text-xs text-text-secondary leading-relaxed">
                              Your documents are currently being reviewed by our team. You'll receive access once approved by an admin.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-4">
                            <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-amber-400">KYC Verification Required</p>
                              <p className="text-xs text-text-secondary leading-relaxed">
                                To switch to <span className="font-semibold text-text-primary">{selectedUpgradeRole === 'sp' ? 'Service Provider' : 'Internet Service Provider'}</span>, submit the required documents. Your account will be upgraded upon admin approval.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-text-primary">Required Documents:</h4>
                            <div className="glass rounded-xl border border-glass-border divide-y divide-glass-border overflow-hidden">
                              {[
                                'Government Issued ID',
                                'Selfie Liveness Check',
                                'Business Registration',
                                ...(selectedUpgradeRole === 'isp' ? ['ISP Telecom License'] : []),
                              ].map((doc) => (
                                <div key={doc} className="p-3 flex items-center justify-between">
                                  <span className="text-sm font-medium">{doc}</span>
                                  <span className="text-[10px] uppercase tracking-wider font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md">Required</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => setUpgradeStep('select')}
                          className="flex-1 py-3.5 bg-bg-secondary text-text-primary font-bold rounded-xl"
                        >
                          Back
                        </button>
                        {kycStatus !== 'pending' && (
                          <button 
                            onClick={() => { 
                              setShowUpgradeSheet(false); 
                              navigate('/settings/kyc', { state: { targetRole: selectedUpgradeRole } }); 
                            }}
                            className="flex-1 py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20"
                          >
                            Start KYC
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LogoutConfirmModal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={handleLogout} 
      />

      {/* SP Service Details Modal */}
      <AnimatePresence>
        {showServiceDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowServiceDetail(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Integrated Services</h3>
                  <button onClick={() => setShowServiceDetail(false)} className="p-1.5 bg-bg-secondary rounded-full"><X size={16} /></button>
                </div>
                {services.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-sm">No services registered yet.</div>
                ) : services.map(svc => (
                  <div key={svc.id} className="glass p-4 rounded-xl border border-glass-border space-y-3">
                    <div className="flex items-center gap-3">
                      {svc.logoUrl ? <img src={svc.logoUrl} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary"><Code size={20} /></div>}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{svc.name}</h4>
                        <p className="text-[10px] text-text-secondary">{svc.category} • {svc.status}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${svc.verified ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>{svc.verified ? 'Verified' : 'Pending'}</span>
                    </div>
                    {svc.webUrl && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">Web:</span> {svc.webUrl}</div>}
                    {svc.androidUrl && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">Android:</span> {svc.androidUrl}</div>}
                    {svc.iosUrl && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">iOS:</span> {svc.iosUrl}</div>}
                    {svc.apiKey && (
                      <div className="bg-bg-secondary rounded-lg px-3 py-2 flex items-center justify-between gap-2 overflow-hidden">
                        <span className="text-[10px] font-mono text-text-secondary truncate flex-1">{svc.apiKey}</span>
                        <CopyButton text={svc.apiKey} id={`svc-${svc.id}`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ISP Network Details Modal */}
      <AnimatePresence>
        {showNetworkDetail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowNetworkDetail(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Integrated Networks</h3>
                  <button onClick={() => setShowNetworkDetail(false)} className="p-1.5 bg-bg-secondary rounded-full"><X size={16} /></button>
                </div>
                {networks.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-sm">No networks registered yet.</div>
                ) : networks.map(net => (
                  <div key={net.id} className="glass p-4 rounded-xl border border-glass-border space-y-3">
                    <div className="flex items-center gap-3">
                      {net.logoUrl ? <img src={net.logoUrl} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400"><Signal size={20} /></div>}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{net.name}</h4>
                        <p className="text-[10px] text-text-secondary">{net.category} • {net.country || 'N/A'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${net.verified ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>{net.verified ? 'Verified' : 'Pending'}</span>
                    </div>
                    {net.signalStrength !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary font-semibold">Signal:</span>
                        <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full ${net.signalStrength >= 75 ? 'bg-green-500' : net.signalStrength >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${net.signalStrength}%` }} /></div>
                        <span className="text-xs font-bold">{net.signalStrength}%</span>
                      </div>
                    )}
                    {net.coverage && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">Coverage:</span> {net.coverage}</div>}
                    {net.asn && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">ASN:</span> {net.asn}</div>}
                    {net.apiKey && (
                      <div className="bg-bg-secondary rounded-lg px-3 py-2 flex items-center justify-between gap-2 overflow-hidden">
                        <span className="text-[10px] font-mono text-text-secondary truncate flex-1">{net.apiKey}</span>
                        <CopyButton text={net.apiKey} id={`net-${net.id}`} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SP Payment API Hub Modal — Service-Aware */}
      <AnimatePresence>
        {showPaymentHub && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPaymentHub(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-md glass rounded-t-[24px] border-t border-glass-border max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Payment API</h3>
                  <button onClick={() => setShowPaymentHub(false)} className="p-1.5 bg-bg-secondary rounded-full"><X size={16} /></button>
                </div>

                {services.length === 0 ? (
                  /* No services — prompt to create one */
                  <div className="space-y-4 text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mx-auto">
                      <CreditCard size={28} className="text-text-secondary opacity-50" />
                    </div>
                    <h4 className="font-bold text-lg">No Services Yet</h4>
                    <p className="text-sm text-text-secondary max-w-[280px] mx-auto">Create a service first to enable Payment API. Each service gets its own API key for both SDK tracking and payments.</p>
                    <Link to="/campaigns/create-service" onClick={() => setShowPaymentHub(false)}
                      className="w-full py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2">
                      Create Service <ArrowRight size={16} />
                    </Link>
                  </div>
                ) : (
                  /* Has services — show service picker + payment tools */
                  <div className="space-y-4">
                    {/* Service Selector */}
                    {services.length > 1 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Select Service</label>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {services.map((svc, idx) => (
                            <button
                              key={svc.id}
                              onClick={() => setSelectedPaymentServiceIdx(idx)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium whitespace-nowrap transition-all ${
                                idx === selectedPaymentServiceIdx
                                  ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                                  : 'bg-bg-secondary border-glass-border text-text-secondary hover:border-text-secondary'
                              }`}
                            >
                              {svc.logoUrl ? (
                                <img src={svc.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center text-[8px] font-bold text-accent-primary uppercase">{svc.name[0]}</div>
                              )}
                              {svc.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Service Status */}
                    {(() => {
                      const svc = services[selectedPaymentServiceIdx] || services[0];
                      if (!svc) return null;
                      return (
                        <>
                          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${
                            svc.verified ? 'bg-green-500/10 border border-green-500/20' : 'bg-amber-500/10 border border-amber-500/20'
                          }`}>
                            {svc.verified ? <Check size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-amber-500" />}
                            <div className="flex-1">
                              <span className={`text-sm font-bold ${svc.verified ? 'text-green-700 dark:text-green-500' : 'text-amber-700 dark:text-amber-500'}`}>
                                {svc.verified ? 'Payment Ready' : 'Pending Verification'}
                              </span>
                              <p className="text-[10px] text-text-secondary">{svc.name} • {svc.category}</p>
                            </div>
                          </div>

                          {/* API Key for this service */}
                          {svc.apiKey && (
                            <div className="bg-bg-secondary rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 overflow-hidden">
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-text-secondary font-bold uppercase">Service API Key</p>
                                <p className="text-[11px] font-mono text-text-primary truncate">{svc.apiKey}</p>
                              </div>
                              <CopyButton text={svc.apiKey} id={`pay-svc-key-${svc.id}`} />
                            </div>
                          )}

                          {/* Scan2Pay Test — only for verified services */}
                          {svc.verified && (
                            <div className="glass p-5 rounded-2xl border border-glass-border space-y-4">
                              <h4 className="text-sm font-bold flex items-center gap-2">
                                <QrCode size={16} className="text-accent-primary" />
                                Test Scan2Pay
                              </h4>
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-text-secondary uppercase">Amount (NRT)</label>
                                  <input type="number" id="test-payment-amount" placeholder="15.00"
                                    className="w-full bg-bg-secondary border border-glass-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-text-secondary uppercase">Description</label>
                                  <input type="text" id="test-payment-desc" placeholder="Netflix Subscription"
                                    className="w-full bg-bg-secondary border border-glass-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" />
                                </div>
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    const amountInput = document.getElementById('test-payment-amount') as HTMLInputElement;
                                    const descInput = document.getElementById('test-payment-desc') as HTMLInputElement;
                                    const amountValue = amountInput?.value;
                                    const desc = descInput?.value?.trim() || '';
                                    if (!amountValue || parseFloat(amountValue) <= 0) { showToast('Enter a valid amount', 'warning'); return; }
                                    if (!desc) { showToast('Enter a description', 'warning'); return; }
                                    try {
                                      const session = await createCheckoutSession(parseFloat(amountValue), desc);
                                      showToast('Test checkout session created!', 'success');
                                      setActiveQrSession(session);
                                    } catch (err: any) {
                                      showToast(err.message || 'Failed', 'danger');
                                    }
                                  }}
                                  className="w-full py-2.5 bg-accent-primary text-primary-foreground font-bold rounded-xl text-xs shadow-lg shadow-accent-primary/10 active:scale-95 transition-all"
                                >
                                  Generate Test QR Code
                                </button>
                              </div>

                              {checkoutSessions.length > 0 && (
                                <div className="pt-4 border-t border-glass-border space-y-3">
                                  <p className="text-[10px] font-black text-text-secondary uppercase">Active Sessions</p>
                                  <div className="space-y-2">
                                    {checkoutSessions.map(session => (
                                      <div key={session.id} className="flex items-center justify-between bg-bg-secondary/50 p-2 rounded-lg border border-glass-border">
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-bold truncate">{session.description}</p>
                                          <p className="text-[10px] text-text-secondary">{session.amountNrt} NRT</p>
                                        </div>
                                        <button onClick={() => { setActiveQrSession(session); }} className="p-1.5 bg-accent-primary/10 text-accent-primary rounded-md">
                                          <QrCode size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <Link to="/documentation/payment" className="flex items-center justify-center w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border hover:bg-glass-border transition-colors">
                            View Documentation
                          </Link>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Display Modal */}
      <AnimatePresence>
        {activeQrSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => setActiveQrSession(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass rounded-[32px] p-8 border border-glass-border text-center space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <h3 className="font-bold text-lg">Test Scan2Pay</h3>
                  <p className="text-xs text-text-secondary">{activeQrSession.description}</p>
                </div>
                <button onClick={() => setActiveQrSession(null)} className="p-2 bg-bg-secondary rounded-full">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-white p-4 rounded-3xl inline-block mx-auto">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeQrSession.qrPayload)}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>

              <div className="space-y-1">
                <p className="text-2xl font-black text-accent-primary">{activeQrSession.amountNrt} NRT</p>
                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">Pay with NetReward App</p>
              </div>

              <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-2xl p-4 flex items-start gap-3 text-left">
                <Info size={18} className="text-accent-primary shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  Open your <span className="text-accent-primary font-bold">NetReward Mobile App</span> and scan this QR code to complete the test payment.
                </p>
              </div>

              <button
                onClick={() => setActiveQrSession(null)}
                className="w-full py-4 bg-bg-secondary text-text-primary font-bold rounded-2xl border border-glass-border"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
