import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';

interface Scan2PayPayload {
  merchantName: string;
  amount: number;
  currency: string;
  transactionId: string;
}

export default function Scan2PayConfirmation() {
  const [payload, setPayload] = useState<Scan2PayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const { profile } = useAuthStore();
  const { currency: userCurrency } = useSettingsStore();

  useEffect(() => {
    // Fetch pending transaction from storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('pendingScan2Pay', (result: { [key: string]: any }) => {
        if (result.pendingScan2Pay) {
          setPayload(result.pendingScan2Pay);
        }
        setLoading(false);
      });
    } else {
      // Mock for local testing
      setPayload({ merchantName: 'Test SP Partner', amount: 10, currency: 'NRT', transactionId: 'txn_12345' });
      setLoading(false);
    }
  }, []);

  const handleConfirm = async () => {
    setProcessing(true);
    // Simulate API call to process payment
    setTimeout(() => {
      setProcessing(false);
      setStatus('success');
      // Clear pending transaction
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove('pendingScan2Pay');
      }
    }, 1500);
  };

  const handleReject = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove('pendingScan2Pay');
    }
    window.close();
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Loader2 className="glow-pulse" size={32} color="var(--accent-primary)" /></div>;
  }

  if (status === 'success') {
    return (
      <div className="page fade-in" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%' }}>
        <CheckCircle2 size={64} color="#10b981" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Payment Successful!</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>You paid {payload?.amount} NRT to {payload?.merchantName}.</p>
        <button className="btn-secondary" onClick={() => window.close()}>Close Window</button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="page fade-in" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%' }}>
        <AlertTriangle size={64} color="#f59e0b" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>No Transaction Found</h2>
        <button className="btn-secondary" onClick={() => window.close()} style={{ marginTop: 24 }}>Close Window</button>
      </div>
    );
  }

  const hasEnoughBalance = (profile?.nrt_balance || 0) >= payload.amount;

  return (
    <div className="page fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--glass-border)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>Confirm Payment</h2>
        <button onClick={handleReject} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '2px solid var(--glass-border)' }}>
          <img src="/nrt-logo.svg" style={{ width: 32, height: 32 }} alt="Logo" />
        </div>
        
        <h3 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
          {payload.amount.toFixed(2)} NRT
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>To:</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{payload.merchantName}</span>
        </div>

        <div className="glass" style={{ width: '100%', padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Network Fee</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>0.00 NRT</span>
          </div>
          <div style={{ height: 1, background: 'var(--glass-border)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-primary)' }}>{payload.amount.toFixed(2)} NRT</span>
          </div>
        </div>
        
        {!hasEnoughBalance && (
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, width: '100%' }}>
            <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, textAlign: 'center' }}>Insufficient NRT balance</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
        <button className="btn-secondary" onClick={handleReject} style={{ flex: 1, padding: 14 }} disabled={processing}>
          Reject
        </button>
        <button className="btn-primary" onClick={handleConfirm} disabled={processing || !hasEnoughBalance} style={{ flex: 1, padding: 14 }}>
          {processing ? <Loader2 size={16} className="glow-pulse" style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm'}
        </button>
      </div>
    </div>
  );
}
