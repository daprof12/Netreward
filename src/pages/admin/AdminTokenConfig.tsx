import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Save, Snowflake, Play, TrendingUp, Layers, Activity, Zap, Loader2 } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import { createMintToInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

const DEFAULT_CONFIG = {
  tokenName: 'NetReward Token',
  tokenSymbol: 'NRT',
  totalSupply: 10000000000,
  circulatingSupply: 0,
  currentValue: 0.000042,
  status: 'active' as string,
  valueSources: [
    { source: 'Data Consumption', weight: 40, currentPrice: 0.00005 },
    { source: 'Platform Revenue', weight: 30, currentPrice: 0.00003 },
    { source: 'Supply/Demand', weight: 20, currentPrice: 0.00004 },
    { source: 'Staking Rewards', weight: 10, currentPrice: 0.00002 },
  ],
};

export default function AdminTokenConfig() {
  const { showToast } = useToastStore();
  const [tokenConfig, setTokenConfig] = useState(DEFAULT_CONFIG);
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [mintAddress, setMintAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'onchain' | 'distribution'>('overview');
  
  // Solana Wallet Integration
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [mintAmount, setMintAmount] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('kv_settings').select('key, value').in('key', ['token_config', 'token_frozen', 'nrt_mint_address']);
        let config = { ...DEFAULT_CONFIG };
        (data || []).forEach((s: any) => {
          if (s.key === 'token_config') { try { config = { ...config, ...JSON.parse(s.value) }; } catch {} }
          if (s.key === 'token_frozen') config.status = s.value === 'true' ? 'frozen' : 'active';
          if (s.key === 'nrt_mint_address') setMintAddress(s.value);
        });
        setTokenConfig(config);
        setForm(config);
      } catch (e) { /* use defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  // Dynamically calculate the NRT currentValue whenever valueSources change
  useEffect(() => {
    const calculatedValue = form.valueSources.reduce((total, source) => {
      return total + (source.currentPrice * (source.weight / 100));
    }, 0);
    
    // Only update if it actually changed to prevent infinite loops
    if (Math.abs(calculatedValue - form.currentValue) > 0.000000001) {
      setForm(prev => ({ ...prev, currentValue: calculatedValue }));
    }
  }, [form.valueSources]);

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('kv_settings').upsert([
        { key: 'token_config', value: JSON.stringify(form), category: 'token', updated_at: new Date().toISOString() },
        { key: 'nrt_mint_address', value: mintAddress, category: 'token', updated_at: new Date().toISOString() }
      ], { onConflict: 'key' });
      if (error) throw error;
      setTokenConfig(form);
      showToast('Token configuration updated.', 'success');
    } catch (e: any) { showToast(e.message || 'Save failed', 'error'); }
  };

  const handleFreezeToggle = async () => {
    const newFrozen = tokenConfig.status === 'active';
    if (newFrozen && !confirm('Are you sure you want to FREEZE the platform token transactions? Note: This only freezes database activity, not the on-chain Solana tokens.')) return;
    try {
      await supabase.from('kv_settings').upsert([
        { key: 'token_frozen', value: String(newFrozen), category: 'emergency', updated_at: new Date().toISOString() }
      ], { onConflict: 'key' });
      const newStatus = newFrozen ? 'frozen' : 'active';
      setTokenConfig(prev => ({ ...prev, status: newStatus }));
      showToast(newFrozen ? 'Platform Token frozen!' : 'Platform Token unfrozen.', 'warning');
    } catch (e: any) { showToast(e.message || 'Toggle failed', 'error'); }
  };

  const handleMintTokens = async () => {
    if (!publicKey || !signTransaction) return showToast('Connect your Solana wallet first.', 'warning');
    if (!mintAddress) return showToast('Mint address is not configured.', 'error');
    if (!mintAmount || isNaN(Number(mintAmount)) || Number(mintAmount) <= 0) return showToast('Enter a valid amount to mint.', 'error');

    setIsMinting(true);
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const amountToMint = BigInt(Number(mintAmount) * Math.pow(10, 9)); // 9 Decimals

      // Calculate the Associated Token Account (ATA) for the connected wallet
      const ata = getAssociatedTokenAddressSync(
        mintPubkey,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const transaction = new Transaction();

      // Add Priority Fee
      transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }));

      // Check if ATA exists on-chain
      const ataInfo = await connection.getAccountInfo(ata);
      if (!ataInfo) {
        // Create ATA if it doesn't exist
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            ata, // ata
            publicKey, // owner
            mintPubkey, // mint
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Add MintTo instruction
      transaction.add(
        createMintToInstruction(
          mintPubkey,
          ata,
          publicKey, // mintAuthority
          amountToMint,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      const signedTx = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
      
      showToast('Minting transaction broadcasted. Confirming...', 'success');
      
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) throw new Error('Transaction failed to confirm.');

      showToast(`Successfully minted ${mintAmount} NRT to your wallet!`, 'success');
      setMintAmount('');
      
    } catch (err: any) {
      showToast(err.message || 'Minting failed', 'error');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Token Configuration</h1>
          <p className="text-sm text-text-secondary">Manage NRT tokenomics and status</p>
        </div>
        <div className="flex items-center gap-3">
          <WalletMultiButton className="!bg-bg-secondary !border !border-glass-border !rounded-xl !h-10 !text-sm !font-bold" />
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 hover:opacity-90 transition-opacity">
            <Save size={16} /> Save Config
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex justify-between items-start mb-2">
            <div className="w-9 h-9 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-accent-primary" />
            </div>
            <span className="text-[10px] font-bold text-green-500">+2.4%</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">Calculated NRT Value</p>
          <h3 className="text-xl font-bold text-text-primary mt-0.5">${form.currentValue.toFixed(6)}</h3>
        </div>

        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex justify-between items-start mb-2">
            <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Layers size={18} className="text-blue-500" />
            </div>
            <span className="text-[10px] font-bold text-text-secondary">{( (tokenConfig.circulatingSupply / tokenConfig.totalSupply) * 100).toFixed(1)}% circulating</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">Circulating Supply</p>
          <h3 className="text-xl font-bold text-text-primary mt-0.5">{(tokenConfig.circulatingSupply / 1000000).toFixed(1)}M</h3>
        </div>

        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex justify-between items-start mb-2">
            <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <Activity size={18} className="text-purple-500" />
            </div>
            <span className="text-[10px] font-bold text-text-secondary">FDV: ${( (form.totalSupply * form.currentValue) / 1000000).toFixed(0)}M</span>
          </div>
          <p className="text-xs text-text-secondary font-medium">Market Cap</p>
          <h3 className="text-xl font-bold text-text-primary mt-0.5">${( (form.circulatingSupply * form.currentValue) / 1000000).toFixed(2)}M</h3>
        </div>

        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex justify-between items-start mb-2">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-amber-500" />
            </div>
            <span className="text-[10px] font-bold text-accent-primary">
              {[...tokenConfig.valueSources].sort((a,b) => b.weight - a.weight)[0]?.weight}% Weight
            </span>
          </div>
          <p className="text-xs text-text-secondary font-medium">Dominant Driver</p>
          <h3 className="text-xl font-bold text-text-primary mt-0.5">
            {[...tokenConfig.valueSources].sort((a,b) => b.weight - a.weight)[0]?.source.split(' ')[0]}
          </h3>
        </div>
      </div>

      <div className="bg-bg-card border border-glass-border rounded-xl flex flex-col mb-6 overflow-hidden">
        <div className="flex border-b border-glass-border">
          {['overview', 'onchain', 'distribution'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 text-sm font-bold capitalize transition-colors ${
                activeTab === tab ? 'bg-accent-primary/10 text-accent-primary border-b-2 border-accent-primary' : 'text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
        
        {activeTab === 'overview' && (
          <div className="p-5">
            <div className="bg-bg-secondary border border-glass-border rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2">Global Status: <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${tokenConfig.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{tokenConfig.status}</span></h3>
                  <p className="text-sm text-text-secondary mt-1">Freezing the token halts all deposits, withdrawals, and P2P trades.</p>
                </div>
                <button onClick={handleFreezeToggle} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${tokenConfig.status === 'active' ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'}`}>
                  {tokenConfig.status === 'active' ? <><Snowflake size={16} /> Freeze Token</> : <><Play size={16} /> Unfreeze Token</>}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-bg-primary border border-glass-border rounded-xl p-5 space-y-4">
                <h3 className="font-bold border-b border-glass-border pb-3">Basic Information</h3>
                
                {[{ label: 'Token Name', key: 'tokenName' as const }, { label: 'Token Symbol', key: 'tokenSymbol' as const }].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">{label}</label>
                    <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                  </div>
                ))}

                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Total Supply</label>
                  <input type="number" value={form.totalSupply} onChange={e => setForm({ ...form, totalSupply: Number(e.target.value) })}
                    className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent-primary" />
                </div>
              </div>

              <div className="bg-bg-primary border border-glass-border rounded-xl p-5 space-y-4">
                <h3 className="font-bold border-b border-glass-border pb-3">Value Sources & Weights</h3>
                <p className="text-xs text-text-secondary mb-4">Weights determine the algorithm used to calculate current NRT value.</p>
                
                {form.valueSources.map((source, i) => (
                  <div key={source.source} className="space-y-2 pb-4 border-b border-glass-border/30 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary">{source.source}</span>
                      <span className="text-[10px] text-text-secondary font-mono">
                        Contrib: ${((source.weight * source.currentPrice) / 100).toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[9px] uppercase text-text-secondary font-bold">Weight (%)</label>
                        <input type="number" value={source.weight} onChange={e => {
                          const newSources = [...form.valueSources];
                          newSources[i].weight = Number(e.target.value);
                          setForm({ ...form, valueSources: newSources });
                        }} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] uppercase text-text-secondary font-bold">Base Price ($)</label>
                        <input type="number" step="0.0001" value={source.currentPrice} onChange={e => {
                          const newSources = [...form.valueSources];
                          newSources[i].currentPrice = Number(e.target.value);
                          setForm({ ...form, valueSources: newSources });
                        }} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent-primary" />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-glass-border flex justify-between items-center text-sm font-bold">
                  <span className="text-text-secondary">Total Weight:</span>
                  <span className={form.valueSources.reduce((s, x) => s + x.weight, 0) === 100 ? 'text-green-500' : 'text-red-500'}>
                    {form.valueSources.reduce((s, x) => s + x.weight, 0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'onchain' && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-primary border border-glass-border rounded-xl p-5 space-y-4">
              <h3 className="font-bold border-b border-glass-border pb-3">Solana Mainnet Config</h3>
              
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">SPL Token Standard</label>
                <div className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-secondary font-mono">
                  Token-2022
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Mint Address</label>
                <input 
                  type="text"
                  value={mintAddress}
                  onChange={(e) => setMintAddress(e.target.value)}
                  placeholder="Enter Solana Mint Address..."
                  className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-primary" 
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Decimals</label>
                <div className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-2.5 text-sm text-text-primary font-mono">
                  9
                </div>
              </div>

              {/* Mint Additional Tokens Panel */}
              <div className="mt-6 pt-6 border-t border-glass-border">
                <h4 className="font-bold text-sm mb-3">Mint Additional Supply</h4>
                <p className="text-[10px] text-text-secondary mb-4">Because you still hold the MintAuthority, you can mint new NRT directly to your connected Phantom wallet.</p>
                
                {!publicKey ? (
                  <div className="bg-amber-500/10 text-amber-500 text-xs p-3 rounded-xl border border-amber-500/20">
                    Connect your Solana wallet (top right) to mint tokens.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      placeholder="Amount of NRT..."
                      className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-primary" 
                    />
                    <button 
                      onClick={handleMintTokens}
                      disabled={isMinting}
                      className="bg-accent-primary text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                    >
                      {isMinting ? <Loader2 size={16} className="animate-spin" /> : 'Mint'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-bg-primary border border-glass-border rounded-xl p-5 space-y-4">
              <h3 className="font-bold border-b border-glass-border pb-3">Extensions (Token-2022)</h3>
              
              <div className="flex items-center justify-between bg-bg-secondary p-3 rounded-xl border border-glass-border">
                <div>
                  <h4 className="font-bold text-sm">Transfer Fee Config</h4>
                  <p className="text-[10px] text-text-secondary">Auto-collected on every on-chain transfer</p>
                </div>
                <div className="bg-accent-primary/20 text-accent-primary text-xs font-bold px-2 py-1 rounded-md">
                  0.5%
                </div>
              </div>

              <div className="flex items-center justify-between bg-bg-secondary p-3 rounded-xl border border-glass-border">
                <div>
                  <h4 className="font-bold text-sm">Squads Multi-Sig</h4>
                  <p className="text-[10px] text-text-secondary">Treasury authority (3-of-5)</p>
                </div>
                <div className="bg-green-500/10 text-green-500 text-xs font-bold px-2 py-1 rounded-md">
                  Active
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-bg-secondary p-3 rounded-xl border border-glass-border">
                <div>
                  <h4 className="font-bold text-sm">Immutable Owner</h4>
                  <p className="text-[10px] text-text-secondary">Protects associated token accounts</p>
                </div>
                <div className="bg-green-500/10 text-green-500 text-xs font-bold px-2 py-1 rounded-md">
                  Enabled
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="p-5">
             <div className="bg-bg-primary border border-glass-border rounded-xl p-5 space-y-4">
               <h3 className="font-bold border-b border-glass-border pb-3 mb-4">Token Distribution (Buckets)</h3>
               <p className="text-sm text-text-secondary mb-6">Allocate the total supply ({form.totalSupply.toLocaleString()} NRT) across the primary operational buckets.</p>
               
               <div className="space-y-4">
                 {[
                   { name: 'Rewards (Data Tracking)', pct: 40, desc: 'Earned by users for consuming data' },
                   { name: 'Referral Bonuses', pct: 15, desc: 'Incentives for network growth' },
                   { name: 'Cashback', pct: 10, desc: 'Rebates for SPs & ISPs on platform spend' },
                   { name: 'Treasury / Reserve', pct: 20, desc: 'Operational buffer and liquidity' },
                   { name: 'Team & Advisors', pct: 15, desc: 'Locked with 2-year vesting' }
                 ].map(bucket => (
                   <div key={bucket.name} className="flex items-center justify-between">
                     <div className="flex-1">
                       <h4 className="font-bold text-sm text-text-primary">{bucket.name}</h4>
                       <p className="text-[10px] text-text-secondary">{bucket.desc}</p>
                     </div>
                     <div className="flex items-center gap-3 w-48">
                       <div className="h-2 flex-1 bg-bg-secondary rounded-full overflow-hidden">
                         <div className="h-full bg-accent-primary" style={{ width: `${bucket.pct}%` }} />
                       </div>
                       <span className="text-xs font-bold text-text-secondary w-8 text-right">{bucket.pct}%</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
