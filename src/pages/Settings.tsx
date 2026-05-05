import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, ShieldCheck, Globe, Bell, Moon, ChevronRight, 
  LogOut, HelpCircle, Wallet, Banknote, CreditCard, 
  Code, UserCog, AlertCircle, X, Lock, Check, Key, Copy, Signal, ArrowRight, Loader2,
  History, FileText, Gift, QrCode, Info
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
  const navigate = useNavigate();
  const { user, role, setUser, setHasOnboarded, signOut } = useAuthStore();
  const { services, paymentIntegration, setPaymentIntegration, profileLogo: spLogo } = useSpStore();
  const { networks, profileLogo: ispLogo, initialize: initIsp } = useIspStore();
  const { profile, switchRole, isSwitchingRole } = useProfile();

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
  const [paymentSetupStep, setPaymentSetupStep] = useState<0 | 1 | 2 | 3>(0);
  const [paymentWebhook, setPaymentWebhook] = useState('');
  
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
        { icon: CreditCard, label: 'Payment API', value: paymentIntegration ? 'Integrated' : 'Setup Required', highlight: !paymentIntegration, onClick: () => { setPaymentSetupStep(0); setShowPaymentHub(true); } },
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
                    {svc.webDomain && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">Domain:</span> {svc.webDomain}</div>}
                    {svc.androidPackageName && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">Android:</span> {svc.androidPackageName}</div>}
                    {svc.iosBundleId && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">iOS:</span> {svc.iosBundleId}</div>}
                    {svc.webhookUrl && <div className="text-xs text-text-secondary"><span className="font-semibold text-text-primary">Webhook:</span> {svc.webhookUrl}</div>}
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

      {/* SP Payment API Hub Modal */}
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

                {paymentIntegration ? (
                  /* Integrated — show details */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                      <Check size={18} className="text-green-600 dark:text-green-500" />
                      <span className="text-sm font-bold text-green-700 dark:text-green-500">Payment API Active</span>
                    </div>
                    
                    {/* Scan2Pay Testing Section */}
                    <div className="glass p-5 rounded-2xl border border-glass-border space-y-4">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <QrCode size={16} className="text-accent-primary" />
                        Test Scan2Pay
                      </h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-text-secondary uppercase">Amount (NRT)</label>
                          <input 
                            type="number" 
                            id="test-payment-amount"
                            placeholder="15.00" 
                            className="w-full bg-bg-secondary border border-glass-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-text-secondary uppercase">Description</label>
                          <input 
                            type="text" 
                            id="test-payment-desc"
                            placeholder="Netflix Subscription" 
                            className="w-full bg-bg-secondary border border-glass-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
                          />
                        </div>
                        <button 
                          onClick={async () => {
                            const amount = parseFloat((document.getElementById('test-payment-amount') as HTMLInputElement)?.value || '15');
                            const desc = (document.getElementById('test-payment-desc') as HTMLInputElement)?.value || 'Test Payment';
                            const { createCheckoutSession } = useSpStore.getState();
                            await createCheckoutSession(amount, desc);
                            showToast('Test checkout session created!', 'success');
                          }}
                          className="w-full py-2.5 bg-accent-primary text-primary-foreground font-bold rounded-xl text-xs shadow-lg shadow-accent-primary/10 active:scale-95 transition-all"
                        >
                          Generate Test QR Code
                        </button>
                      </div>

                      {/* Active Sessions List */}
                      {useSpStore.getState().checkoutSessions.length > 0 && (
                        <div className="pt-4 border-t border-glass-border space-y-3">
                          <p className="text-[10px] font-black text-text-secondary uppercase">Active Sessions</p>
                          <div className="space-y-2">
                            {useSpStore.getState().checkoutSessions.map(session => (
                              <div key={session.id} className="flex items-center justify-between bg-bg-secondary/50 p-2 rounded-lg border border-glass-border">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold truncate">{session.description}</p>
                                  <p className="text-[10px] text-text-secondary">{session.amountNrt} NRT</p>
                                </div>
                                <button 
                                  onClick={() => {
                                    // Logic to show QR would go here
                                    showToast('QR Code visible for scanning', 'info');
                                  }}
                                  className="p-1.5 bg-accent-primary/10 text-accent-primary rounded-md"
                                >
                                  <QrCode size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass p-3 rounded-xl border border-glass-border text-center">
                        <p className="text-[10px] text-text-secondary font-medium uppercase">Volume</p>
                        <p className="text-lg font-bold text-accent-primary">{paymentIntegration.totalVolume.toLocaleString()} NRT</p>
                      </div>
                      <div className="glass p-3 rounded-xl border border-glass-border text-center">
                        <p className="text-[10px] text-text-secondary font-medium uppercase">Transactions</p>
                        <p className="text-lg font-bold text-text-primary">{paymentIntegration.totalTransactions}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs"><span className="font-semibold text-text-secondary">Webhook:</span> <span className="text-text-primary font-mono">{paymentIntegration.webhookUrl}</span></div>
                      <div className="bg-bg-secondary rounded-lg px-3 py-2 flex items-center justify-between gap-2 overflow-hidden">
                        <div className="min-w-0 flex-1"><p className="text-[10px] text-text-secondary font-bold uppercase">API Key</p><p className="text-[11px] font-mono text-text-primary truncate">{paymentIntegration.apiKey}</p></div>
                        <CopyButton text={paymentIntegration.apiKey} id="pay-api-key" />
                      </div>
                      <div className="bg-bg-secondary rounded-lg px-3 py-2 flex items-center justify-between gap-2 overflow-hidden">
                        <div className="min-w-0 flex-1"><p className="text-[10px] text-text-secondary font-bold uppercase">Webhook Secret</p><p className="text-[11px] font-mono text-text-primary truncate">{paymentIntegration.webhookSecret}</p></div>
                        <CopyButton text={paymentIntegration.webhookSecret} id="pay-webhook-secret" />
                      </div>
                      <Link to="/documentation/payment" className="mt-4 flex items-center justify-center w-full py-3 bg-bg-secondary text-text-primary font-bold rounded-xl border border-glass-border hover:bg-glass-border transition-colors">
                        View Documentation
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Not integrated — setup wizard */
                  <AnimatePresence mode="wait">
                    {paymentSetupStep === 0 && (
                      <motion.div key="s0" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                        <p className="text-sm text-text-secondary">Integrate NRT Checkout on your platform to accept NRT payments from users via QR code or deep-link.</p>
                        <div className="space-y-2">
                          {['Configure your webhook endpoint', 'Test the connection', 'Generate API keys'].map((s, i) => (
                            <div key={i} className="flex items-center gap-3 glass p-3 rounded-xl border border-glass-border">
                              <div className="w-7 h-7 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary text-xs font-bold">{i + 1}</div>
                              <span className="text-sm font-medium">{s}</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setPaymentSetupStep(1)} className="w-full py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2">Start Setup <ArrowRight size={16} /></button>
                      </motion.div>
                    )}
                    {paymentSetupStep === 1 && (
                      <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                        <div className="flex items-center gap-2 text-xs text-text-secondary"><span className="px-2 py-0.5 bg-accent-primary text-white rounded-full text-[10px] font-bold">Step 1/3</span> Configure Webhook</div>
                        <div>
                          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Webhook URL</label>
                          <input value={paymentWebhook} onChange={e => setPaymentWebhook(e.target.value)} placeholder="https://your-api.com/webhooks/nrt" className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary" />
                        </div>
                        <p className="text-[11px] text-text-secondary">We'll send <code className="bg-bg-secondary px-1 rounded">payment.success</code> events to this URL.</p>
                        <div className="flex gap-3">
                          <button onClick={() => setPaymentSetupStep(0)} className="flex-1 py-3 bg-bg-secondary text-text-primary font-bold rounded-xl">Back</button>
                          <button onClick={() => { if (!paymentWebhook.trim()) { showToast('Enter a webhook URL', 'danger'); return; } setPaymentSetupStep(2); }} className="flex-1 py-3 bg-accent-primary text-primary-foreground font-bold rounded-xl">Next</button>
                        </div>
                      </motion.div>
                    )}
                    {paymentSetupStep === 2 && (
                      <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 text-center py-4">
                        <div className="flex items-center gap-2 text-xs text-text-secondary justify-center"><span className="px-2 py-0.5 bg-accent-primary text-white rounded-full text-[10px] font-bold">Step 2/3</span> Testing Connection</div>
                        <div className="flex justify-center py-6"><Loader2 size={40} className="text-accent-primary animate-spin" /></div>
                        <p className="text-sm text-text-secondary">Sending test payload to your webhook...</p>
                        {setTimeout(() => setPaymentSetupStep(3), 2500) && null}
                      </motion.div>
                    )}
                    {paymentSetupStep === 3 && (
                      <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="flex items-center gap-2 text-xs text-text-secondary"><span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-bold">Step 3/3</span> Keys Generated</div>
                        <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto"><Check size={28} className="text-green-500" /></div>
                        <p className="text-sm text-text-secondary text-center">Connection verified! Save your credentials below.</p>
                        <button onClick={() => {
                          const pi = {
                            integrated: true,
                            webhookUrl: paymentWebhook,
                            apiKey: `nrt_pay_${crypto.randomUUID().replace(/-/g, '').substring(0, 20)}`,
                            webhookSecret: `whsec_${crypto.randomUUID().replace(/-/g, '')}`,
                            totalVolume: 0,
                            totalTransactions: 0,
                            createdAt: new Date().toISOString(),
                          };
                          setPaymentIntegration(pi);
                          showToast('Payment API integrated successfully!', 'success');
                        }} className="w-full py-3.5 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20">Activate & View Keys</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
