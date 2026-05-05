import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Check, AlertTriangle, Share2 } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWallet } from '@/hooks/useWallet';
import { useWalletAutomation } from '@/hooks/useWalletAutomation';



export default function NrtWalletAddress() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { wallet, isLoading: isFetching } = useWallet();
  const { isSyncing } = useWalletAutomation();
  const [copied, setCopied] = useState(false);

  const address = wallet?.solana_public_key || 'Generating address...';
  const isLoading = isFetching || isSyncing;

  // QR via free API (no package needed)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(address)}&size=200x200&bgcolor=ffffff&color=000000&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h1 className="text-xl font-bold">My NRT Wallet</h1>
          <p className="text-xs text-text-secondary">Receive NRT to this address</p>
        </div>
      </div>

      {/* QR Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[20px] border border-glass-border p-6 flex flex-col items-center gap-5"
      >
        {/* QR code */}
        <div className="w-48 h-48 rounded-2xl overflow-hidden bg-white p-2 shadow-lg">
          <img
            src={qrUrl}
            alt="NRT Wallet QR Code"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Address */}
        <div className="w-full">
          <p className="text-xs text-text-secondary font-medium text-center mb-2">Wallet Address</p>
          <div className="bg-bg-secondary rounded-xl p-3 flex items-center gap-2 border border-glass-border">
            <p className="font-mono text-xs text-text-primary flex-1 break-all leading-relaxed">
              {wallet?.solana_public_key ? `NRT-${wallet.solana_public_key}` : address}
            </p>
            <button 
              onClick={handleCopy}
              disabled={!wallet?.solana_public_key}
              className="text-text-secondary hover:text-accent-primary transition-all duration-300 disabled:opacity-30"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"
                  >
                    <Check size={10} strokeWidth={3} /> Copied
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Copy size={16} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Share button */}
        <button className="w-full py-3 glass rounded-xl border border-glass-border text-text-primary font-semibold flex items-center justify-center gap-2 hover:bg-glass-bg/50 transition-colors">
          <Share2 size={16} />
          Share Address
        </button>
      </motion.div>

      {/* Warning */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-4">
        <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-400">Important</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Only send <span className="font-semibold text-text-primary">NRT tokens</span> to this address. Sending any other token may result in permanent loss of funds.
          </p>
        </div>
      </div>

      {/* Network info */}
      <div className="glass rounded-xl border border-glass-border p-4 space-y-2 text-sm">
        <h3 className="font-semibold text-text-primary">Network Details</h3>
        <div className="flex justify-between">
          <span className="text-text-secondary">Network</span>
          <span className="font-bold text-text-primary">Solana (SPL)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Token</span>
          <span className="font-bold text-text-primary">NRT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Min. deposit</span>
          <span className="font-bold text-text-primary">1 NRT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Confirmations</span>
          <span className="font-bold text-text-primary">32 blocks</span>
        </div>
      </div>
    </motion.div>
  );
}
