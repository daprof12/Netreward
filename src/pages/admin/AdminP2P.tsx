import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, AlertCircle, CheckCircle2, X, Tags, ArrowLeftRight, CreditCard, Loader2 } from 'lucide-react';
import LocationSearch from '@/components/LocationSearch';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';

const TAB_OPTIONS = [
  { id: 'disputes', label: 'Disputes', icon: MessageSquare },
  { id: 'offers', label: 'Offers', icon: Tags },
  { id: 'trades', label: 'Trades', icon: ArrowLeftRight },
  { id: 'payment_methods', label: 'Payment Methods', icon: CreditCard },
] as const;

function DisputeTab() {
  const { showToast } = useToastStore();
  const [p2pDisputes, setP2pDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');
  const [viewDispute, setViewDispute] = useState<any | null>(null);
  const [reply, setReply] = useState('');
  const [replyTarget, setReplyTarget] = useState<'buyer' | 'seller' | 'both'>('both');
  const [internalNote, setInternalNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('p2p_disputes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setP2pDisputes((data || []).map((d: any) => ({
        ...d,
        tradeId: d.trade_id || d.order_id || d.id,
        buyerEmail: d.buyer_email || d.buyer_id || 'Unknown',
        sellerEmail: d.seller_email || d.seller_id || 'Unknown',
        amount: Number(d.amount || 0),
        reason: d.reason || '',
        country: d.country || 'Unknown',
        createdAt: d.created_at,
        messages: d.messages || [],
      })));
    } catch (e: any) { console.error('Fetch disputes:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const allCountries = React.useMemo(() => {
    const uniqueCountries = new Set(p2pDisputes.map(d => d.country || 'Unknown'));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [p2pDisputes]);

  const filtered = React.useMemo(() => p2pDisputes.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || (d.tradeId || '').toLowerCase().includes(q) || (d.buyerEmail || '').toLowerCase().includes(q) || (d.sellerEmail || '').toLowerCase().includes(q);
    const matchCountry = countryFilter === 'Global' || (d.country || 'Unknown') === countryFilter;
    return matchQ && matchCountry;
  }), [p2pDisputes, search, countryFilter]);

  const handleResolve = async (id: string) => {
    if (!confirm('Resolve this dispute? This action is final.')) return;
    try {
      await supabase.from('p2p_disputes').update({ status: 'resolved' }).eq('id', id);
      setP2pDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved' } : d));
      showToast('Dispute marked as resolved.', 'success');
      if (viewDispute?.id === id) setViewDispute(null);
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const handleEscalate = async (id: string) => {
    try {
      await supabase.from('p2p_disputes').update({ status: 'escalated' }).eq('id', id);
      setP2pDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'escalated' } : d));
      showToast('Dispute escalated to senior admin.', 'warning');
    } catch (e: any) { showToast(e.message || 'Update failed', 'error'); }
  };

  const handleReply = async () => {
    if (!reply.trim() || !viewDispute) return;
    const msg = { sender: 'admin', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), target: replyTarget };
    const updatedMessages = [...(viewDispute.messages || []), msg];
    try {
      await supabase.from('p2p_disputes').update({ messages: updatedMessages }).eq('id', viewDispute.id);
      setViewDispute({ ...viewDispute, messages: updatedMessages });
      setP2pDisputes(prev => prev.map(d => d.id === viewDispute.id ? { ...d, messages: updatedMessages } : d));
      setReply('');
      showToast('Message sent.', 'success');
    } catch (e: any) { showToast(e.message || 'Send failed', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: MessageSquare, label: 'Total Disputes', value: p2pDisputes.length.toString(), color: '#3B82F6', bg: 'bg-blue-500/10' },
          { icon: AlertCircle, label: 'Open', value: p2pDisputes.filter(d => d.status === 'open').length.toString(), color: '#F59E0B', bg: 'bg-amber-500/10' },
          { icon: X, label: 'Escalated', value: p2pDisputes.filter(d => d.status === 'escalated').length.toString(), color: '#EF4444', bg: 'bg-red-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="glass p-5 rounded-2xl border border-glass-border">
            <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} style={{ color }} />
            </div>
            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{label}</p>
            <h3 className="text-2xl font-black text-text-primary mt-1">{value}</h3>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by trade ID or email..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['Trade ID', 'Buyer', 'Seller', 'Amount (NRT)', 'Reason', 'Country', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-text-primary">{d.tradeId}</td>
                  <td className="px-4 py-3 text-text-secondary">{d.buyerEmail}</td>
                  <td className="px-4 py-3 text-text-secondary">{d.sellerEmail}</td>
                  <td className="px-4 py-3 font-bold text-accent-primary">{d.amount}</td>
                  <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{d.reason}</td>
                  <td className="px-4 py-3 text-text-secondary">{d.country || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${d.status === 'resolved' ? 'bg-green-500/10 text-green-500' : d.status === 'open' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewDispute(d)} className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary border border-glass-border rounded-lg text-xs font-bold text-text-secondary hover:text-accent-primary transition-colors">
                      <MessageSquare size={14} /> View Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No disputes found.</div>}
        </div>
      </div>

      <AnimatePresence>
        {viewDispute && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewDispute(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-bg-card border border-glass-border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
              
              <div className="p-4 border-b border-glass-border flex justify-between items-center bg-bg-secondary shrink-0">
                <div>
                  <h3 className="font-bold flex items-center gap-2">Dispute: {viewDispute.tradeId}</h3>
                  <p className="text-xs text-text-secondary">Buyer: {viewDispute.buyerEmail} | Seller: {viewDispute.sellerEmail}</p>
                </div>
                <button onClick={() => setViewDispute(null)} className="p-1.5 rounded-full hover:bg-glass-border transition-colors"><X size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-text-primary">
                  <span className="font-bold text-red-500 mr-2">Reason:</span>{viewDispute.reason}
                </div>
                
                {viewDispute.messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-bold text-text-secondary">{m.sender}</span>
                      {m.target && m.target !== 'both' && (
                        <span className="text-[10px] font-bold text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded uppercase">
                          To: {m.target}
                        </span>
                      )}
                      <span className="text-[10px] text-text-secondary">{m.time}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-sm ${m.sender === 'admin' ? 'bg-accent-primary text-white' : 'bg-bg-secondary border border-glass-border text-text-primary'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-glass-border bg-bg-secondary shrink-0">
                {viewDispute.status !== 'resolved' ? (
                  <div className="space-y-4">
                    {/* Internal Investigation Notes */}
                    <div className="bg-bg-card/50 border border-glass-border rounded-xl p-3">
                      <label className="text-[10px] font-black text-text-secondary uppercase mb-2 block tracking-wider">Internal Investigation Notes (Private)</label>
                      <textarea
                        value={internalNote}
                        onChange={e => setInternalNote(e.target.value)}
                        placeholder="Add private notes about your manual investigation steps..."
                        className="w-full bg-transparent text-xs text-text-primary outline-none min-h-[60px] resize-none"
                      />
                    </div>

                    {!showResolutionForm ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <select 
                            value={replyTarget} 
                            onChange={e => setReplyTarget(e.target.value as any)}
                            className="bg-bg-card border border-glass-border rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-accent-primary text-text-secondary"
                          >
                            <option value="both">Both</option>
                            <option value="buyer">Buyer</option>
                            <option value="seller">Seller</option>
                          </select>
                          <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()}
                            placeholder="Type admin reply..." className="flex-1 bg-bg-card border border-glass-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent-primary" />
                          <button onClick={handleReply} className="px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20">Send</button>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowResolutionForm(true)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-sm font-bold hover:bg-green-500/20 transition-colors"><CheckCircle2 size={16} /> Resolve Case</button>
                          <button onClick={() => handleEscalate(viewDispute.id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-sm font-bold hover:bg-amber-500/20 transition-colors"><AlertCircle size={16} /> Escalate</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                          <label className="text-[10px] font-black text-green-500 uppercase mb-2 block">Final Resolution Summary</label>
                          <textarea
                            value={resolutionSummary}
                            onChange={e => setResolutionSummary(e.target.value)}
                            placeholder="Explain the final decision and actions taken (will be visible to both parties)..."
                            className="w-full bg-transparent text-sm text-text-primary outline-none min-h-[80px] resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowResolutionForm(false)} className="flex-1 py-2 text-sm font-bold text-text-secondary">Back</button>
                          <button 
                            onClick={() => {
                              if (!resolutionSummary.trim()) {
                                showToast('Please provide a resolution summary', 'warning');
                                return;
                              }
                              handleResolve(viewDispute.id);
                            }} 
                            className="flex-2 flex-grow py-2 bg-green-500 text-white rounded-xl text-sm font-bold"
                          >
                            Confirm Resolution & Close Case
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-sm font-bold text-green-500 py-2">This dispute has been resolved.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OffersTab() {
  const [p2pOffers, setP2pOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('p2p_offers').select('*').order('created_at', { ascending: false });
        setP2pOffers((data || []).map((o: any) => ({
          ...o,
          userEmail: o.user_email || o.user_id || 'Unknown',
          nrtAmount: Number(o.nrt_amount || o.amount || 0),
          pricePerNrt: Number(o.price_per_nrt || o.price || 0),
          minLimit: Number(o.min_limit || 0),
          maxLimit: Number(o.max_limit || 0),
          country: o.country || 'Unknown',
          createdAt: o.created_at,
        })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const allCountries = React.useMemo(() => {
    const uniqueCountries = new Set(p2pOffers.map(o => o.country || 'Unknown'));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [p2pOffers]);

  const filtered = React.useMemo(() => p2pOffers.filter(o => {
    const matchQ = !search || o.userEmail.toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === 'Global' || (o.country || 'Unknown') === countryFilter;
    return matchQ && matchCountry;
  }), [p2pOffers, search, countryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search offers by email..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
      </div>
      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['ID', 'User', 'Type', 'Amount (NRT)', 'Price (USD)', 'Limits', 'Country', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-text-primary">{o.id}</td>
                  <td className="px-4 py-3 text-text-secondary">{o.userEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${o.type === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{o.type}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-accent-primary">{o.nrtAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-text-primary">${o.pricePerNrt}</td>
                  <td className="px-4 py-3 text-text-secondary">${o.minLimit} - ${o.maxLimit}</td>
                  <td className="px-4 py-3 text-text-secondary">{o.country || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${o.status === 'active' ? 'bg-blue-500/10 text-blue-500' : 'bg-glass-border text-text-secondary'}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No offers found.</div>}
        </div>
      </div>
    </div>
  );
}

function TradesTab() {
  const [p2pTrades, setP2pTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('p2p_orders').select('*').order('created_at', { ascending: false });
        setP2pTrades((data || []).map((t: any) => ({
          ...t,
          offerId: t.offer_id || '',
          buyerEmail: t.buyer_email || t.buyer_id || 'Unknown',
          sellerEmail: t.seller_email || t.seller_id || 'Unknown',
          nrtAmount: Number(t.nrt_amount || t.amount || 0),
          fiatAmount: Number(t.fiat_amount || 0),
          country: t.country || 'Unknown',
          createdAt: t.created_at,
        })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const allCountries = React.useMemo(() => {
    const uniqueCountries = new Set(p2pTrades.map(t => t.country || 'Unknown'));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [p2pTrades]);

  const filtered = React.useMemo(() => p2pTrades.filter(t => {
    const matchQ = !search || t.id.toLowerCase().includes(search.toLowerCase()) || t.buyerEmail.toLowerCase().includes(search.toLowerCase()) || t.sellerEmail.toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === 'Global' || (t.country || 'Unknown') === countryFilter;
    return matchQ && matchCountry;
  }), [p2pTrades, search, countryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trades by ID or email..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
      </div>
      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['Trade ID', 'Offer ID', 'Buyer', 'Seller', 'NRT Amount', 'Fiat Amount', 'Country', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-text-primary">{t.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{t.offerId}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.buyerEmail}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.sellerEmail}</td>
                  <td className="px-4 py-3 font-bold text-accent-primary">{t.nrtAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-text-primary">${t.fiatAmount}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.country || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      t.status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                      t.status === 'disputed' ? 'bg-red-500/10 text-red-500' : 
                      'bg-amber-500/10 text-amber-500'
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No trades found.</div>}
        </div>
      </div>
    </div>
  );
}

function PaymentMethodsTab() {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('Global');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('p2p_payment_methods').select('*').order('created_at', { ascending: false });
        setPaymentMethods((data || []).map((p: any) => ({
          ...p,
          userEmail: p.user_email || p.user_id || 'Unknown',
          bankName: p.bank_name || p.method_type || '',
          accountName: p.account_name || '',
          accountNumber: p.account_number || '',
          country: p.country || 'Unknown',
        })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const allCountries = React.useMemo(() => {
    const uniqueCountries = new Set(paymentMethods.map(p => p.country || 'Unknown'));
    return ['All', ...Array.from(uniqueCountries).sort()];
  }, [paymentMethods]);

  const filtered = React.useMemo(() => paymentMethods.filter(p => {
    const matchQ = !search || (p.userEmail || '').toLowerCase().includes(search.toLowerCase()) || (p.bankName || '').toLowerCase().includes(search.toLowerCase());
    const matchCountry = countryFilter === 'Global' || (p.country || 'Unknown') === countryFilter;
    return matchQ && matchCountry;
  }), [paymentMethods, search, countryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search methods by email or bank..."
            className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="min-w-[200px] flex-1 sm:flex-none"><LocationSearch value={countryFilter} onChange={setCountryFilter} /></div>
      </div>
      <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border bg-bg-secondary">
                {['ID', 'User Email', 'Bank Name', 'Account Name', 'Account Number', 'Country', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-text-secondary uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-text-primary">{p.id}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.userEmail}</td>
                  <td className="px-4 py-3 font-bold text-text-primary">{p.bankName}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.accountName}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{p.accountNumber}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.country || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${p.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-text-secondary">No payment methods found.</div>}
        </div>
      </div>
    </div>
  );
}

export default function AdminP2P() {
  const [activeTab, setActiveTab] = useState<typeof TAB_OPTIONS[number]['id']>('disputes');

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black">P2P Management</h1>
        <p className="text-sm text-text-secondary">Manage P2P offers, trades, payment methods, and disputes</p>
      </div>

      <div className="flex bg-bg-secondary p-1 rounded-xl w-full max-w-2xl overflow-x-auto scrollbar-hide">
        {TAB_OPTIONS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab.id ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon size={16} /> <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === 'disputes' && <DisputeTab />}
          {activeTab === 'offers' && <OffersTab />}
          {activeTab === 'trades' && <TradesTab />}
          {activeTab === 'payment_methods' && <PaymentMethodsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
