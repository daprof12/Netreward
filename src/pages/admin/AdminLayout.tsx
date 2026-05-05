import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, ShieldCheck, FileCheck,
  ArrowLeftRight, ShoppingCart, TrendingUp, Wallet, Star, CreditCard,
  Target, Layers, Network, Smartphone, Gift,
  Settings, Coins, Code,
  MessageSquare, Headphones, UserSquare,
  Activity, Gauge, Lock, Wrench, AlertTriangle, Database, Rocket,
  LogOut, Menu, X, ChevronDown, Bell, Shield, Moon, Sun
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useThemeStore } from '@/stores/useThemeStore';
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal';
import { supabase } from '@/lib/supabase';

interface NavItem { label: string; to: string; icon: typeof LayoutDashboard; }
interface NavGroup { group: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  { group: 'Overview', items: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  ]},
  { group: 'Users & Accounts', items: [
    { label: 'All Users', to: '/admin/users', icon: Users },
    { label: 'Admin Roles', to: '/admin/roles', icon: ShieldCheck },
    { label: 'KYC Review', to: '/admin/kyc', icon: FileCheck },
  ]},
  { group: 'Financial', items: [
    { label: 'Transactions', to: '/admin/transactions', icon: ArrowLeftRight },
    { label: 'Fiat Management', to: '/admin/withdrawals', icon: Wallet },
    { label: 'Checkout', to: '/admin/checkout', icon: ShoppingCart },
    { label: 'Earnings & Cashback', to: '/admin/earnings', icon: TrendingUp },
    { label: 'Wallets', to: '/admin/wallets', icon: Wallet },
    { label: 'Exchangers', to: '/admin/exchangers', icon: Star },
    { label: 'Payment Gateway', to: '/admin/payments', icon: CreditCard },
  ]},
  { group: 'Platform', items: [
    { label: 'Campaigns', to: '/admin/campaigns', icon: Target },
    { label: 'Services', to: '/admin/services', icon: Layers },
    { label: 'Networks', to: '/admin/networks', icon: Network },
    { label: 'Devices', to: '/admin/devices', icon: Smartphone },
    { label: 'Tracking', to: '/admin/tracking', icon: Activity },
    { label: 'Referrals', to: '/admin/referrals', icon: Gift },
  ]},
  { group: 'Configuration', items: [
    { label: 'Rewards & Fees', to: '/admin/config/rewards', icon: Settings },
    { label: 'Token Config', to: '/admin/config/token', icon: Coins },
    { label: 'Token Launch', to: '/admin/config/launch', icon: Rocket },
    { label: 'API & Endpoints', to: '/admin/config/api', icon: Code },
    { label: 'Treasury Management', to: '/admin/config/treasury', icon: Lock },
  ]},
  { group: 'P2P & Support', items: [
    { label: 'P2P Resolution', to: '/admin/p2p', icon: MessageSquare },
    { label: 'Support Tickets', to: '/admin/support', icon: Headphones },
    { label: 'CRM', to: '/admin/crm', icon: UserSquare },
  ]},
  { group: 'System', items: [
    { label: 'System Health', to: '/admin/system/health', icon: Activity },
    { label: 'API Rate Limits', to: '/admin/system/ratelimit', icon: Gauge },
    { label: 'Cyber Security', to: '/admin/system/security', icon: Lock },
    { label: 'System Operations', to: '/admin/system/ops', icon: Wrench },
    { label: 'Backup', to: '/admin/system/backup', icon: Database },
    { label: 'Audit Logs', to: '/admin/audit', icon: Shield },
    { label: 'Admin Settings', to: '/admin/settings', icon: Settings },
  ]},
];

export default function AdminLayout() {
  const { user, signOut, setHasOnboarded } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [tokenFrozen, setTokenFrozen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('kv_settings').select('key, value').in('key', ['maintenance_mode', 'token_frozen']);
        (data || []).forEach((s: any) => {
          if (s.key === 'maintenance_mode') setMaintenanceMode(s.value === 'true');
          if (s.key === 'token_frozen') setTokenFrozen(s.value === 'true');
        });
      } catch (e) { /* settings may not exist */ }
    })();
  }, []);

  const handleLogout = async () => { await signOut(); setHasOnboarded(false); navigate('/admin/login'); };

  const toggleGroup = (group: string) =>
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden max-w-none w-full">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 60 }}
        transition={{ duration: 0.2 }}
        className="bg-bg-card border-r border-glass-border flex flex-col overflow-hidden shrink-0"
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="p-5 border-b border-glass-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center text-white font-black text-sm">N</div>
            {sidebarOpen && <span className="font-black text-lg tracking-tight text-gradient">NetReward</span>}
          </div>

          {/* Status banners */}
          {(maintenanceMode || tokenFrozen) && sidebarOpen && (
            <div className="mx-3 mt-3 space-y-1.5">
              {maintenanceMode && <div className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg flex items-center gap-2"><Wrench size={10} /> MAINTENANCE MODE ON</div>}
              {tokenFrozen && <div className="text-[10px] font-bold bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2"><AlertTriangle size={10} /> TOKEN FROZEN</div>}
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2 scrollbar-hide">
            {NAV.map(({ group, items }) => (
              <div key={group} className="mb-1">
                {sidebarOpen && (
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors"
                  >
                    {group}
                    <ChevronDown size={12} className={`transition-transform ${collapsedGroups[group] ? '-rotate-90' : ''}`} />
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {!collapsedGroups[group] && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      {items.map(({ label, to, icon: Icon }) => (
                        <NavLink
                          key={to}
                          to={to}
                          end={to === '/admin'}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                              isActive
                                ? 'bg-accent-primary text-white font-bold shadow-sm shadow-accent-primary/30'
                                : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                            }`
                          }
                        >
                          <Icon size={16} className="shrink-0" />
                          {sidebarOpen && <span className="truncate">{label}</span>}
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* User */}
          <div className="p-3 border-t border-glass-border">
            <div className={`flex items-center gap-3 p-2 rounded-lg ${sidebarOpen ? 'bg-bg-secondary' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs shrink-0">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate">{user?.email || 'admin@netreward.online'}</p>
                  <p className="text-[10px] text-text-secondary">Super Admin</p>
                </div>
              )}
              {sidebarOpen && (
                <button onClick={() => setShowLogoutConfirm(true)} className="p-1 text-text-secondary hover:text-destructive transition-colors">
                  <LogOut size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-glass-border flex items-center px-4 gap-4 bg-bg-card/80 backdrop-blur-sm shrink-0 relative z-[100]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1" />
          <button className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-primary" />
          </button>
          {/* Avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAvatarMenu(!showAvatarMenu)}
              className="flex items-center gap-2 ml-2 p-1 rounded-xl hover:bg-bg-secondary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <ChevronDown size={14} className={`text-text-secondary transition-transform ${showAvatarMenu ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showAvatarMenu && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setShowAvatarMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 z-[100] w-64 bg-bg-card border border-glass-border rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-glass-border bg-bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow">
                          {user?.email?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate">{user?.email || 'admin@netreward.online'}</p>
                          <p className="text-[10px] text-accent-primary font-bold uppercase tracking-wider">Super Admin</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-bg-secondary text-text-secondary">
                            {theme === 'Dark' ? <Moon size={16} /> : <Sun size={16} />}
                          </div>
                          <span className="text-sm font-medium text-text-primary">Dark Mode</span>
                        </div>
                        <button
                          onClick={() => setTheme(theme === 'Dark' ? 'Light' : 'Dark')}
                          className={`w-10 h-5 rounded-full transition-colors relative ${theme === 'Dark' ? 'bg-accent-primary' : 'bg-bg-secondary border border-glass-border'}`}
                        >
                          <motion.div
                            animate={{ x: theme === 'Dark' ? 20 : 2 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                          />
                        </button>
                      </div>
                      <div className="h-px bg-glass-border my-1" />
                      <NavLink
                        to="/admin/settings"
                        onClick={() => setShowAvatarMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
                      >
                        <Settings size={16} /> Admin Settings
                      </NavLink>
                      <button
                        onClick={() => { setShowAvatarMenu(false); setShowLogoutConfirm(true); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          <Outlet />
        </main>
      </div>

      <LogoutConfirmModal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={handleLogout} 
      />
    </div>
  );
}
