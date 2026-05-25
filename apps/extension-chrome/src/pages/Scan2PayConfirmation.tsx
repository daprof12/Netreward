import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useSecurityStore } from '../stores/useSecurityStore';
import { supabase } from '../lib/supabase';

interface Scan2PaySession {
  id: string;
  merchantId: string;
  merchantName: string;
  amountNrt: number;
  description: string;
  status: string;
}

export default function Scan2PayConfirmation() {
  const [sessionData, setSessionData] = useState<Scan2PaySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  
  // PIN state
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  
  const { profile } = useAuthStore();
  const { currency: userCurrency } = useSettingsStore();
  const { pin: expectedPin } = useSecurityStore();

  useEffect(() => {
    const init = async () => {
      let sessionId = null;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get('pendingScan2Pay') as { pendingScan2Pay?: any };
        sessionId = result.pendingScan2Pay?.sessionId;
      } else {
        // Fallback for local dev testing
        const urlParams = new URLSearchParams(window.location.search);
        sessionId = urlParams.get('session');
      }

      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('scan2pay_sessions')
          .select('id, merchant_id, amount_nrt, description, status, expires_at')
          .eq('id', sessionId)
          .single();

        if (error || !data) throw new Error('Session not found');
        if (data.status !== 'pending') throw new Error(`Session is ${data.status}`);

        const { data: merchantData } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', data.merchant_id)
          .single();

        setSessionData({
          id: data.id,
          merchantId: data.merchant_id,
          merchantName: merchantData?.display_name || 'Merchant',
          amountNrt: data.amount_nrt || 0,
          description: data.description,
          status: data.status,
        });

        if (profile?.id) {
          const { data: walletData } = await supabase
            .from('wallets')
            .select('nrt_balance')
            .eq('user_id', profile.id)
            .single();
          if (walletData) setUserBalance(walletData.nrt_balance || 0);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleConfirmInitiate = () => {
    if (expectedPin) {
      setShowPinInput(true);
    } else {
      executePayment();
    }
  };

  const executePayment = async () => {
    if (!sessionData || !profile) return;
    setProcessing(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.rpc('process_scan2pay', {
        p_session_id: sessionData.id,
        p_payer_id: profile.id,
      });

      if (error) throw error;
      if (data?.status === 'error') throw new Error(data.message);

      setStatus('success');
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove('pendingScan2Pay');
      }
      
      // Auto close window after 3s
      setTimeout(() => {
        window.close();
      }, 3000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Transaction failed. Please try again.');
      setStatus('idle');
      setShowPinInput(false);
      setPinEntry('');
    } finally {
      setProcessing(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinEntry === expectedPin) {
      executePayment();
    } else {
      setErrorMsg('Incorrect PIN');
      setPinEntry('');
    }
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
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>You paid {sessionData?.amountNrt} NRT to {sessionData?.merchantName}.</p>
        <button className="btn-secondary" onClick={() => window.close()}>Close Window</button>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="page fade-in" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%' }}>
        <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>{errorMsg || 'No Transaction Found'}</h2>
        <button className="btn-secondary" onClick={() => window.close()} style={{ marginTop: 24 }}>Close Window</button>
      </div>
    );
  }

  const hasEnoughBalance = userBalance >= sessionData.amountNrt;

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
          <img src="/icons/icon-48.png" style={{ width: 32, height: 32 }} alt="Logo" />
        </div>
        
        <h3 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
          {sessionData.amountNrt.toFixed(10)} NRT
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>To:</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{sessionData.merchantName}</span>
        </div>

        <div className="glass" style={{ width: '100%', padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Network Fee</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>0.00 NRT</span>
          </div>
          <div style={{ height: 1, background: 'var(--glass-border)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent-primary)' }}>{sessionData.amountNrt.toFixed(10)} NRT</span>
          </div>
        </div>
        
        {!hasEnoughBalance && (
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, width: '100%' }}>
            <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, textAlign: 'center' }}>Insufficient NRT balance (You have {userBalance.toFixed(10)})</p>
          </div>
        )}

        {errorMsg && !showPinInput && (
          <div style={{ marginTop: 16, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#ef4444' }}>{errorMsg}</p>
          </div>
        )}
      </div>

      {showPinInput ? (
        <form onSubmit={handlePinSubmit} style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {errorMsg && (
            <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{errorMsg}</p>
          )}
          <input
            type="password"
            maxLength={6}
            placeholder="Enter PIN to confirm"
            value={pinEntry}
            onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, ''))}
            style={{ 
              width: '100%', 
              padding: 14, 
              borderRadius: 12, 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              textAlign: 'center',
              fontSize: 16,
              letterSpacing: 4
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn-secondary" onClick={() => { setShowPinInput(false); setErrorMsg(''); }} style={{ flex: 1, padding: 14 }} disabled={processing}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={processing || pinEntry.length < 4} style={{ flex: 1, padding: 14 }}>
              {processing ? <Loader2 size={16} className="glow-pulse" style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify PIN'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
          <button className="btn-secondary" onClick={handleReject} style={{ flex: 1, padding: 14 }} disabled={processing}>
            Reject
          </button>
          <button className="btn-primary" onClick={handleConfirmInitiate} disabled={processing || !hasEnoughBalance} style={{ flex: 1, padding: 14 }}>
            {processing ? <Loader2 size={16} className="glow-pulse" style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  );
}
