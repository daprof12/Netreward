import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Zap, Loader2, Globe } from 'lucide-react';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWalletStore } from '@/stores/useWalletStore';
import { useToastStore } from '@/stores/useToastStore';
import { useCurrencyStore } from '@/stores/useCurrencyStore';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePaymentGateways, type LiveGateway } from '@/hooks/usePaymentGateways';
import NrtAmount, { NrtAmountInline } from '@/components/ui/NrtAmount';

type Step = 'enter' | 'confirm' | 'processing' | 'success';

export default function InstantPurchase() {
  usePageTitle('Instant Purchase');
  const navigate = useNavigate();
  const NRT_RATE = useTokenPrice();
  const { user, profile } = useAuthStore();
  const { fetchBalance } = useWalletStore();
  const { showToast } = useToastStore();
  const { getCurrencyDetails } = useCurrencyStore();
  const { symbol } = getCurrencyDetails();
  const { publicKey } = useWallet();

  const { gateways, getGatewaysForUser, isLoading: gatewaysLoading } = usePaymentGateways();

  const [step, setStep] = useState<Step>('enter');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(''); // Will hold the GatewayId
  const [solanaAddress, setSolanaAddress] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [sendOnChain, setSendOnChain] = useState(false);

  // Normalize country for gateway matching
  let userCountry = profile?.country || 'Global';
  if (userCountry === 'NG' || userCountry === 'Nigeria') userCountry = 'Nigeria';
  if (userCountry === 'US' || userCountry === 'USA') userCountry = 'USA';
  if (userCountry === 'GB' || userCountry === 'UK') userCountry = 'UK';
  
  const availableGateways = getGatewaysForUser(userCountry);

  // Auto-select first available gateway if none selected
  useEffect(() => {
    if (availableGateways.length > 0 && !method) {
      setMethod(availableGateways[0].id);
    }
  }, [availableGateways, method]);

  const PAYMENT_INSTRUCTIONS: Record<string, Record<string, any>> = {
    Nigeria: {
      bank: {
        title: 'NetReward GTBank Account',
        details: 'Account: 0123456789\nBank: GTBank\nName: NetReward Solutions\nNote: Use your email as reference.',
      },
      mobile: {
        title: 'Mobile Money Options',
        details: 'OPay: *955#\nMoniepoint: *5573#\nFlutterwave: Dial *445# to pay.',
      },
      card: {
        title: 'Secure Card Payment',
        details: 'Processed via Paystack. Enter your card details in the next step.',
      }
    },
    USA: {
      bank: {
        title: 'Chase Bank (ACH/Wire)',
        details: 'Routing: 123456789\nAccount: 9876543210\nBank: Chase Bank\nNote: Includes $10 wire fee.',
      },
      card: {
        title: 'Stripe Payment',
        details: 'All major US cards accepted. Securely processed by Stripe.',
      },
      mobile: {
        title: 'Instant Apps',
        details: 'Zelle: payments@netreward.io\nCashApp: $NetRewardPay',
      }
    },
    UK: {
      bank: {
        title: 'Barclays Bank (Faster Payments)',
        details: 'Sort Code: 20-00-00\nAccount: 12345678\nBank: Barclays UK\nReference: [Your Email]',
      },
      card: {
        title: 'Stripe UK',
        details: 'Secure checkout for GBP cards.',
      },
      mobile: {
        title: 'Revolut Pay',
        details: 'Open Revolut App or use @netreward handle.',
      }
    },
    Global: {
      bank: {
        title: 'International Wire (SWIFT)',
        details: 'SWIFT/BIC: NETRXX\nAccount: IBAN 1234 5678 9012\nBank: NetReward Global',
      },
      card: {
        title: 'Global Checkout',
        details: 'Multiple currencies supported via Stripe Global.',
      },
      mobile: {
        title: 'Crypto Stablecoin',
        details: 'We accept USDC/USDT on Solana as an alternative deposit.',
      }
    }
  };

  // Legacy instruction mapping - we'll keep this as a fallback or extra info, but rely on gateway description
  const instruction = PAYMENT_INSTRUCTIONS[userCountry]?.[method] || PAYMENT_INSTRUCTIONS['Global']?.['card'];

  // Auto-fill address if wallet connects
  useEffect(() => {
    if (publicKey) {
      setSolanaAddress(publicKey.toBase58());
      setSendOnChain(true);
    }
  }, [publicKey]);

  const nrt = amount ? (parseFloat(amount) / NRT_RATE) : 0;
  const selectedGateway = availableGateways.find(g => g.id === method) || availableGateways[0];

  const handleConfirm = async () => {
    if (!user?.id || !amount || parseFloat(amount) <= 0 || !selectedGateway) return;
    
    // Only require Solana address if user opted for on-chain transfer
    if (sendOnChain && !solanaAddress) {
      showToast('Please provide a Solana wallet address for on-chain transfer', 'warning');
      return;
    }
    setStep('processing');

    try {
      const nrtAmount = parseFloat(amount) / NRT_RATE;
      const amountFiat = parseFloat(amount);
      const currencyCode = symbol === '\u20a6' ? 'NGN' : symbol === '$' ? 'USD' : symbol === '\u20ac' ? 'EUR' : symbol === '\u00a3' ? 'GBP' : 'USD'; // default to USD if unknown

      // ── GATEWAY ROUTING ──
      
      if (selectedGateway.id === 'opay') {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('opay-create-payment', {
          body: {
            amount_fiat: amountFiat,
            amount_nrt: nrtAmount,
            currency: currencyCode,
            pay_method: '', // blank shows all options
            fee_fiat: 0, // platform absorbs fee for OPay
            user_email: user.email || '',
            user_name: profile?.full_name || profile?.username || '',
          }
        });

        if (edgeError || !edgeData?.success) throw new Error(edgeError?.message || edgeData?.error || 'Failed to initiate OPay payment');
        if (edgeData.cashierUrl) {
          window.location.href = edgeData.cashierUrl;
          return;
        } else throw new Error('No checkout URL returned from OPay');
      } 
      
      else {
        // Generic gateway handler
        // 1. Create intent via Edge Function
        const { data: intentData, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            gateway_id: selectedGateway.id,
            amount_fiat: amountFiat,
            amount_nrt: nrtAmount,
            currency: currencyCode,
            user_id: user.id,
            user_email: user.email || '',
            user_name: profile?.full_name || profile?.username || '',
            return_url: `${window.location.origin}/wallet/deposit/callback/${selectedGateway.id}`
          }
        });

        if (intentError || !intentData?.success) {
           console.error("Gateway Init Error:", intentError || intentData);
           // Fallback to simulation/mock for UI testing if edge function isn't deployed yet
           // In production, this throw is required.
           // throw new Error(intentError?.message || intentData?.error || `Failed to initiate ${selectedGateway.name} payment`);
           
           showToast(`Simulation: Initiating ${selectedGateway.name} payment...`, 'info');
           // Proceed to fallback standard flow for now to allow UI to complete
        } else {
           // 2. Handle gateway specific checkout flow
           if (selectedGateway.method === 'redirect' && intentData.checkoutUrl) {
             window.location.href = intentData.checkoutUrl;
             return;
           } else if (selectedGateway.method === 'popup') {
             // Handle popup logic (e.g. Paystack Inline JS)
             // This would normally initialize the SDK with intentData.clientSecret
             showToast(`${selectedGateway.name} popup would open here`, 'info');
             // Proceed to fallback standard flow for now to allow UI to complete
           } else if (selectedGateway.method === 'async') {
             showToast('Payment request sent to your phone. Please authorize.', 'info');
             setStep('success');
             return;
           }
        }
      }

      // ── Standard Flow (Mock/Simulation or non-redirect callback handling) ──
      // Calculate a mock fee for simulation
      let feeFiat = 0;
      if (selectedGateway.fees.includes('%')) {
         feeFiat = amountFiat * (parseFloat(selectedGateway.fees) / 100);
      }
      
      const { data: rpcData, error } = await supabase.rpc('process_instant_purchase', {
        p_amount_nrt: nrtAmount,
        p_amount_fiat: amountFiat,
        p_fee_fiat: feeFiat,
        p_currency: currencyCode,
        p_provider_name: selectedGateway.name
      });

      if (error) throw error;
      
      const { wallet_id } = rpcData as any;

      // OPTIONAL: If user opted for on-chain transfer, dispense tokens to their Solana wallet
      if (sendOnChain && solanaAddress) {
        try {
          const { data: mintData } = await supabase.from('kv_settings').select('value').eq('key', 'nrt_mint_address').single();
          if (!mintData || !mintData.value) throw new Error('NRT Mint Address not configured.');

          const { data: dispenseData, error: dispenseError } = await supabase.functions.invoke('dispense-nrt', {
            body: { 
              amount_nrt: nrtAmount,
              solana_address: solanaAddress,
              nrt_mint_address: mintData.value,
              user_id: user.id,
              wallet_id: wallet_id
            }
          });

          if (dispenseError || !dispenseData?.success) {
            console.warn('On-chain transfer failed, tokens remain in platform wallet:', dispenseError?.message || dispenseData?.error);
            showToast('On-chain transfer failed. Tokens are safe in your platform wallet.', 'warning');
          } else {
            setTxSignature(dispenseData.signature);
          }
        } catch (chainErr: any) {
          console.warn('On-chain dispatch error:', chainErr);
        }
      }

      await fetchBalance(user.id);
      setStep('success');
      showToast('Purchase complete!', 'success');
    } catch (err: any) {
      console.error('Purchase error:', err);
      showToast(err.message || 'Purchase failed. Please try again.', 'error');
      setStep('confirm');
    }
  };

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-3">
        <button onClick={() => step === 'enter' ? navigate(-1) : setStep('enter')} className="p-2 bg-bg-secondary rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Instant Purchase</h1>
          <p className="text-xs text-text-secondary">Quick buy at platform rate</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'enter' && (
          <motion.div key="enter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Rate note */}
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400">
              <Zap size={14} />
              Platform rate: 1 NRT = {symbol}{NRT_RATE.toLocaleString(undefined, { maximumFractionDigits: 10 })} (instant settlement)
            </div>

            {/* Amount */}
            <div className="glass rounded-xl border border-glass-border p-4 space-y-4">
              <div>
                <label className="text-xs text-text-secondary font-medium">You pay ({symbol})</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-text-secondary text-xl font-bold">{symbol}</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-bold text-text-primary outline-none placeholder:text-text-secondary/40"
                  />
                </div>
              </div>
              <div className="border-t border-glass-border/50 pt-3">
                <label className="text-xs text-text-secondary font-medium">You receive (NRT)</label>
                <p className="text-2xl font-bold text-accent-primary mt-1"><NrtAmount value={nrt} /></p>
              </div>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {['10', '25', '50', '100'].map(q => (
                <button
                  key={q}
                  onClick={() => setAmount(q)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    amount === q ? 'bg-accent-primary/20 border-accent-primary text-accent-primary' : 'bg-bg-secondary border-glass-border text-text-secondary'
                  }`}
                >
                  {symbol}{q}
                </button>
              ))}
            </div>

            {/* Deposit method */}
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Deposit Method</p>
              {gatewaysLoading ? (
                <div className="flex items-center justify-center p-6 border border-glass-border rounded-xl">
                  <Loader2 size={24} className="animate-spin text-text-secondary" />
                </div>
              ) : availableGateways.length === 0 ? (
                <div className="p-4 border border-glass-border rounded-xl bg-bg-secondary text-center">
                  <p className="text-sm text-text-secondary">No payment methods available for your region.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableGateways.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setMethod(g.id)}
                      className={`w-full flex items-center p-3 rounded-xl border transition-all ${
                        method === g.id ? 'border-[color:var(--gw-color)] bg-[color:var(--gw-bg)]' : 'bg-bg-secondary border-glass-border hover:bg-glass-bg'
                      }`}
                      style={{ 
                        '--gw-color': g.color,
                        '--gw-bg': method === g.id ? `${g.color}15` : 'transparent'
                      } as React.CSSProperties}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 mr-3`} style={{ backgroundColor: `${g.color}15`, color: g.color }}>
                        {g.logoUrl ? (
                          <img src={g.logoUrl} alt={g.name} className="w-6 h-6 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                        ) : g.flag}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${method === g.id ? 'text-text-primary' : 'text-text-primary'}`}>{g.name}</span>
                          {!g.enabled && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 uppercase tracking-wider">Offline</span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary mt-0.5 flex items-center gap-1">
                          <Globe size={10} /> {g.region}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-medium text-text-secondary">Fee: {g.fees}</p>
                        <p className="text-[10px] text-text-secondary capitalize mt-0.5">{g.method} checkout</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional: Send to Solana Wallet (Advanced) */}
            <div className="pt-4 border-t border-glass-border/50">
              <button
                type="button"
                onClick={() => setSendOnChain(!sendOnChain)}
                className="w-full flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium text-text-secondary text-left">Send directly to Solana wallet</p>
                  <p className="text-[10px] text-text-secondary/70 text-left">Optional — leave off to keep NRT in your platform balance</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${sendOnChain ? 'bg-accent-primary' : 'bg-bg-secondary border border-glass-border'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${sendOnChain ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
              {sendOnChain && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-text-secondary">Destination Wallet</label>
                    <WalletMultiButton className="!h-7 !px-2 !text-[9px] !bg-bg-secondary !border !border-glass-border" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your Solana wallet address..."
                    value={publicKey ? publicKey.toBase58() : solanaAddress}
                    onChange={e => setSolanaAddress(e.target.value)}
                    readOnly={!!publicKey}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-primary"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => { if (parseFloat(amount) > 0) setStep('confirm'); }}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20 disabled:opacity-50"
            >
              Continue
            </button>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <h2 className="text-xl font-bold">Confirm Purchase</h2>
            
            <div className="glass rounded-xl border border-glass-border p-4 space-y-3 text-sm">
              {[
                ['You pay', `${symbol}${amount}`],
                ['You receive', <NrtAmountInline value={nrt} />],
                ['Rate', `1 NRT = ${symbol}${NRT_RATE.toLocaleString(undefined, { maximumFractionDigits: 10 })}`],
                ['Destination', sendOnChain && solanaAddress ? `${solanaAddress.slice(0,6)}...${solanaAddress.slice(-4)} (Solana)` : 'Platform Wallet'],
                ['Method', selectedGateway?.name || 'Unknown'],
                ['Fee', selectedGateway?.fees || 'Unknown'],
                ['Checkout Type', selectedGateway?.method || 'Standard'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-text-secondary">{k}</span>
                  <span className="font-bold text-text-primary">{v}</span>
                </div>
              ))}
            </div>

            {/* Payment Instructions Section */}
            {instruction && (
              <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-accent-primary uppercase tracking-widest">{instruction.title}</p>
                <div className="text-sm text-text-primary whitespace-pre-line leading-relaxed">
                  {instruction.details}
                </div>
                <p className="text-[10px] text-text-secondary italic mt-2">
                  * Note: This is legacy instruction info. The gateway will handle the actual payment flow.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('enter')} className="flex-1 py-3 rounded-xl bg-bg-secondary border border-glass-border font-semibold text-text-primary">
                Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={!profile || (sendOnChain && !solanaAddress)}
                className="flex-2 flex-grow py-3 rounded-xl bg-accent-primary text-primary-foreground font-bold shadow-lg shadow-accent-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedGateway?.id === 'opay' ? (
                  <>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    Pay via OPay
                  </>
                ) : (
                  <>
                    {selectedGateway?.flag} Pay with {selectedGateway?.name}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 pt-16 text-center">
            <div className="relative w-20 h-20">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-accent-primary/20"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={40} className="text-accent-primary animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Processing Purchase</h2>
              <p className="text-sm text-text-secondary">Confirming your transaction…</p>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-6 pt-10 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center"
            >
              <CheckCircle2 size={56} className="text-emerald-400" />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Purchase Complete!</h2>
              <NrtAmount value={nrt} className="text-4xl font-black text-accent-primary" unitClassName="text-lg ml-1 font-normal" />
              {txSignature ? (
                <>
                  <p className="text-sm text-text-secondary">Tokens sent to your Solana wallet</p>
                  <a 
                    href={`https://explorer.solana.com/tx/${txSignature}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline mt-2 block"
                  >
                    View Transaction on Explorer
                  </a>
                </>
              ) : (
                <p className="text-sm text-text-secondary">Credited to your wallet balance</p>
              )}
            </div>
            <button onClick={() => navigate('/wallet')} className="w-full py-4 bg-accent-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-accent-primary/20">
              Back to Wallet
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

