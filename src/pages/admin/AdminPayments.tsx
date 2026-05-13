import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Shield, Plus, Edit2, Trash2, X, Search, Landmark, CheckCircle2, AlertCircle, ShoppingCart, BarChart3, PieChart, TrendingUp, Clock, XCircle, Timer, ExternalLink, Power } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { GATEWAY_REGISTRY, GATEWAY_FIELDS, type GatewayId } from '@/lib/paymentGateways';

type ActiveTab = 'gateways' | 'banks' | 'integrations' | 'tax';

export default function AdminPayments() {
  usePageTitle('Admin — Payments');
  const { showToast } = useToastStore();
  const [localBanks, setLocalBanks] = useState<any[]>([]);
  const [checkoutIntegrations, setCheckoutIntegrations] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('gateways');
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [statusFilter, setStatusFilter] = useState('All');

  // Tax state
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editTax, setEditTax] = useState<any>(null);
  const [taxForm, setTaxForm] = useState({ country_code: '', tax_percentage: 0, tax_label: 'VAT' });
  const [isTaxLoading, setIsTaxLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [b, ci] = await Promise.all([
          supabase.from('local_banks').select('*').order('name'),
          supabase.from('checkout_integrations').select('*').order('created_at', { ascending: false }),
        ]);
        setLocalBanks((b.data || []).map((x: any) => ({ ...x, createdAt: x.created_at })));
        setCheckoutIntegrations((ci.data || []).map((x: any) => ({
          ...x, spName: x.sp_name || '', spEmail: x.sp_email || '',
          serviceName: x.service_name || '', volumeNrt: Number(x.volume_nrt || 0),
          txCount: Number(x.tx_count || 0), txSuccess: Number(x.tx_success || 0),
          txFailed: Number(x.tx_failed || 0), txPending: Number(x.tx_pending || 0),
          txCancelled: Number(x.tx_cancelled || 0), txTimeout: Number(x.tx_timeout || 0),
          createdAt: x.created_at,
        })));
      } catch (e) { console.error(e); }
    })();
  }, []);

  // ── Multi-Gateway Config State ──
  // Each gateway stores its config blob as a flat object keyed by gateway ID
  const [gwConfigs, setGwConfigs] = useState<Record<string, Record<string, any>>>({});
  const [gwSaving, setGwSaving] = useState<Record<string, boolean>>({});
  const [gwExpanded, setGwExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load all gateway configs from kv_settings
    const nonOpayGateways = GATEWAY_REGISTRY.filter(g => g.id !== 'opay');
    const kvKeys = nonOpayGateways.map(g => g.kvKey);
    // Add OPay individual keys
    kvKeys.push('opay_merchant_id', 'opay_public_key', 'opay_secret_key', 'opay_environment', 'opay_callback_url', 'opay_enabled');

    if (kvKeys.length === 0) return;
    (async () => {
      const { data } = await supabase.from('kv_settings').select('key, value').in('key', kvKeys);
      if (!data) return;

      const parsed: Record<string, Record<string, any>> = {};
      parsed['opay_merchant_id'] = {}; // Initialize OPay object

      data.forEach(row => {
        if (row.key.startsWith('opay_')) {
          parsed['opay_merchant_id'][row.key] = row.value || '';
          if (row.key === 'opay_enabled') {
            parsed['opay_merchant_id']['enabled'] = row.value === 'true';
          }
        } else {
          try {
            parsed[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : (row.value ?? {});
          } catch { parsed[row.key] = {}; }
        }
      });
      setGwConfigs(parsed);
    })();
  }, []);

  const handleSaveGwConfig = async (gatewayId: GatewayId) => {
    const gw = GATEWAY_REGISTRY.find(g => g.id === gatewayId);
    if (!gw) return;
    setGwSaving(p => ({ ...p, [gatewayId]: true }));
    try {
      const cfg = gwConfigs[gw.kvKey] ?? {};

      if (gatewayId === 'opay') {
        for (const [key, value] of Object.entries(cfg)) {
          if (key === 'enabled') continue; // Handled below or in toggle
          if (key === 'opay_enabled') {
            await supabase.from('kv_settings').upsert({ key: 'opay_enabled', value: value }, { onConflict: 'key' });
          } else {
            await supabase.from('kv_settings').upsert({ key, value: value || '' }, { onConflict: 'key' });
          }
        }
      } else {
        await supabase.from('kv_settings').upsert({ key: gw.kvKey, value: cfg }, { onConflict: 'key' });
      }

      showToast(`${gw.name} configuration saved`, 'success');
    } catch (e: any) { showToast(e.message || 'Failed to save', 'danger'); }
    setGwSaving(p => ({ ...p, [gatewayId]: false }));
  };

  const handleToggleGw = async (gatewayId: GatewayId, newEnabled: boolean) => {
    const gw = GATEWAY_REGISTRY.find(g => g.id === gatewayId);
    if (!gw) return;
    const cfg = { ...(gwConfigs[gw.kvKey] ?? {}), enabled: newEnabled };

    setGwConfigs(p => ({ ...p, [gw.kvKey]: cfg }));

    if (gatewayId === 'opay') {
      cfg.opay_enabled = newEnabled ? 'true' : 'false';
      await supabase.from('kv_settings').upsert({ key: 'opay_enabled', value: newEnabled ? 'true' : 'false' }, { onConflict: 'key' });
    } else {
      await supabase.from('kv_settings').upsert({ key: gw.kvKey, value: cfg }, { onConflict: 'key' });
    }

    showToast(`${gw.name} ${newEnabled ? 'enabled' : 'disabled'}`, newEnabled ? 'success' : 'warning');
  };

  const updateGwField = (kvKey: string, field: string, value: string) => {
    setGwConfigs(p => ({ ...p, [kvKey]: { ...(p[kvKey] ?? {}), [field]: value } }));
  };

  useEffect(() => {
    if (activeTab === 'tax') fetchTaxRates();
  }, [activeTab]);

  async function fetchTaxRates() {
    setIsTaxLoading(true);
    const { data } = await supabase.from('country_tax_rates').select('*').order('country_code');
    setTaxRates(data || []);
    setIsTaxLoading(false);
  }

  async function handleSaveTax() {
    if (!taxForm.country_code) return showToast('Country code is required', 'danger');

    const { error } = await supabase
      .from('country_tax_rates')
      .upsert({
        country_code: taxForm.country_code.toUpperCase(),
        tax_percentage: taxForm.tax_percentage,
        tax_label: taxForm.tax_label
      });

    if (error) showToast(error.message, 'danger');
    else {
      showToast('Tax rate saved', 'success');
      setShowTaxModal(false);
      fetchTaxRates();
    }
  }
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsTarget, setAnalyticsTarget] = useState<any | null>(null);

  const [showBankModal, setShowBankModal] = useState(false);
  const [editBank, setEditBank] = useState<any | null>(null);

  const [bankForm, setBankForm] = useState<any>({
    name: '', country: 'Nigeria', status: 'active'
  });

  const allCountries = [...new Set([...localBanks.map(b => b.country)])].sort();

  const filteredBanks = localBanks.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.name.toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || b.country === countryFilter;
    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchQ && matchCountry && matchStatus;
  });

  const allCategories = ['Streaming', 'AI Service', 'Gaming', 'Social', 'Browsing', 'Cloud', 'Other'];
  const filteredIntegrations = checkoutIntegrations.filter(ci => {
    const q = search.toLowerCase();
    const matchQ = !q || ci.spName.toLowerCase().includes(q) || ci.serviceName.toLowerCase().includes(q) || ci.spEmail.toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || ci.country === countryFilter;
    const matchStatus = statusFilter === 'All' || ci.status === statusFilter;
    const matchCategory = categoryFilter === 'All' || ci.category === categoryFilter;
    return matchQ && matchCountry && matchStatus && matchCategory;
  });

  // Bank Handlers
  const handleOpenCreateBank = () => {
    setEditBank(null);
    setBankForm({ name: '', country: 'Nigeria', status: 'active' });
    setShowBankModal(true);
  };

  const handleOpenEditBank = (bank: any) => {
    setEditBank(bank);
    setBankForm(bank);
    setShowBankModal(true);
  };

  const handleSaveBank = async () => {
    if (!bankForm.name || !bankForm.country) { showToast('Name and country are required.', 'danger'); return; }
    try {
      if (editBank) {
        await supabase.from('local_banks').update(bankForm).eq('id', editBank.id);
        setLocalBanks(prev => prev.map(b => b.id === editBank.id ? { ...b, ...bankForm } : b));
        showToast('Bank updated successfully.', 'success');
      } else {
        const newBank = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...bankForm };
        await supabase.from('local_banks').insert(newBank);
        setLocalBanks(prev => [...prev, { ...newBank, createdAt: newBank.created_at }]);
        showToast('Bank added successfully.', 'success');
      }
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
    setShowBankModal(false);
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Payment Gateway</h1>
          <p className="text-sm text-text-secondary">Configure payment methods and supported local banks</p>
        </div>
        {activeTab !== 'gateways' && (
          <button
            onClick={activeTab === 'banks' ? handleOpenCreateBank : activeTab === 'tax' ? () => { setEditTax(null); setTaxForm({ country_code: '', tax_percentage: 0, tax_label: 'VAT' }); setShowTaxModal(true); } : () => { setAnalyticsTarget(null); setShowAnalytics(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-opacity"
          >
            {activeTab === 'integrations' ? <><PieChart size={16} /> All Analytics</> : <><Plus size={16} /> {activeTab === 'banks' ? 'Add Local Bank' : 'Add Tax Rate'}</>}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-secondary p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('gateways')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'gateways' ? 'bg-bg-card text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Payment Gateways
        </button>
        <button
          onClick={() => setActiveTab('banks')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'banks' ? 'bg-bg-card text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Local Banks
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'integrations' ? 'bg-bg-card text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Checkout Integrations
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'tax' ? 'bg-bg-card text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Tax Rates
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {activeTab === 'gateways' ? (
          <>
            {[
              { icon: CreditCard, label: 'Available Gateways', value: GATEWAY_REGISTRY.length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
              { icon: Shield, label: 'Active Methods', value: Object.values(gwConfigs).filter(c => c.enabled).length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
              { icon: CreditCard, label: 'Configured', value: Object.values(gwConfigs).filter(c => Object.keys(c).length > 2).length.toString(), color: '#8B5CF6', bg: 'bg-purple-500/10' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
                <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-2`}>
                  <Icon size={18} style={{ color }} />
                </div>
                <p className="text-xs text-text-secondary font-medium">{label}</p>
                <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
              </div>
            ))}
          </>
        ) : activeTab === 'banks' ? (
          <>
            {[
              { icon: Landmark, label: 'Active Banks', value: localBanks.filter(b => b.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
              { icon: Landmark, label: 'Inactive Banks', value: localBanks.filter(b => b.status === 'inactive').length.toString(), color: '#EF4444', bg: 'bg-red-500/10' },
              { icon: Landmark, label: 'Supported Countries', value: new Set(localBanks.map(b => b.country)).size.toString(), color: '#8B5CF6', bg: 'bg-purple-500/10' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
                <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-2`}>
                  <Icon size={18} style={{ color }} />
                </div>
                <p className="text-xs text-text-secondary font-medium">{label}</p>
                <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
              </div>
            ))}
          </>
        ) : activeTab === 'tax' ? (
          <>
            {[
              { icon: Shield, label: 'Configured Countries', value: taxRates.length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
              { icon: TrendingUp, label: 'Avg Tax Rate', value: (taxRates.reduce((a, c) => a + Number(c.tax_percentage), 0) / (taxRates.length || 1)).toFixed(1) + '%', color: '#3B82F6', bg: 'bg-blue-500/10' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
                <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-2`}>
                  <Icon size={18} style={{ color }} />
                </div>
                <p className="text-xs text-text-secondary font-medium">{label}</p>
                <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
              </div>
            ))}
          </>
        ) : (
          <>
            {[
              { icon: CheckCircle2, label: 'Success', value: checkoutIntegrations.reduce((a, c) => a + c.txSuccess, 0).toLocaleString(), color: '#10B981', bg: 'bg-emerald-500/10' },
              { icon: XCircle, label: 'Failed', value: checkoutIntegrations.reduce((a, c) => a + c.txFailed, 0).toLocaleString(), color: '#EF4444', bg: 'bg-red-500/10' },
              { icon: Clock, label: 'Pending', value: checkoutIntegrations.reduce((a, c) => a + c.txPending, 0).toLocaleString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
              { icon: XCircle, label: 'Cancelled', value: checkoutIntegrations.reduce((a, c) => a + c.txCancelled, 0).toLocaleString(), color: '#8B5CF6', bg: 'bg-purple-500/10' },
              { icon: Timer, label: 'Timeout', value: checkoutIntegrations.reduce((a, c) => a + c.txTimeout, 0).toLocaleString(), color: '#6B7280', bg: 'bg-gray-500/10' },
              { icon: ShoppingCart, label: 'Total SP', value: checkoutIntegrations.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="glass p-4 rounded-2xl border border-glass-border">
                <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-2`}>
                  <Icon size={18} style={{ color }} />
                </div>
                <p className="text-xs text-text-secondary font-medium">{label}</p>
                <h3 className="text-xl font-bold text-text-primary mt-0.5">{value}</h3>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={activeTab === 'gateways' ? "Search gateways..." : activeTab === 'banks' ? "Search banks..." : "Search integrations..."}
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none min-w-[140px]">
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          {activeTab === 'gateways' && <option value="coming_soon">Coming Soon</option>}
          {activeTab === 'integrations' && <option value="pending">Pending</option>}
          {activeTab === 'integrations' && <option value="suspended">Suspended</option>}
        </select>
        {activeTab === 'integrations' && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-bg-secondary border border-glass-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none min-w-[140px]">
            <option value="All">All Categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'gateways' ? (
            <motion.div key="gw-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* ── Multi-Gateway Config Cards ── */}
              <div>
                <p className="text-xs font-black text-text-secondary uppercase tracking-widest mb-3 mt-2">
                  Global Payment Gateways — Click to configure &amp; toggle active state
                </p>
                <div className="space-y-3">
                  {GATEWAY_REGISTRY.map(gw => {
                    const cfg = gwConfigs[gw.kvKey] ?? {};
                    const isEnabled = cfg.enabled === true;
                    const isExpanded = gwExpanded[gw.id] ?? false;
                    const fields = GATEWAY_FIELDS[gw.id] ?? [];
                    const isSaving = gwSaving[gw.id] ?? false;
                    const isConfigured = fields.some(f => (cfg[f.key] ?? '').toString().length > 4);

                    return (
                      <div
                        key={gw.id}
                        className={`border rounded-2xl overflow-hidden transition-all ${isEnabled
                            ? 'border-opacity-40 border-[color:var(--gw-color)]'
                            : 'border-glass-border'
                          }`}
                        style={{ '--gw-color': gw.color } as React.CSSProperties}
                      >
                        {/* Header row */}
                        <div className="flex items-center gap-3 p-4">
                          {/* Logo / Initials */}
                          <button
                            onClick={() => setGwExpanded(p => ({ ...p, [gw.id]: !p[gw.id] }))}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <div
                              className={`w-10 h-10 rounded-xl ${gw.bgClass} flex items-center justify-center text-xl shrink-0`}
                              style={{ color: gw.color }}
                            >
                              {gw.logoUrl ? (
                                <img src={gw.logoUrl} alt={gw.name} className="w-6 h-6 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                              ) : gw.flag}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-text-primary text-sm">{gw.name}</p>
                                {/* Country label badge */}
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-bg-secondary border border-glass-border text-text-secondary">
                                  {gw.region}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-bg-secondary border border-glass-border text-text-secondary">
                                  {gw.currencies.slice(0, 4).join(' · ')}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-secondary mt-0.5">
                                {isConfigured
                                  ? `Configured · ${isEnabled ? '🟢 Active' : '🔴 Inactive'} · ${gw.method} checkout`
                                  : 'Not configured · Click to set up'}
                                {' '}· Fee: <strong>{gw.fees}</strong>
                              </p>
                            </div>
                            <svg className={`w-4 h-4 text-text-secondary transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>

                          {/* Active toggle */}
                          <button
                            onClick={() => handleToggleGw(gw.id as GatewayId, !isEnabled)}
                            title={isEnabled ? 'Disable gateway' : 'Enable gateway'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shrink-0 ${isEnabled
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                : 'bg-bg-secondary text-text-secondary border border-glass-border hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                              }`}
                          >
                            <Power size={12} />
                            {isEnabled ? 'Active' : 'Inactive'}
                          </button>
                        </div>

                        {/* Collapsible config form */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-glass-border overflow-hidden"
                            >
                              <div className="p-5 space-y-4 bg-bg-secondary/30">
                                {/* Method + docs info */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${gw.method === 'popup' ? 'bg-blue-500/10 text-blue-400' :
                                        gw.method === 'async' ? 'bg-amber-500/10 text-amber-400' :
                                          'bg-purple-500/10 text-purple-400'
                                      }`}>
                                      {gw.method === 'popup' ? '⬡ Popup checkout' : gw.method === 'async' ? '⏳ Async (USSD)' : '↗ Redirect checkout'}
                                    </span>
                                    {gw.method === 'async' && (
                                      <span className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2 py-0.5">
                                        User receives USSD push on phone
                                      </span>
                                    )}
                                  </div>
                                  <a
                                    href={gw.docs}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] text-accent-primary hover:underline font-bold"
                                  >
                                    <ExternalLink size={11} />
                                    Docs
                                  </a>
                                </div>

                                {/* Credential fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {fields.map(field => (
                                    <div key={field.key}>
                                      <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">
                                        {field.label}
                                      </label>
                                      {field.type === 'select' ? (
                                        <select
                                          value={cfg[field.key] ?? ''}
                                          onChange={e => updateGwField(gw.kvKey, field.key, e.target.value)}
                                          className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                                          style={{ '--tw-ring-color': gw.color } as React.CSSProperties}
                                        >
                                          {field.options?.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type={field.type === 'password' ? 'password' : 'text'}
                                          value={cfg[field.key] ?? ''}
                                          onChange={e => updateGwField(gw.kvKey, field.key, e.target.value)}
                                          placeholder={field.placeholder ?? ''}
                                          className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent-primary"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Callback URL copy helper */}
                                {fields.some(f => f.key === 'callbackUrl') && (
                                  <div>
                                    <p className="text-[10px] text-text-secondary">
                                      Set the Callback/Webhook URL in your {gw.name} dashboard → Webhook Settings.
                                      Suggested: <code className="font-mono bg-bg-secondary px-1 py-0.5 rounded text-accent-primary">
                                        {`${window.location.origin}/functions/v1/${gw.id}-callback`}
                                      </code>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${window.location.origin}/functions/v1/${gw.id}-callback`);
                                          showToast('Copied!', 'success');
                                        }}
                                        className="ml-2 text-accent-primary hover:underline text-[10px] font-bold"
                                      >Copy</button>
                                    </p>
                                  </div>
                                )}

                                <div className="flex gap-3 pt-1">
                                  <button
                                    onClick={() => handleToggleGw(gw.id as GatewayId, !isEnabled)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${isEnabled
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                      }`}
                                  >
                                    <Power size={14} />
                                    {isEnabled ? 'Disable' : 'Enable'} Gateway
                                  </button>
                                  <button
                                    onClick={() => handleSaveGwConfig(gw.id as GatewayId)}
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 font-bold rounded-xl text-white text-sm transition-colors disabled:opacity-50"
                                    style={{ background: gw.color }}
                                  >
                                    {isSaving ? 'Saving…' : `Save ${gw.name} Configuration`}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'banks' ? (
            <motion.div key="bank-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {filteredBanks.sort((a, b) => a.country.localeCompare(b.country)).map(bank => (
                <div key={bank.id} className="bg-bg-card border border-glass-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                    <Landmark size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-text-primary">{bank.name}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${bank.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {bank.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-bg-secondary border border-glass-border text-text-secondary">
                        {bank.country}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">Added on {bank.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => { await supabase.from('local_banks').update({ status: bank.status === 'active' ? 'inactive' : 'active' }).eq('id', bank.id); setLocalBanks(prev => prev.map(b => b.id === bank.id ? { ...b, status: bank.status === 'active' ? 'inactive' : 'active' } : b)); }}
                      className={`p-2 rounded-xl transition-colors ${bank.status === 'active' ? 'text-red-500 bg-red-500/10' : 'text-green-500 bg-green-500/10'}`}
                    >
                      {bank.status === 'active' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    </button>
                    <button onClick={() => handleOpenEditBank(bank)} className="p-2 bg-bg-secondary text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={async () => { if (confirm('Delete bank?')) { await supabase.from('local_banks').delete().eq('id', bank.id); setLocalBanks(prev => prev.filter(b => b.id !== bank.id)); } }} className="p-2 bg-bg-secondary text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredBanks.length === 0 && (
                <div className="text-center py-12 text-text-secondary border border-glass-border rounded-xl bg-bg-card">No local banks found.</div>
              )}
            </motion.div>
          ) : activeTab === 'tax' ? (
            <motion.div key="tax-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-bg-card border border-glass-border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-secondary/50 border-b border-glass-border text-[10px] font-black uppercase text-text-secondary">
                    <tr>
                      <th className="px-6 py-3">Country</th>
                      <th className="px-6 py-3">Tax Label</th>
                      <th className="px-6 py-3">Percentage</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {taxRates.map(rate => (
                      <tr key={rate.id} className="hover:bg-bg-secondary/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-text-primary uppercase">{rate.country_code}</td>
                        <td className="px-6 py-4 text-text-secondary">{rate.tax_label}</td>
                        <td className="px-6 py-4 font-black text-accent-primary">{rate.tax_percentage}%</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => { setEditTax(rate); setTaxForm({ country_code: rate.country_code, tax_percentage: rate.tax_percentage, tax_label: rate.tax_label }); setShowTaxModal(true); }} className="p-2 hover:text-accent-primary transition-colors"><Edit2 size={14} /></button>
                          <button onClick={async () => { if (confirm('Delete tax rate?')) { await supabase.from('country_tax_rates').delete().eq('id', rate.id); fetchTaxRates(); } }} className="p-2 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Checkout Integrations List */}
        {activeTab === 'integrations' && (
          <motion.div key="ci-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {filteredIntegrations.sort((a, b) => b.volumeNrt - a.volumeNrt).map(ci => (
              <div key={ci.id} className="bg-bg-card border border-glass-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                  <ShoppingCart size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-text-primary">{ci.spName}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${ci.status === 'active' ? 'bg-green-500/10 text-green-500' : ci.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                      {ci.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-bg-secondary border border-glass-border text-text-secondary">{ci.country}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400">{ci.category}</span>
                  </div>
                  <p className="text-sm text-text-secondary mb-1">Service: {ci.serviceName} &bull; {ci.spEmail}</p>
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span>Volume: <strong className="text-text-primary">{ci.volumeNrt.toLocaleString()} NRT</strong></span>
                    <span>Tx: <strong className="text-text-primary">{ci.txCount.toLocaleString()}</strong></span>
                    <span>Since: {ci.createdAt}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => { setAnalyticsTarget(ci); setShowAnalytics(true); }} className="p-2 bg-bg-secondary text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors" title="View Analytics">
                    <TrendingUp size={16} />
                  </button>
                  <button onClick={async () => { const ns = ci.status === 'active' ? 'suspended' : 'active'; await supabase.from('checkout_integrations').update({ status: ns }).eq('id', ci.id); setCheckoutIntegrations(prev => prev.map(x => x.id === ci.id ? { ...x, status: ns } : x)); }}
                    className={`p-2 rounded-xl transition-colors ${ci.status === 'active' ? 'text-red-500 bg-red-500/10' : 'text-green-500 bg-green-500/10'}`}>
                    {ci.status === 'active' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  </button>
                  <button onClick={async () => { if (confirm('Remove this integration?')) { await supabase.from('checkout_integrations').delete().eq('id', ci.id); setCheckoutIntegrations(prev => prev.filter(x => x.id !== ci.id)); } }} className="p-2 bg-bg-secondary text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {filteredIntegrations.length === 0 && (
              <div className="text-center py-12 text-text-secondary border border-glass-border rounded-xl bg-bg-card">No checkout integrations found.</div>
            )}
          </motion.div>
        )}
      </div>

      {/* Bank Modal */}
      <AnimatePresence>
        {showBankModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowBankModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold">{editBank ? 'Edit Local Bank' : 'Add Local Bank'}</h3>
                <button onClick={() => setShowBankModal(false)} className="p-1 rounded-full bg-bg-secondary hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Bank Name</label>
                  <input value={bankForm.name} onChange={e => setBankForm({ ...bankForm, name: e.target.value })}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" placeholder="e.g. GTBank" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Country</label>
                  <input value={bankForm.country} onChange={e => setBankForm({ ...bankForm, country: e.target.value })}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" placeholder="e.g. Nigeria, USA, UK" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Status</label>
                  <select value={bankForm.status} onChange={e => setBankForm({ ...bankForm, status: e.target.value as any })}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary outline-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-glass-border flex gap-3">
                <button onClick={() => setShowBankModal(false)} className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-bold text-sm border border-glass-border">Cancel</button>
                <button onClick={handleSaveBank} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm">{editBank ? 'Save' : 'Add'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Modal */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAnalytics(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-glass-border flex justify-between items-center bg-bg-secondary">
                <h3 className="font-bold flex items-center gap-2">
                  <PieChart size={20} className="text-accent-primary" />
                  {analyticsTarget ? `${analyticsTarget.spName} Checkout Analytics` : 'Global Checkout Analytics'}
                </h3>
                <button onClick={() => setShowAnalytics(false)} className="p-1.5 rounded-full bg-bg-card hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-6">
                {(() => {
                  const data = analyticsTarget ? [analyticsTarget] : checkoutIntegrations;
                  const tSuc = data.reduce((a, c) => a + c.txSuccess, 0);
                  const tFail = data.reduce((a, c) => a + c.txFailed, 0);
                  const tPend = data.reduce((a, c) => a + c.txPending, 0);
                  const tCanc = data.reduce((a, c) => a + c.txCancelled, 0);
                  const tTime = data.reduce((a, c) => a + c.txTimeout, 0);
                  const totalTx = tSuc + tFail + tPend + tCanc + tTime;

                  const pSuc = totalTx ? (tSuc / totalTx) * 100 : 0;
                  const pFail = totalTx ? (tFail / totalTx) * 100 : 0;
                  const pPend = totalTx ? (tPend / totalTx) * 100 : 0;
                  const pCanc = totalTx ? (tCanc / totalTx) * 100 : 0;
                  const pTime = totalTx ? (tTime / totalTx) * 100 : 0;

                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="glass p-4 rounded-xl border border-glass-border">
                          <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Total Volume</p>
                          <p className="text-xl font-black text-text-primary">{data.reduce((a, c) => a + c.volumeNrt, 0).toLocaleString()} NRT</p>
                        </div>
                        <div className="glass p-4 rounded-xl border border-glass-border">
                          <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Total Transactions</p>
                          <p className="text-xl font-black text-text-primary">{totalTx.toLocaleString()}</p>
                        </div>
                        {!analyticsTarget && (
                          <div className="glass p-4 rounded-xl border border-glass-border">
                            <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Active Integrations</p>
                            <p className="text-xl font-black text-green-500">{data.filter(c => c.status === 'active').length}</p>
                          </div>
                        )}
                        <div className="glass p-4 rounded-xl border border-glass-border">
                          <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">Success Rate</p>
                          <p className="text-xl font-black text-blue-500">{pSuc.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold mb-4">Transaction Distribution</h4>
                        <div className="h-6 w-full rounded-full overflow-hidden flex mb-3">
                          <div style={{ width: `${pSuc}%` }} className="h-full bg-emerald-500" title={`Success: ${pSuc.toFixed(1)}%`} />
                          <div style={{ width: `${pFail}%` }} className="h-full bg-red-500" title={`Failed: ${pFail.toFixed(1)}%`} />
                          <div style={{ width: `${pPend}%` }} className="h-full bg-amber-500" title={`Pending: ${pPend.toFixed(1)}%`} />
                          <div style={{ width: `${pCanc}%` }} className="h-full bg-purple-500" title={`Cancelled: ${pCanc.toFixed(1)}%`} />
                          <div style={{ width: `${pTime}%` }} className="h-full bg-gray-500" title={`Timeout: ${pTime.toFixed(1)}%`} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {[
                            { l: 'Success', v: tSuc, p: pSuc, c: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                            { l: 'Failed', v: tFail, p: pFail, c: 'text-red-500', bg: 'bg-red-500/10' },
                            { l: 'Pending', v: tPend, p: pPend, c: 'text-amber-500', bg: 'bg-amber-500/10' },
                            { l: 'Cancelled', v: tCanc, p: pCanc, c: 'text-purple-500', bg: 'bg-purple-500/10' },
                            { l: 'Timeout', v: tTime, p: pTime, c: 'text-gray-500', bg: 'bg-gray-500/10' },
                          ].map(x => (
                            <div key={x.l} className={`p-3 rounded-xl border border-glass-border ${x.bg} text-center`}>
                              <div className={`text-[10px] font-bold uppercase ${x.c} mb-1`}>{x.l}</div>
                              <div className="font-black text-lg">{x.v.toLocaleString()}</div>
                              <div className="text-[10px] text-text-secondary mt-1">{x.p.toFixed(1)}%</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {!analyticsTarget && (
                        <div>
                          <h4 className="text-sm font-bold mb-3">Top Integrations by Volume</h4>
                          <div className="space-y-2">
                            {[...data].sort((a, b) => b.volumeNrt - a.volumeNrt).slice(0, 5).map((ci, i) => (
                              <div key={ci.id} className="flex items-center gap-3 p-3 glass rounded-xl border border-glass-border">
                                <div className="w-6 h-6 rounded-full bg-bg-secondary flex items-center justify-center text-xs font-bold text-text-secondary">{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate">{ci.spName}</div>
                                  <div className="text-[10px] text-text-secondary truncate">{ci.category} • {ci.country}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-sm text-accent-primary">{ci.volumeNrt.toLocaleString()} NRT</div>
                                  <div className="text-[10px] text-text-secondary">{ci.txCount.toLocaleString()} txs</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tax Modal */}
      <AnimatePresence>
        {showTaxModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowTaxModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-sm overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold">{editTax ? 'Edit Tax Rate' : 'Add Tax Rate'}</h3>
                <button onClick={() => setShowTaxModal(false)} className="p-1 rounded-full bg-bg-secondary hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Country Code (ISO 2)</label>
                  <input value={taxForm.country_code} onChange={e => setTaxForm({ ...taxForm, country_code: e.target.value })}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" placeholder="e.g. NG, US, GB" maxLength={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Tax Label</label>
                    <input value={taxForm.tax_label} onChange={e => setTaxForm({ ...taxForm, tax_label: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" placeholder="e.g. VAT, GST" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Percentage (%)</label>
                    <input type="number" value={taxForm.tax_percentage} onChange={e => setTaxForm({ ...taxForm, tax_percentage: Number(e.target.value) })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-glass-border flex gap-3">
                <button onClick={() => setShowTaxModal(false)} className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-bold text-sm border border-glass-border">Cancel</button>
                <button onClick={handleSaveTax} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
