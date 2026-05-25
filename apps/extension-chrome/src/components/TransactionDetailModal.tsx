import { X, TrendingUp, ArrowDownToLine, TrendingDown, Gift, QrCode, Repeat, Coins, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';

const TYPE_OPTIONS = [
  { value: 'reward', label: 'Rewards', icon: TrendingUp, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { value: 'deposit', label: 'Deposits', icon: ArrowDownToLine, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { value: 'withdrawal', label: 'Withdrawals', icon: TrendingDown, color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  { value: 'referral_bonus', label: 'Referrals', icon: Gift, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { value: 'scan2pay', label: 'Scan2Pay', icon: QrCode, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { value: 'p2p', label: 'P2P', icon: Repeat, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  { value: 'cashback', label: 'Cashback', icon: Coins, color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  { value: 'escrow_lock', label: 'Escrow', icon: Lock, color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  { value: 'refund', label: 'Refund', icon: RefreshCw, color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  { value: 'fee', label: 'Fees', icon: AlertCircle, color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
];

export function getTxMeta(type: string) {
  return TYPE_OPTIONS.find(o => o.value === type) ?? TYPE_OPTIONS[0];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

interface Props {
  receipt: any;
  onClose: () => void;
}

export default function TransactionDetailModal({ receipt, onClose }: Props) {
  const { currency } = useSettingsStore();

  const conversionRates: Record<string, number> = { USD: 1.0, EUR: 0.92, GBP: 0.79, NGN: 1500.0 };
  const rate = conversionRates[currency] || 1.0;
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₦';

  if (!receipt) return null;

  const m = getTxMeta(receipt.tx_type);
  const Icon = m.icon;
  const isPositive = receipt.amount > 0;
  
  const statusColors: Record<string, string> = {
    completed: '#10b981', pending: '#f59e0b', failed: '#ef4444',
    rejected: 'var(--text-secondary)', cancelled: 'var(--text-secondary)'
  };
  const stColor = statusColors[receipt.status || 'completed'] || 'var(--text-secondary)';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      overflowY: 'auto'
    }} onClick={onClose}>
      <div 
        className="glass fade-in" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340, borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          maxHeight: '100%', overflowY: 'auto'
        }}
      >
        <div style={{ alignItems: 'center', padding: '20px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon size={24} color={m.color} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 2 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: isPositive ? '#10b981' : 'var(--text-primary)' }}>
              {isPositive ? '+' : ''}{Number(receipt.amount).toFixed(2)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>NRT</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>
            ≈ {currencySymbol}{Math.abs(receipt.amount * 0.1 * rate).toFixed(2)} {currency}
          </p>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 12 }}>
            {receipt.description}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '3px 8px', borderRadius: 6, background: m.bg, color: m.color, fontSize: 10, fontWeight: 900, letterSpacing: 0.5 }}>
              {m.label}
            </div>
            <div style={{ padding: '3px 8px', borderRadius: 6, background: `${stColor}18`, color: stColor, fontSize: 10, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {receipt.status || 'completed'}
            </div>
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-elevated)' }}>
          {[
            { label: 'Transaction ID', value: receipt.id.slice(0, 8) + '...' },
            { label: 'Type', value: m.label },
            { label: 'Date & Time', value: formatDate(receipt.created_at) },
            { label: 'Status', value: (receipt.status || 'completed').charAt(0).toUpperCase() + (receipt.status || 'completed').slice(1) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          style={{
            padding: 12, borderTop: '1px solid var(--glass-border)',
            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
            borderBottomLeftRadius: 20, borderBottomRightRadius: 20
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
