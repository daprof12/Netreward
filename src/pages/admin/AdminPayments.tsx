import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Shield, Plus, Edit2, Trash2, X, Search, Landmark, CheckCircle2, AlertCircle, ShoppingCart, BarChart3, PieChart, TrendingUp, Clock, XCircle, Timer } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { supabase } from '@/lib/supabase';
import { useToastStore } from '@/stores/useToastStore';
import { usePageTitle } from '@/hooks/usePageTitle';

type ActiveTab = 'gateways' | 'banks' | 'integrations' | 'tax';

export default function AdminPayments() {
  usePageTitle('Admin — Payments');
  const { showToast } = useToastStore();
  const [gateways, setGateways] = useState<any[]>([]);
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
        const [g, b, ci] = await Promise.all([
          supabase.from('payment_gateways').select('*').order('name'),
          supabase.from('local_banks').select('*').order('name'),
          supabase.from('checkout_integrations').select('*').order('created_at', { ascending: false }),
        ]);
        setGateways((g.data || []).map((x: any) => ({ ...x, type: x.type || x.gateway_type || '', createdAt: x.created_at })));
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

  // ── OPay Config State ──
  const [opayConfig, setOpayConfig] = useState({ opay_merchant_id: '', opay_public_key: '', opay_secret_key: '', opay_environment: 'sandbox', opay_callback_url: '' });
  const [opayConfigSaving, setOpayConfigSaving] = useState(false);
  const [showOpayConfig, setShowOpayConfig] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('kv_settings').select('key, value').in('key', ['opay_merchant_id', 'opay_public_key', 'opay_secret_key', 'opay_environment', 'opay_callback_url']);
      if (data) {
        const cfg: any = { ...opayConfig };
        data.forEach((s: any) => { cfg[s.key] = s.value || ''; });
        setOpayConfig(cfg);
      }
    })();
  }, []);

  const handleSaveOpayConfig = async () => {
    setOpayConfigSaving(true);
    try {
      for (const [key, value] of Object.entries(opayConfig)) {
        await supabase.from('kv_settings').upsert({ key, value });
      }
      showToast('OPay configuration saved', 'success');
    } catch (e: any) { showToast(e.message || 'Failed to save', 'danger'); }
    setOpayConfigSaving(false);
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
  
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editGateway, setEditGateway] = useState<any | null>(null);
  const [editBank, setEditBank] = useState<any | null>(null);
  
  const [gatewayForm, setGatewayForm] = useState<any>({
    name: '', type: 'Fiat On-Ramp', status: 'active', fees: '', description: '', country: 'Global'
  });
  
  const [bankForm, setBankForm] = useState<any>({
    name: '', country: 'Nigeria', status: 'active'
  });

  const allCountries = [...new Set([...gateways.map(g => g.country), ...localBanks.map(b => b.country)])].sort();

  const filteredGateways = gateways.filter(g => {
    const q = search.toLowerCase();
    const matchQ = !q || g.name.toLowerCase().includes(q) || g.type.toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || g.country === countryFilter;
    const matchStatus = statusFilter === 'All' || g.status === statusFilter;
    return matchQ && matchCountry && matchStatus;
  });

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

  // Gateway Handlers
  const handleOpenCreateGateway = () => {
    setEditGateway(null);
    setGatewayForm({ name: '', type: 'Fiat On-Ramp', status: 'active', fees: '', description: '', country: 'Global' });
    setShowGatewayModal(true);
  };

  const handleOpenEditGateway = (gw: any) => {
    setEditGateway(gw);
    setGatewayForm(gw);
    setShowGatewayModal(true);
  };

  const handleSaveGateway = async () => {
    if (!gatewayForm.name || !gatewayForm.type) { showToast('Name and type are required.', 'danger'); return; }
    const dbPayload = { ...gatewayForm, gateway_type: gatewayForm.type };
    try {
      if (editGateway) {
        await supabase.from('payment_gateways').update(dbPayload).eq('id', editGateway.id);
        setGateways(prev => prev.map(g => g.id === editGateway.id ? { ...g, ...gatewayForm } : g));
        showToast('Gateway updated successfully.', 'success');
      } else {
        const newGw = { id: crypto.randomUUID(), ...dbPayload };
        await supabase.from('payment_gateways').insert(newGw);
        setGateways(prev => [...prev, { ...newGw, type: gatewayForm.type }]);
        showToast('Gateway created successfully.', 'success');
      }
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
    setShowGatewayModal(false);
  };

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
        <button 
          onClick={activeTab === 'gateways' ? handleOpenCreateGateway : activeTab === 'banks' ? handleOpenCreateBank : activeTab === 'tax' ? () => { setEditTax(null); setTaxForm({ country_code: '', tax_percentage: 0, tax_label: 'VAT' }); setShowTaxModal(true); } : () => { setAnalyticsTarget(null); setShowAnalytics(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-opacity"
        >
          {activeTab === 'integrations' ? <><PieChart size={16} /> All Analytics</> : <><Plus size={16} /> {activeTab === 'gateways' ? 'Add Gateway' : activeTab === 'banks' ? 'Add Local Bank' : 'Add Tax Rate'}</>}
        </button>
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
              { icon: CreditCard, label: 'Active Gateways', value: gateways.filter(g => g.status === 'active').length.toString(), color: '#10B981', bg: 'bg-emerald-500/10' },
              { icon: Shield, label: 'Coming Soon', value: gateways.filter(g => g.status === 'coming_soon').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
              { icon: CreditCard, label: 'Total Methods', value: gateways.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
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
              { icon: TrendingUp, label: 'Avg Tax Rate', value: (taxRates.reduce((a,c) => a + Number(c.tax_percentage), 0) / (taxRates.length || 1)).toFixed(1) + '%', color: '#3B82F6', bg: 'bg-blue-500/10' },
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
              {/* OPay Configuration Card */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 rounded-2xl overflow-hidden">
                <button onClick={() => setShowOpayConfig(!showOpayConfig)} className="w-full p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">OP</div>
                    <div className="text-left">
                      <p className="font-bold text-text-primary">OPay Gateway Configuration</p>
                      <p className="text-xs text-text-secondary">
                        {opayConfig.opay_merchant_id ? `Merchant: ${opayConfig.opay_merchant_id.slice(0, 8)}...` : 'Not configured'} · {opayConfig.opay_environment === 'production' ? '🟢 Production' : '🟡 Sandbox'}
                      </p>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-text-secondary transition-transform ${showOpayConfig ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                <AnimatePresence>
                  {showOpayConfig && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-emerald-500/20 overflow-hidden">
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">Merchant ID</label>
                            <input value={opayConfig.opay_merchant_id} onChange={e => setOpayConfig({...opayConfig, opay_merchant_id: e.target.value})} placeholder="256612345678901"
                              className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">Environment</label>
                            <select value={opayConfig.opay_environment} onChange={e => setOpayConfig({...opayConfig, opay_environment: e.target.value})}
                              className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500">
                              <option value="sandbox">🟡 Sandbox (Testing)</option>
                              <option value="production">🟢 Production (Live)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">Public Key</label>
                            <input value={opayConfig.opay_public_key} onChange={e => setOpayConfig({...opayConfig, opay_public_key: e.target.value})} placeholder="OPAYPUB..."
                              className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">Secret Key</label>
                            <input type="password" value={opayConfig.opay_secret_key} onChange={e => setOpayConfig({...opayConfig, opay_secret_key: e.target.value})} placeholder="OPAYSEC..."
                              className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1 block">Webhook Callback URL</label>
                          <div className="flex gap-2">
                            <input value={opayConfig.opay_callback_url || `${window.location.origin}/functions/v1/opay-callback`} onChange={e => setOpayConfig({...opayConfig, opay_callback_url: e.target.value})}
                              className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-500" />
                            <button onClick={() => { navigator.clipboard.writeText(opayConfig.opay_callback_url || `${window.location.origin}/functions/v1/opay-callback`); showToast('Copied!', 'success'); }}
                              className="px-3 py-2 bg-bg-secondary border border-glass-border rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary">Copy</button>
                          </div>
                          <p className="text-[10px] text-text-secondary mt-1">Set this URL in your OPay merchant dashboard → Webhook Settings</p>
                        </div>
                        <button onClick={handleSaveOpayConfig} disabled={opayConfigSaving}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                          {opayConfigSaving ? 'Saving...' : 'Save OPay Configuration'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {filteredGateways.sort((a, b) => a.country.localeCompare(b.country)).map(gw => (
                <div key={gw.id} className="bg-bg-card border border-glass-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary shrink-0">
                    <CreditCard size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-text-primary">{gw.name}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${gw.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {gw.status === 'active' ? 'Active' : 'Coming Soon'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-bg-secondary border border-glass-border text-text-secondary">
                        {gw.country}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-1">{gw.description}</p>
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Shield size={12} /> {gw.type}</span>
                      <span>Fees: <strong className="text-text-primary">{gw.fees || '0%'}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleOpenEditGateway(gw)} className="p-2 bg-bg-secondary text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={async () => { if(confirm('Delete gateway?')) { await supabase.from('payment_gateways').delete().eq('id', gw.id); setGateways(prev => prev.filter(g => g.id !== gw.id)); } }} className="p-2 bg-bg-secondary text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredGateways.length === 0 && (
                <div className="text-center py-12 text-text-secondary border border-glass-border rounded-xl bg-bg-card">No gateways found.</div>
              )}
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
                    <button onClick={async () => { if(confirm('Delete bank?')) { await supabase.from('local_banks').delete().eq('id', bank.id); setLocalBanks(prev => prev.filter(b => b.id !== bank.id)); } }} className="p-2 bg-bg-secondary text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
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
                          <button onClick={async () => { if(confirm('Delete tax rate?')) { await supabase.from('country_tax_rates').delete().eq('id', rate.id); fetchTaxRates(); } }} className="p-2 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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
                  <button onClick={async () => { if(confirm('Remove this integration?')) { await supabase.from('checkout_integrations').delete().eq('id', ci.id); setCheckoutIntegrations(prev => prev.filter(x => x.id !== ci.id)); } }} className="p-2 bg-bg-secondary text-text-secondary hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
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

      {/* Gateway Modal */}
      <AnimatePresence>
        {showGatewayModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowGatewayModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-md overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-glass-border flex justify-between items-center">
                <h3 className="font-bold">{editGateway ? 'Edit Gateway' : 'Add Gateway'}</h3>
                <button onClick={() => setShowGatewayModal(false)} className="p-1 rounded-full bg-bg-secondary hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Gateway Name</label>
                  <input value={gatewayForm.name} onChange={e => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" placeholder="e.g. Stripe Connect" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Type</label>
                    <input value={gatewayForm.type} onChange={e => setGatewayForm({ ...gatewayForm, type: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" placeholder="e.g. Fiat On-Ramp" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Country</label>
                    <input value={gatewayForm.country} onChange={e => setGatewayForm({ ...gatewayForm, country: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" placeholder="e.g. Global, USA, Nigeria" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Status</label>
                    <select value={gatewayForm.status} onChange={e => setGatewayForm({ ...gatewayForm, status: e.target.value as any })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary outline-none">
                      <option value="active">Active</option>
                      <option value="coming_soon">Coming Soon</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Fees</label>
                    <input value={gatewayForm.fees} onChange={e => setGatewayForm({ ...gatewayForm, fees: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" placeholder="e.g. 2.9% + $0.30" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Description</label>
                  <textarea value={gatewayForm.description} onChange={e => setGatewayForm({ ...gatewayForm, description: e.target.value })} rows={3}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary resize-none" placeholder="Description of the gateway..." />
                </div>
              </div>
              <div className="p-4 border-t border-glass-border flex gap-3">
                <button onClick={() => setShowGatewayModal(false)} className="flex-1 py-2.5 rounded-xl bg-bg-secondary text-text-primary font-bold text-sm border border-glass-border">Cancel</button>
                <button onClick={handleSaveGateway} className="flex-1 py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm">{editGateway ? 'Save Changes' : 'Create'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                                <div className="w-6 h-6 rounded-full bg-bg-secondary flex items-center justify-center text-xs font-bold text-text-secondary">{i+1}</div>
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
