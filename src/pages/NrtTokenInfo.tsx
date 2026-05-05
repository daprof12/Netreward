import { motion } from 'framer-motion';
import { ChevronLeft, ExternalLink, Activity, Layers, Droplets, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NrtTokenInfo() {
  const navigate = useNavigate();

  // Mock data representing Solana on-chain state
  const tokenStats = {
    price: 0.005,
    change24h: 2.4,
    marketCap: 725000,
    fdv: 5000000,
    circulatingSupply: 145000000,
    totalSupply: 1000000000,
    holders: 12450,
  };

  return (
    <motion.div
      className="space-y-6 pb-24 p-4 pt-8"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-bg-secondary rounded-full">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">NetReward Token</h1>
          <p className="text-xs text-text-secondary">NRT • Solana SPL</p>
        </div>
      </div>

      <div className="glass p-6 rounded-3xl border border-glass-border flex flex-col items-center justify-center text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center mb-2">
          <Zap size={32} className="text-accent-primary" />
        </div>
        <h2 className="text-3xl font-black">${tokenStats.price.toFixed(4)}</h2>
        <div className="flex items-center gap-2 text-sm font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
          <Activity size={14} /> +{tokenStats.change24h}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <p className="text-xs text-text-secondary mb-1">Market Cap</p>
          <p className="text-lg font-bold">${(tokenStats.marketCap / 1000).toFixed(1)}K</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <p className="text-xs text-text-secondary mb-1">FDV</p>
          <p className="text-lg font-bold">${(tokenStats.fdv / 1000000).toFixed(1)}M</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex items-center gap-1 mb-1">
            <Layers size={12} className="text-text-secondary" />
            <p className="text-xs text-text-secondary">Circulating</p>
          </div>
          <p className="text-sm font-bold">{(tokenStats.circulatingSupply / 1000000).toFixed(1)}M NRT</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-glass-border">
          <div className="flex items-center gap-1 mb-1">
            <Droplets size={12} className="text-text-secondary" />
            <p className="text-xs text-text-secondary">Total Supply</p>
          </div>
          <p className="text-sm font-bold">{(tokenStats.totalSupply / 1000000000).toFixed(1)}B NRT</p>
        </div>
      </div>

      <div className="glass p-5 rounded-2xl border border-glass-border space-y-4">
        <h3 className="font-bold">On-Chain Info</h3>
        
        <div className="flex justify-between items-center text-sm border-b border-glass-border pb-3">
          <span className="text-text-secondary">Network</span>
          <span className="font-bold">Solana Mainnet</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-glass-border pb-3">
          <span className="text-text-secondary">Standard</span>
          <span className="font-mono bg-bg-secondary px-2 py-0.5 rounded text-xs">Token-2022</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-glass-border pb-3">
          <span className="text-text-secondary">Holders</span>
          <span className="font-bold">{tokenStats.holders.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-sm border-b border-glass-border pb-3">
          <span className="text-text-secondary">Transfer Fee</span>
          <span className="font-bold text-accent-primary">0.5%</span>
        </div>
        
        <div className="pt-2">
          <p className="text-xs text-text-secondary mb-2 block">Contract Address</p>
          <div className="flex items-center justify-between bg-bg-secondary p-3 rounded-xl border border-glass-border">
            <span className="font-mono text-xs text-text-primary truncate mr-4">NRTx8p9b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S</span>
            <a href="#" className="text-accent-primary shrink-0 hover:opacity-80">
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
