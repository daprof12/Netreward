import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, DollarSign, ArrowRight,
  CheckCircle2, Info
} from 'lucide-react';
import { useP2PStore } from '@/stores/useP2PStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToastStore } from '@/stores/useToastStore';
import { useTokenPrice } from '@/hooks/useTokenPrice';

export default function CreateP2POffer() {
  const navigate = useNavigate();
  const location = useLocation();
  const editOffer = location.state?.editOffer;

  const { user } = useAuthStore();
  const { addOffer, updateOffer, paymentAccounts } = useP2PStore();
  const { showToast } = useToastStore();
  const NRT_LIVE_PRICE = useTokenPrice();

  const [type, setType] = useState<'buy' | 'sell'>(editOffer?.type || 'sell');
  const [asset, setAsset] = useState<'NRT' | 'USDC'>(editOffer?.asset || 'NRT');
  const [priceType, setPriceType] = useState<'market' | 'fixed'>(editOffer?.priceType || 'market');
  const [offset, setOffset] = useState(editOffer?.offset?.toString() || '0'); // percentage
  const [fixedPrice, setFixedPrice] = useState(editOffer?.price?.toString() || NRT_LIVE_PRICE.toString());
  const [minAmount, setMinAmount] = useState(editOffer?.minAmount?.toString() || '');
  const [maxAmount, setMaxAmount] = useState(editOffer?.maxAmount?.toString() || '');
  const [selectedPayments, setSelectedPayments] = useState<string[]>(editOffer?.paymentMethods || []);

  const calculatedPrice = priceType === 'market' 
    ? NRT_LIVE_PRICE * (1 + parseFloat(offset || '0') / 100)
    : parseFloat(fixedPrice || '0');

  const handleSubmit = () => {
    if (!minAmount || !maxAmount || selectedPayments.length === 0) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    const offerData = {
      userId: user?.id || 'demo-user',
      userName: user?.email?.split('@')[0] || 'DemoUser',
      type,
      asset,
      price: calculatedPrice,
      minAmount: parseFloat(minAmount),
      maxAmount: parseFloat(maxAmount),
      paymentMethods: selectedPayments,
      status: 'active' as const,
      isVerified: true,
      completionRate: 100,
    };

    if (editOffer) {
      updateOffer(editOffer.id, offerData);
      showToast('Offer updated successfully!', 'success');
    } else {
      addOffer(offerData);
      showToast('Offer created successfully!', 'success');
    }

    navigate('/wallet/deposit/p2p');
  };

  const togglePayment = (method: string) => {
    if (selectedPayments.includes(method)) {
      setSelectedPayments(selectedPayments.filter(p => p !== method));
    } else {
      setSelectedPayments([...selectedPayments, method]);
    }
  };

  return (
    <motion.div
      className="min-h-screen pb-24 p-4 pt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{editOffer ? 'Edit Offer' : 'Create Offer'}</h1>
          <p className="text-xs text-text-secondary">{editOffer ? 'Update your trading terms' : 'Set your terms and start trading'}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Type & Asset */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">I want to</label>
            <div className="flex p-1 bg-bg-secondary rounded-xl">
              <button
                onClick={() => setType('buy')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'buy' ? 'bg-bg-card text-emerald-400 shadow-sm' : 'text-text-secondary'}`}
              >
                Buy
              </button>
              <button
                onClick={() => setType('sell')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'sell' ? 'bg-bg-card text-red-400 shadow-sm' : 'text-text-secondary'}`}
              >
                Sell
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Token</label>
            <div className="flex p-1 bg-bg-secondary rounded-xl">
              <button
                onClick={() => setAsset('NRT')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${asset === 'NRT' ? 'bg-bg-card text-accent-primary shadow-sm' : 'text-text-secondary'}`}
              >
                NRT
              </button>
              <button
                onClick={() => setAsset('USDC')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${asset === 'USDC' ? 'bg-bg-card text-blue-400 shadow-sm' : 'text-text-secondary'}`}
              >
                USDC
              </button>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="glass rounded-2xl border border-glass-border p-5 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <DollarSign size={18} className="text-accent-primary" /> Pricing
            </h3>
            <div className="flex bg-bg-secondary p-0.5 rounded-lg">
              <button 
                onClick={() => setPriceType('market')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md ${priceType === 'market' ? 'bg-bg-card text-text-primary' : 'text-text-secondary'}`}
              >
                Market
              </button>
              <button 
                onClick={() => setPriceType('fixed')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md ${priceType === 'fixed' ? 'bg-bg-card text-text-primary' : 'text-text-secondary'}`}
              >
                Fixed
              </button>
            </div>
          </div>

          {priceType === 'market' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary">Market Price</p>
                  <p className="text-lg font-bold text-text-primary">${NRT_LIVE_PRICE.toFixed(4)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">Your Price</p>
                  <p className="text-lg font-bold text-accent-primary">${calculatedPrice.toFixed(4)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-text-secondary">Price Offset</span>
                  <span className={parseFloat(offset) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {parseFloat(offset) >= 0 ? '+' : ''}{offset || '0'}%
                  </span>
                </div>
                <input 
                  type="range" min="-10" max="10" step="0.1"
                  value={offset}
                  onChange={(e) => setOffset(e.target.value)}
                  className="w-full h-1.5 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-accent-primary"
                />
                <div className="flex justify-between text-[10px] text-text-secondary px-1">
                  <span>-10%</span>
                  <span>Market</span>
                  <span>+10%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">Set Fixed Price (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-bold">$</span>
                <input 
                  type="number"
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(e.target.value)}
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-text-primary focus:outline-none focus:border-accent-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Limits */}
        <div className="glass rounded-2xl border border-glass-border p-5 space-y-4">
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <ArrowRight size={18} className="text-accent-primary" /> Order Limits
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">Min {asset}</label>
              <input 
                type="number"
                placeholder="100"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-text-secondary">Max {asset}</label>
              <input 
                type="number"
                placeholder="5000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm font-bold text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>
          <div className="p-3 bg-bg-secondary/50 rounded-xl border border-glass-border">
            <p className="text-[10px] text-text-secondary text-center">
              Value: <span className="text-text-primary font-bold">${(parseFloat(minAmount || '0') * calculatedPrice).toFixed(2)}</span> to <span className="text-text-primary font-bold">${(parseFloat(maxAmount || '0') * calculatedPrice).toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="glass rounded-2xl border border-glass-border p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-text-primary">Payment Methods</h3>
            <button onClick={() => navigate('/wallet/deposit/p2p/accounts')} className="text-xs text-accent-primary font-bold">+ Add New</button>
          </div>
          
          {paymentAccounts.length > 0 ? (
            <div className="space-y-2">
              {paymentAccounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => togglePayment(acc.provider)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selectedPayments.includes(acc.provider) 
                      ? 'bg-accent-primary/10 border-accent-primary text-accent-primary' 
                      : 'bg-bg-secondary border-glass-border text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center">
                      <DollarSign size={14} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-text-primary">{acc.provider}</p>
                      <p className="text-[10px] text-text-secondary">{acc.accountNumber}</p>
                    </div>
                  </div>
                  {selectedPayments.includes(acc.provider) && <CheckCircle2 size={16} />}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-text-secondary">No payment accounts found.</p>
              <button onClick={() => navigate('/wallet/deposit/p2p/accounts')} className="px-4 py-2 bg-bg-secondary rounded-lg text-xs font-bold border border-glass-border text-text-primary">
                Setup Payments
              </button>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-3">
          <Info size={20} className="text-blue-400 shrink-0" />
          <p className="text-[11px] text-text-secondary leading-relaxed">
            By creating this offer, you agree to our P2P trading rules. Your NRT will be placed in escrow upon a trade match.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2"
        >
          {editOffer ? 'Save Changes' : 'Post Offer'}
        </button>
      </div>
    </motion.div>
  );
}
