import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, Database, Settings, Activity, Lock, Rocket, CheckCircle, ArrowRight, ArrowLeft, Terminal, Upload, Image } from 'lucide-react';
import { useToastStore } from '@/stores/useToastStore';
import { supabase } from '@/lib/supabase';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { deployNRT } from '@/lib/solana-deploy';
import type { TokenLaunchConfig } from '@/lib/solana-types';
import { Transaction, PublicKey } from '@solana/web3.js';
import { generateNRTMetadata } from '@/lib/metadata-generator';
import { usePageTitle } from '@/hooks/usePageTitle';

const STEPS = [
  { id: 1, title: 'Network Config', icon: Network, desc: 'RPC and environment' },
  { id: 2, title: 'Metadata', icon: Database, desc: 'Name, symbol, URI' },
  { id: 3, title: 'Extensions', icon: Settings, desc: 'Token-2022 features' },
  { id: 4, title: 'Treasury', icon: Activity, desc: 'Supply & allocation' },
  { id: 5, title: 'Authority', icon: Lock, desc: 'Multi-sig setup' },
  { id: 6, title: 'Deploy', icon: Rocket, desc: 'Broadcast to network' },
];

export default function AdminTokenLaunch() {
  usePageTitle('Admin — Token Launch');
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentLog, setDeploymentLog] = useState<string[]>([]);
  const [deployedMint, setDeployedMint] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [publishingMeta, setPublishingMeta] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToastStore();
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  // Load saved logo URL and metadata URI on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('kv_settings').select('key, value').in('key', ['nrt_logo_url', 'nrt_metadata_uri']);
        (data || []).forEach((s: any) => {
          if (s.key === 'nrt_logo_url' && s.value) setLogoUrl(s.value);
          if (s.key === 'nrt_metadata_uri' && s.value) setConfig(prev => ({ ...prev, uri: s.value }));
        });
      } catch { /* ignore */ }
    })();
  }, []);

  const [config, setConfig] = useState<TokenLaunchConfig>({
    name: 'NetReward Token',
    symbol: 'NRT',
    uri: 'https://arweave.net/metadata.json',
    decimals: 9,
    initialSupply: 1000000000,
    transferFeeBasisPoints: 50,
    maxTransferFee: 5000000000,
    interestRate: 0,
    treasuryBuckets: [
      { name: 'Rewards Pool', address: '', percentage: 40 },
      { name: 'Treasury', address: '', percentage: 20 },
      { name: 'Team', address: '', percentage: 15 },
      { name: 'Liquidity & Public', address: '', percentage: 25 }
    ],
    multiSigAddress: ''
  });

  const handleLogoUpload = async (file: File) => {
    if (!file || file.size > 2 * 1024 * 1024) {
      showToast('Logo must be under 2MB', 'warning');
      return;
    }
    setLogoFile(file);
    setUploading(true);
    try {
      // 1. Upload logo image
      const ext = file.name.split('.').pop();
      const logoPath = `nrt-logo.${ext}`;
      await supabase.storage.from('assets').upload(logoPath, file, { upsert: true });
      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(logoPath);
      const uploadedLogoUrl = urlData.publicUrl;
      setLogoUrl(uploadedLogoUrl);

      // 2. Auto-generate and upload the metadata JSON so Phantom can read name/symbol/logo
      const metadata = {
        name: config.name,
        symbol: config.symbol,
        description: 'NetReward Token (NRT) is the foundational asset of the NetReward ecosystem. It incentivizes high-quality network connectivity and powers decentralized rewards for SPs, ISPs, and users worldwide.',
        image: uploadedLogoUrl,
        attributes: [
          { trait_type: 'Standard', value: 'Token-2022' },
          { trait_type: 'Utility', value: 'Connectivity Rewards' },
        ],
        properties: {
          files: [{ uri: uploadedLogoUrl, type: `image/${ext}` }],
          category: 'image',
          links: { website: 'https://netreward.online' },
        },
      };
      const metaBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const metaFile = new File([metaBlob], 'nrt-metadata.json', { type: 'application/json' });
      await supabase.storage.from('assets').upload('nrt-metadata.json', metaFile, { upsert: true, contentType: 'application/json' });
      const { data: metaUrlData } = supabase.storage.from('assets').getPublicUrl('nrt-metadata.json');
      const metadataUri = metaUrlData.publicUrl;

      // 3. Save both URLs and auto-set the config URI
      await supabase.from('kv_settings').upsert({ key: 'nrt_logo_url', value: uploadedLogoUrl }, { onConflict: 'key' });
      await supabase.from('kv_settings').upsert({ key: 'nrt_metadata_uri', value: metadataUri }, { onConflict: 'key' });
      setConfig(prev => ({ ...prev, uri: metadataUri }));

      showToast('Logo uploaded and metadata JSON auto-generated!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Upload failed', 'error');
    } finally { setUploading(false); }
  };

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const [isVerifyingSquads, setIsVerifyingSquads] = useState(false);

  // Generates the metadata JSON from current config + logoUrl and uploads it to Supabase Storage.
  // This can be run at any time independently of the logo upload.
  const handlePublishMetadata = async () => {
    if (!logoUrl) {
      showToast('Upload a logo first so it can be embedded in the metadata.', 'warning');
      return;
    }
    setPublishingMeta(true);
    try {
      const ext = logoUrl.split('.').pop()?.split('?')[0] || 'png';
      const metadata = {
        name: config.name,
        symbol: config.symbol,
        description: 'NetReward Token (NRT) is the foundational asset of the NetReward ecosystem. It incentivizes high-quality network connectivity and powers decentralized rewards for SPs, ISPs, and users worldwide.',
        image: logoUrl,
        attributes: [
          { trait_type: 'Standard', value: 'Token-2022' },
          { trait_type: 'Utility', value: 'Connectivity Rewards' },
        ],
        properties: {
          files: [{ uri: logoUrl, type: `image/${ext}` }],
          category: 'image',
          links: { website: 'https://netreward.online' },
        },
      };
      const metaBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const metaFile = new File([metaBlob], 'nrt-metadata.json', { type: 'application/json' });
      const { error } = await supabase.storage.from('assets').upload('nrt-metadata.json', metaFile, { upsert: true, contentType: 'application/json' });
      if (error) throw error;
      const { data: metaUrlData } = supabase.storage.from('assets').getPublicUrl('nrt-metadata.json');
      const metadataUri = metaUrlData.publicUrl;
      await supabase.from('kv_settings').upsert({ key: 'nrt_metadata_uri', value: metadataUri }, { onConflict: 'key' });
      setConfig(prev => ({ ...prev, uri: metadataUri }));
      showToast('Metadata JSON published to Supabase! URI auto-filled below.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Publish failed', 'error');
    } finally { setPublishingMeta(false); }
  };

  const handleDownloadMetadata = () => {
    const metadata = {
      name: config.name,
      symbol: config.symbol,
      description: 'NetReward Token (NRT) is the foundational asset of the NetReward ecosystem.',
      image: logoUrl || 'https://your-logo-url-here.png',
      properties: { files: [{ uri: logoUrl, type: 'image/png' }], category: 'image' },
    };
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nrt-metadata.json';
    a.click();
    showToast('Metadata JSON downloaded.', 'success');
  };;

  const verifySquadsAddress = async (address: string) => {
    if (!address) return;
    setIsVerifyingSquads(true);
    try {
      let pubkey: PublicKey;
      try {
        pubkey = new PublicKey(address);
      } catch (err) {
        throw new Error('Invalid Solana address format.');
      }

      try {
        const accountInfo = await connection.getAccountInfo(pubkey);
        
        if (!accountInfo) {
          showToast('Address is valid, but not yet initialized on-chain. This is normal for new Squad Vaults.', 'warning');
          return;
        }
        showToast('Vault address verified successfully.', 'success');
      } catch (rpcError: any) {
        // Handle public RPC 403 Forbidden or rate limit errors gracefully
        if (rpcError.message?.includes('403') || rpcError.message?.includes('forbidden')) {
          showToast('Address is valid. (Network verification bypassed due to public RPC limits)', 'warning');
        } else {
          throw rpcError;
        }
      }
      
    } catch (e: any) {
      showToast(e.message || 'Verification failed.', 'error');
    } finally {
      setIsVerifyingSquads(false);
    }
  };

  const handleDeploy = async () => {
    if (!publicKey || !signTransaction) {
      showToast('Please connect your wallet first.', 'warning');
      return;
    }

    setIsDeploying(true);
    setDeploymentLog(['Starting deployment process...']);
    
    try {
      const result = await deployNRT(
        connection,
        publicKey,
        signTransaction as (tx: Transaction) => Promise<Transaction>,
        config,
        (msg) => setDeploymentLog(prev => [...prev, msg])
      );

      // Save to system settings
      await supabase.from('kv_settings').upsert({ 
        key: 'nrt_mint_address', 
        value: result.mint,
        category: 'token'
      }, { onConflict: 'key' });

      setDeployedMint(result.mint);
      showToast('NRT Token deployed successfully!', 'success');
      setCurrentStep(7);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Deployment failed', 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div>
        <h1 className="text-2xl font-black text-gradient">NRT Token Launch Wizard</h1>
        <p className="text-sm text-text-secondary">Deploy the NetReward Token on Solana using SPL Token-2022.</p>
      </div>

      {currentStep <= 6 && (
        <div className="flex justify-between items-start overflow-x-auto pb-4 scrollbar-hide">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10 w-24 shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/30 scale-110' :
                  isCompleted ? 'bg-green-500/20 text-green-500' : 'bg-bg-secondary text-text-secondary border border-glass-border'
                }`}>
                  {isCompleted ? <CheckCircle size={18} /> : <Icon size={18} />}
                </div>
                <div className="text-center">
                  <p className={`text-xs font-bold ${isActive ? 'text-accent-primary' : isCompleted ? 'text-text-primary' : 'text-text-secondary'}`}>{step.title}</p>
                  <p className="text-[10px] text-text-secondary hidden md:block">{step.desc}</p>
                </div>
                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div className={`absolute top-5 left-[50%] w-full h-[2px] -z-10 ${isCompleted ? 'bg-green-500/50' : 'bg-glass-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="glass border border-glass-border rounded-2xl p-6 min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            {currentStep === 1 && (
              <div className="space-y-6 max-w-xl mx-auto">
                <h3 className="text-xl font-bold">Network Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Target Environment</label>
                    <select className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary">
                      <option value="mainnet">Solana Mainnet-Beta</option>
                      <option value="devnet">Solana Devnet</option>
                      <option value="testnet">Solana Testnet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">RPC URL</label>
                    <input type="text" defaultValue="https://api.mainnet-beta.solana.com" className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary font-mono" />
                  </div>
                  {!publicKey && (
                    <div className="pt-4 text-center space-y-3">
                      <p className="text-xs text-text-secondary">A Solana wallet is required to deploy the token and manage authority.</p>
                      <div className="flex justify-center">
                        <WalletMultiButton className="!bg-accent-primary !rounded-xl !h-12 !font-bold" />
                      </div>
                    </div>
                  )}
                  {publicKey && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-xs text-green-500 font-bold">Wallet Connected: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 max-w-xl mx-auto">
                <h3 className="text-xl font-bold">Token Metadata</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Token Name</label>
                    <input type="text" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Symbol</label>
                    <input type="text" value={config.symbol} onChange={e => setConfig({...config, symbol: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Metadata URI</label>
                    <input type="text" value={config.uri} onChange={e => setConfig({...config, uri: e.target.value})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent-primary" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Decimals</label>
                    <input type="number" value={config.decimals} onChange={e => setConfig({...config, decimals: Number(e.target.value)})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-text-secondary mb-2 block uppercase tracking-wider">Token Logo</label>
                    <input ref={logoRef} type="file" accept="image/png,image/svg+xml,image/webp" className="hidden" onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <div className="w-16 h-16 rounded-xl border-2 border-accent-primary overflow-hidden bg-bg-secondary">
                          <img src={logoUrl} alt="NRT Logo" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-glass-border flex items-center justify-center bg-bg-secondary text-text-secondary">
                          <Image size={24} />
                        </div>
                      )}
                      <div className="flex-1">
                        <button
                          onClick={() => logoRef.current?.click()}
                          disabled={uploading}
                          className="px-4 py-2 bg-accent-primary/10 text-accent-primary font-bold text-sm rounded-xl border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors disabled:opacity-50"
                        >
                          {uploading ? 'Uploading…' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                        </button>
                        <button
                          onClick={handlePublishMetadata}
                          disabled={publishingMeta || !logoUrl}
                          className="px-4 py-2 bg-green-500/10 text-green-400 font-bold text-sm rounded-xl border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50 ml-2 mt-2 inline-flex items-center gap-2"
                        >
                          {publishingMeta ? 'Publishing…' : <><Upload size={13} /> Publish Metadata JSON</>}
                        </button>
                        <p className="text-[10px] text-text-secondary mt-1">PNG, SVG, or WebP · Max 2MB · Metadata JSON auto-hosted on Supabase</p>
                        {logoUrl && <p className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[250px]">Logo: {logoUrl}</p>}
                        {config.uri && !config.uri.includes('arweave') && (
                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-[10px] text-green-400 font-bold truncate max-w-[220px]">✓ URI: {config.uri}</p>
                            <a href={config.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 underline shrink-0">Preview ↗</a>
                          </div>
                        )}
                        {(!config.uri || config.uri.includes('arweave')) && (
                          <p className="text-[10px] text-amber-400 mt-1">⚠ No metadata hosted yet. Click "Publish Metadata JSON" above.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 max-w-xl mx-auto">
                <h3 className="text-xl font-bold">SPL Token-2022 Extensions</h3>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 bg-bg-secondary border border-glass-border rounded-xl cursor-pointer">
                    <input type="checkbox" checked={config.transferFeeBasisPoints > 0} onChange={e => setConfig({...config, transferFeeBasisPoints: e.target.checked ? 50 : 0})} className="mt-1" />
                    <div>
                      <h4 className="font-bold text-sm">Transfer Fees</h4>
                      <p className="text-xs text-text-secondary mt-0.5">Automatically withhold a percentage of every transfer.</p>
                      <input type="number" value={config.transferFeeBasisPoints / 100} onChange={e => setConfig({...config, transferFeeBasisPoints: Math.round(Number(e.target.value) * 100)})} className="mt-2 w-24 bg-bg-primary border border-glass-border rounded-lg px-3 py-1.5 text-sm" /> <span className="text-xs font-bold text-text-secondary">%</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 bg-bg-secondary border border-glass-border rounded-xl cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1" />
                    <div>
                      <h4 className="font-bold text-sm">Immutable Owner</h4>
                      <p className="text-xs text-text-secondary mt-0.5">Prevent the owner of token accounts from being changed.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 bg-bg-secondary border border-glass-border rounded-xl cursor-pointer">
                    <input type="checkbox" checked={config.interestRate > 0} onChange={e => setConfig({...config, interestRate: e.target.checked ? 1 : 0})} className="mt-1" />
                    <div>
                      <h4 className="font-bold text-sm">Interest-Bearing</h4>
                      <p className="text-xs text-text-secondary mt-0.5">Tokens accumulate interest over time natively on-chain.</p>
                      <input type="number" value={config.interestRate} onChange={e => setConfig({...config, interestRate: Number(e.target.value)})} className="mt-2 w-24 bg-bg-primary border border-glass-border rounded-lg px-3 py-1.5 text-sm" /> <span className="text-xs font-bold text-text-secondary">% APY</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 max-w-xl mx-auto">
                <h3 className="text-xl font-bold">Supply & Treasury Split</h3>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Initial Supply</label>
                  <input type="number" value={config.initialSupply} onChange={e => setConfig({...config, initialSupply: Number(e.target.value)})} className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-accent-primary" />
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-sm border-b border-glass-border pb-2">Treasury Buckets (Target Wallets)</h4>
                  {(() => {
                    const totalPct = config.treasuryBuckets.reduce((s, b) => s + b.percentage, 0);
                    const emptyCount = config.treasuryBuckets.filter(b => !b.address).length;
                    return (
                      <>
                        {totalPct !== 100 && (
                          <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-2">
                            ⚠ Percentages total {totalPct}% — must equal 100% for full supply distribution.
                          </div>
                        )}
                        {emptyCount > 0 && (
                          <div className="text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mb-2">
                            ℹ {emptyCount} bucket(s) without an address will be skipped during minting.
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {config.treasuryBuckets.map((b, i) => (
                    <div key={b.name} className="flex gap-4 items-center">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-text-secondary block">{b.name} ({b.percentage}%)</label>
                        <input type="text" placeholder="Solana Address" value={b.address} onChange={e => {
                          const newBuckets = [...config.treasuryBuckets];
                          newBuckets[i].address = e.target.value;
                          setConfig({...config, treasuryBuckets: newBuckets});
                        }} className={`w-full bg-bg-secondary border rounded-lg px-3 py-2 text-xs font-mono ${
                          b.address ? 'border-glass-border' : 'border-amber-500/40'
                        }`} />
                      </div>
                      <div className="w-32 text-right">
                        <span className="text-xs font-bold">{Math.floor(config.initialSupply * (b.percentage / 100)).toLocaleString()}</span>
                        <span className="text-[10px] text-text-secondary block">Tokens</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6 max-w-xl mx-auto">
                <h3 className="text-xl font-bold">Authority Transfer (Multi-Sig)</h3>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Lock className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-amber-500 text-sm">Critical Security Step</h4>
                    <p className="text-xs text-amber-500/80 mt-1">Mint authority will be transferred to a Squads Multi-Sig. The deployer wallet will lose the ability to unilaterally mint new tokens.</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Squads Program ID</label>
                  <input type="text" defaultValue="SQDS4ep65T869z5i1oS4xcAWDPs14PhT6rT2z2Qz5" disabled className="w-full bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm font-mono opacity-70" />
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-blue-400 uppercase">Squads Setup Guide</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    1. Visit <a href="https://squads.so" target="_blank" className="text-blue-400 underline">squads.so</a> and connect your wallet.<br/>
                    2. Create a new "Squad" with at least 3 owners and a 2/3 threshold.<br/>
                    3. Copy the <b>Vault Address</b> and paste it below.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary mb-1 block uppercase tracking-wider">Multi-Sig Vault Address</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={config.multiSigAddress} 
                      onChange={e => setConfig({...config, multiSigAddress: e.target.value})} 
                      placeholder="Enter Squads Multi-Sig Address" 
                      className="flex-1 bg-bg-secondary border border-glass-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent-primary" 
                    />
                    <button 
                      onClick={() => verifySquadsAddress(config.multiSigAddress || '')}
                      disabled={isVerifyingSquads}
                      className="px-4 bg-bg-secondary border border-glass-border rounded-xl text-xs font-bold hover:bg-glass-bg transition-colors disabled:opacity-50"
                    >
                      {isVerifyingSquads ? '...' : 'Verify'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6 max-w-xl mx-auto">
                <h3 className="text-xl font-bold">Deploy to Mainnet</h3>
                <div className="bg-bg-secondary rounded-xl p-4 border border-glass-border space-y-3">
                  <div className="flex justify-between text-sm border-b border-glass-border pb-2">
                    <span className="text-text-secondary">Token Name:</span>
                    <span className="font-bold">NetReward Token (NRT)</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-glass-border pb-2">
                    <span className="text-text-secondary">Standard:</span>
                    <span className="font-mono">Token-2022</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-glass-border pb-2">
                    <span className="text-text-secondary">Supply:</span>
                    <span className="font-bold">1,000,000,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Authority:</span>
                    <span className="font-mono text-xs text-amber-500">Squads Multi-Sig</span>
                  </div>
                </div>

                {!publicKey && (
                  <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-xl p-6 text-center space-y-4">
                    <h4 className="font-bold text-accent-primary">Wallet Connection Required</h4>
                    <p className="text-sm text-text-secondary">You must connect your Solana wallet (e.g., Phantom) to sign and pay for the Token deployment transaction.</p>
                    <div className="flex justify-center">
                      <WalletMultiButton className="!bg-accent-primary !rounded-xl !h-12 !font-bold" />
                    </div>
                  </div>
                )}

                <div className="bg-[#0f172a] rounded-xl p-4 min-h-[150px] font-mono text-xs border border-glass-border/30 overflow-y-auto">
                  <div className="flex items-center gap-2 text-text-secondary mb-2">
                    <Terminal size={14} /> <span>Deployment Console</span>
                  </div>
                  {deploymentLog.map((log, i) => (
                    <div key={i} className="text-green-400 mb-1">{`> ${log}`}</div>
                  ))}
                  {isDeploying && <div className="text-accent-primary animate-pulse">{`> Processing...`}</div>}
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 max-w-md mx-auto">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-black">Launch Successful!</h2>
                <p className="text-sm text-text-secondary">NetReward Token is now live on Solana. Mint authority has been secured.</p>
                
                <div className="w-full bg-bg-secondary p-4 rounded-xl border border-glass-border text-left mt-4 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-text-secondary block uppercase tracking-wider">Mint Address</label>
                  <code className="text-xs text-accent-primary break-all">{deployedMint}</code>
                  <a 
                    href={`https://explorer.solana.com/address/${deployedMint}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline mt-2 inline-block"
                  >
                    View on Solana Explorer
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto pt-6 flex justify-between items-center border-t border-glass-border">
          {currentStep < 7 ? (
            <>
              <button
                onClick={handlePrev}
                disabled={currentStep === 1 || isDeploying}
                className="flex items-center gap-2 px-4 py-2 bg-bg-secondary text-text-primary font-bold rounded-xl disabled:opacity-50 transition-all hover:bg-glass-bg"
              >
                <ArrowLeft size={16} /> Back
              </button>
              
              {currentStep < 6 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-accent-primary text-white font-bold rounded-xl shadow-lg shadow-accent-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Rocket size={16} /> {isDeploying ? 'Deploying...' : 'Deploy Token'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setCurrentStep(1)}
              className="mx-auto px-6 py-2 bg-bg-secondary text-text-primary font-bold rounded-xl hover:bg-glass-bg transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
