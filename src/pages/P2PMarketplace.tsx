import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Plus, ChevronLeft, ShieldCheck, 
  ArrowRightLeft, TrendingUp, CreditCard, AlertCircle
} from 'lucide-react';
import { useP2PStore } from '@/stores/useP2PStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLocation } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

// Removed hardcoded NRT_LIVE_PRICE

export default function P2PMarketplace() {
  usePageTitle('P2P Marketplace');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { offers } = useP2PStore();
  const { getCurrencyDetails } = useCurrencyStore();
  const { symbol, rate } = getCurrencyDetails();

  const isMyOffersMode = location.pathname.includes('/my-offers');

  const NRT_LIVE_PRICE = useTokenPrice();
  
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState<'NRT' | 'USDC'>('NRT');

  const filteredOffers = useMemo(() => {
    let baseOffers = offers;
    
    if (isMyOffersMode && user) {
      baseOffers = offers.filter(o => o.userId === user.id);
    } else {
      baseOffers = offers.filter(o => o.type === (activeTab === 'buy' ? 'sell' : 'buy'));
    }

    return baseOffers.filter(o => 
      o.asset === assetFilter &&
      (o.userName.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()))
    );
  }, [offers, activeTab, assetFilter, search, isMyOffersMode, user]);

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
            <h1 className="text-2xl font-bold">{isMyOffersMode ? 'My Offers' : 'P2P Market'}</h1>
            <p className="text-xs text-text-secondary">{isMyOffersMode ? 'Manage your active listings' : 'Trade tokens directly with others'}</p>
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
          <button className="p-2.5 bg-bg-secondary border border-glass-border rounded-xl text-text-secondary">
            <Filter size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 p-3 bg-accent-primary/5 rounded-xl border border-accent-primary/10">
          <TrendingUp size={16} className="text-accent-primary" />
          <p className="text-xs font-medium text-text-primary">
            NRT Live Price: <span className="font-bold">{symbol}{(NRT_LIVE_PRICE * rate).toLocaleString(undefined, { maximumFractionDigits: 10 })}</span>
          </p>
        </div>
      </div>

      {/* Asset Toggle */}
      <div className="flex gap-2 mb-6">
        {['NRT', 'USDC'].map((a) => (
          <button
            key={a}
            onClick={() => setAssetFilter(a as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
              assetFilter === a 
                ? 'bg-accent-primary text-white border-accent-primary' 
                : 'bg-transparent border-glass-border text-text-secondary'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Offers List */}
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
                  <p className="text-lg font-black text-text-primary">{symbol}{(offer.price * rate).toLocaleString(undefined, { maximumFractionDigits: 10 })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-y border-glass-border/50">
                <div>
                  <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1">Available</p>
                  <p className="text-sm font-bold text-text-primary">{offer.maxAmount.toLocaleString()} {offer.asset}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1">Limits</p>
                  <p className="text-sm font-bold text-text-primary">
                    {symbol}{(offer.minAmount * offer.price * rate).toFixed(0)} - {symbol}{(offer.maxAmount * offer.price * rate).toFixed(0)}
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
                  className={`px-6 py-2 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95 ${
                    isMyOffersMode || (user && offer.userId === user.id)
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
