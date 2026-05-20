import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Plus, ChevronLeft, ShieldCheck,
  ArrowRightLeft, TrendingUp, CreditCard, AlertCircle,
  Clock, CheckCircle2, XCircle, ListOrdered
} from 'lucide-react';
import { useP2PStore } from '@/stores/useP2PStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLocation } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function P2PMarketplace() {
  usePageTitle('P2P Marketplace');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { offers, orders, fetchOrders } = useP2PStore();
  const { getCurrencyDetails } = useCurrencyStore();
  const { symbol, rate } = getCurrencyDetails();

  const isMyOffersMode = location.pathname.includes('/my-offers');

  const NRT_LIVE_PRICE = useTokenPrice();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [myTab, setMyTab] = useState<'offers' | 'orders'>('offers');
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterAmount, setFilterAmount] = useState<string>('');

  // Fetch orders when in my-offers mode
  useEffect(() => {
    if (isMyOffersMode && user) {
      fetchOrders(user.id);
    }
  }, [isMyOffersMode, user]);

  const availablePaymentMethods = useMemo(() => {
    const methods = new Set<string>();
    offers.forEach(o => {
      if (o.paymentMethods) {
        o.paymentMethods.forEach((m: string) => methods.add(m));
      }
    });
    return Array.from(methods);
  }, [offers]);

  const filteredOffers = useMemo(() => {
    let baseOffers = offers;

    if (isMyOffersMode && user) {
      baseOffers = offers.filter(o => o.userId === user.id);
    } else {
      baseOffers = offers.filter(o => o.type === (activeTab === 'buy' ? 'sell' : 'buy'));
    }

    return baseOffers.filter(o => {
      if (o.asset !== 'NRT') return false;
      
      // Search filter
      if (search && !o.userName.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
      
      // Payment Method filter
      if (filterPaymentMethod !== 'all' && (!o.paymentMethods || !o.paymentMethods.includes(filterPaymentMethod))) return false;
      
      // Amount filter
      if (filterAmount) {
        const amt = Number(filterAmount);
        if (!isNaN(amt)) {
          const max = Number(o.maxAmount) || 0;
          const min = Number(o.minAmount) || 0;
          if (amt < min || amt > max) return false;
        }
      }
      
      return true;
    });
  }, [offers, activeTab, search, filterPaymentMethod, filterAmount, isMyOffersMode, user]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let filtered = orders;
    if (orderFilter === 'active') {
      filtered = orders.filter(o => ['pending', 'accepted', 'paid'].includes(o.status));
    } else if (orderFilter === 'completed') {
      filtered = orders.filter(o => o.status === 'completed');
    } else if (orderFilter === 'cancelled') {
      filtered = orders.filter(o => ['cancelled', 'disputed'].includes(o.status));
    }
    return filtered;
  }, [orders, orderFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'accepted': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'paid': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'disputed': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-bg-secondary text-text-secondary border-glass-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': case 'accepted': case 'paid': return <Clock size={12} />;
      case 'completed': return <CheckCircle2 size={12} />;
      case 'cancelled': case 'disputed': return <XCircle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  return (
    <motion.div
      className="min-h-screen pb-24 p-4 pt-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => isMyOffersMode ? navigate('/wallet/deposit/p2p') : navigate('/')} className="p-2 bg-bg-secondary rounded-full">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{isMyOffersMode ? 'My Trading' : 'P2P Market'}</h1>
            <p className="text-xs text-text-secondary">{isMyOffersMode ? 'Manage offers & orders' : 'Trade tokens directly with others'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/wallet/deposit/p2p/disputes')}
            className="p-2 bg-bg-secondary text-amber-500 rounded-full hover:bg-amber-500/10 transition-colors relative"
          >
            <AlertCircle size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-bg-primary animate-pulse"></span>
          </button>
          <button
            onClick={() => navigate('/wallet/deposit/p2p/create')}
            className="p-2 bg-accent-primary/10 text-accent-primary rounded-full hover:bg-accent-primary/20 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* My Offers Mode: Offers/Orders toggle */}
      {isMyOffersMode && (
        <div className="flex p-1 bg-bg-secondary rounded-xl mb-6">
          <button
            onClick={() => setMyTab('offers')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${myTab === 'offers' ? 'bg-bg-card shadow-sm text-accent-primary' : 'text-text-secondary'}`}
          >
            <ArrowRightLeft size={14} /> My Offers
          </button>
          <button
            onClick={() => setMyTab('orders')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${myTab === 'orders' ? 'bg-bg-card shadow-sm text-accent-primary' : 'text-text-secondary'}`}
          >
            <ListOrdered size={14} /> My Orders
          </button>
        </div>
      )}

      {/* Tabs - Hidden in My Offers mode */}
      {!isMyOffersMode && (
        <div className="flex p-1 bg-bg-secondary rounded-xl mb-6">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'buy' ? 'bg-bg-card shadow-sm text-accent-primary' : 'text-text-secondary'}`}
          >
            Buy
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'sell' ? 'bg-bg-card shadow-sm text-red-400' : 'text-text-secondary'}`}
          >
            Sell
          </button>
        </div>
      )}

      {/* Search & Stats */}
      {(!isMyOffersMode || myTab === 'offers') && (
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user or ID..."
                className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary text-text-primary"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-xl transition-colors ${showFilters || filterPaymentMethod !== 'all' || filterAmount ? 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary' : 'bg-bg-secondary border-glass-border text-text-secondary'}`}
            >
              <Filter size={20} />
            </button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              className="p-4 bg-bg-secondary/50 border border-glass-border rounded-xl space-y-4 overflow-hidden"
            >
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Payment Method</label>
                <select 
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="w-full bg-bg-card border border-glass-border rounded-xl px-3 py-2 text-sm focus:border-accent-primary outline-none transition-colors"
                >
                  <option value="all">All Methods</option>
                  {availablePaymentMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Trade Amount (NRT)</label>
                <input 
                  type="number"
                  value={filterAmount}
                  onChange={(e) => setFilterAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full bg-bg-card border border-glass-border rounded-xl px-3 py-2 text-sm focus:border-accent-primary outline-none transition-colors"
                />
              </div>

              {(filterPaymentMethod !== 'all' || filterAmount) && (
                <button 
                  onClick={() => { setFilterPaymentMethod('all'); setFilterAmount(''); }}
                  className="w-full py-2 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          )}

          <div className="flex items-center gap-2 p-3 bg-accent-primary/5 rounded-xl border border-accent-primary/10">
            <TrendingUp size={16} className="text-accent-primary" />
            <p className="text-xs font-medium text-text-primary">
              NRT Live Price: <span className="font-bold">{symbol}{(NRT_LIVE_PRICE * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 7 })}</span>
            </p>
          </div>
        </div>
      )}

      {/* My Orders Tab Content */}
      {isMyOffersMode && myTab === 'orders' && (
        <div className="space-y-4">
          {/* Order Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['all', 'active', 'completed', 'cancelled'] as const).map(f => (
              <button
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                  orderFilter === f
                    ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                    : 'bg-bg-secondary border-glass-border text-text-secondary'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order: any, i: number) => {
              const amISelling = user && order.seller_id === user.id;
              const counterpartyName = order.p2p_offers?.users?.display_name || (amISelling ? 'Buyer' : 'Seller');
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/wallet/deposit/p2p/orders/${order.id}`)}
                  className="glass rounded-2xl border border-glass-border p-4 space-y-3 cursor-pointer hover:border-accent-primary/30 transition-colors active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${amISelling ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {amISelling ? 'S' : 'B'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary">{amISelling ? 'Sold' : 'Bought'} NRT</p>
                        <p className="text-[10px] text-text-secondary">with {counterpartyName}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-lg font-black text-accent-primary">{Number(order.nrt_amount).toLocaleString()} NRT</p>
                      <p className="text-xs text-text-secondary">${Number(order.fiat_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    </div>
                    <p className="text-[10px] text-text-secondary">
                      {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-bg-secondary/50 rounded-3xl border border-dashed border-glass-border">
              <ListOrdered size={40} className="mx-auto text-text-secondary/30 mb-3" />
              <p className="text-sm text-text-secondary">No orders found.</p>
              <p className="text-xs text-text-secondary mt-1">Start trading to see your order history here.</p>
            </div>
          )}
        </div>
      )}

      {/* Offers List (original) */}
      {(!isMyOffersMode || myTab === 'offers') && (
        <div className="space-y-4">
          {filteredOffers.length > 0 ? (
            filteredOffers.map((offer, i) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl border border-glass-border p-4 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center font-bold text-accent-primary text-xs">
                      {offer.userName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-text-primary">{offer.userName}</p>
                        {offer.isVerified && <ShieldCheck size={14} className="text-blue-400" />}
                      </div>
                      <p className="text-[10px] text-text-secondary">
                        <span className="text-accent-primary font-bold">⭐ {offer.rating || 'N/A'}</span> ({offer.reviewCount || 0}) · {offer.completionRate}% completion
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary font-medium">Price</p>
                    <p className="text-lg font-black text-text-primary">{symbol}{((Number(offer.price) || 0) * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 7 })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-glass-border/50">
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1">Available</p>
                    <p className="text-sm font-bold text-text-primary">{(Number(offer.maxAmount) || 0).toLocaleString()} {offer.asset}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1">Limits</p>
                    <p className="text-sm font-bold text-text-primary">
                      {symbol}{((Number(offer.minAmount) || 0) * (Number(offer.price) || 0) * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 6 })} - {symbol}{((Number(offer.maxAmount) || 0) * (Number(offer.price) || 0) * (rate / 0.005)).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1.5">
                    {offer.paymentMethods.map(m => (
                      <span key={m} className="px-2 py-0.5 rounded bg-bg-secondary text-[10px] font-medium text-text-secondary">
                        {m}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const isOwnOffer = user && offer.userId === user.id;
                      if (isMyOffersMode || isOwnOffer) {
                        navigate('/wallet/deposit/p2p/create', { state: { editOffer: offer } });
                      } else {
                        navigate('/wallet/deposit/p2p/flow', { state: { offer } });
                      }
                    }}
                    className={`px-6 py-2 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95 ${isMyOffersMode || (user && offer.userId === user.id)
                        ? 'bg-bg-secondary text-text-primary border border-glass-border'
                        : activeTab === 'buy'
                          ? 'bg-accent-primary text-white shadow-accent-primary/20'
                          : 'bg-red-500 text-white shadow-red-500/20'
                      }`}
                  >
                    {isMyOffersMode || (user && offer.userId === user.id) ? 'Manage' : activeTab === 'buy' ? 'Buy' : 'Sell'}
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-bg-secondary/50 rounded-3xl border border-dashed border-glass-border">
              <p className="text-sm text-text-secondary">No offers found for this asset.</p>
            </div>
          )}
        </div>
      )}

      {/* Management Quick Links - Hidden in My Offers mode */}
      {!isMyOffersMode && (
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/wallet/deposit/p2p/accounts')}
            className="flex items-center gap-3 p-4 glass border border-glass-border rounded-2xl hover:bg-glass-bg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <CreditCard size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-text-primary">Payments</p>
              <p className="text-[10px] text-text-secondary">Manage accounts</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/wallet/deposit/p2p/my-offers')}
            className="flex items-center gap-3 p-4 glass border border-glass-border rounded-2xl hover:bg-glass-bg transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
              <ArrowRightLeft size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-text-primary">My Offers</p>
              <p className="text-[10px] text-text-secondary">Manage listings</p>
            </div>
          </button>
        </div>
      )}

      {/* KYC Warning */}
      <div className="mt-6 p-4 glass border border-amber-500/20 rounded-2xl bg-amber-500/5 flex gap-3">
        <AlertCircle size={20} className="text-amber-400 shrink-0" />
        <p className="text-[11px] text-text-secondary leading-relaxed">
          <span className="font-bold text-amber-400">Verification Required:</span> All P2P participants must use their legal names as submitted in KYC documents. Payments to/from third-party accounts are strictly prohibited.
        </p>
      </div>
    </motion.div>
  );
}
