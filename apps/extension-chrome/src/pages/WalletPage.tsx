import { useState, useMemo, useEffect, useCallback } from 'react';
import { Wallet, Search, ArrowDownLeft, ArrowUpRight, Filter, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTrackingStore } from '../stores/useTrackingStore';
import { supabase } from '../lib/supabase';
import TransactionDetailModal, { getTxMeta } from '../components/TransactionDetailModal';

export default function WalletPage() {
  const { profile } = useAuthStore();
  const { currency } = useSettingsStore();
  const { nrtBalance, fetchDashboardData } = useTrackingStore();
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const fetchTransactions = useCallback(async (pageIndex: number) => {
    if (!profile?.id) return;
    
    try {
      // First get wallet id
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', profile.id)
        .single();
        
      if (!walletData?.id) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false })
        .range(pageIndex * LIMIT, (pageIndex + 1) * LIMIT - 1);

      if (data) {
        if (data.length < LIMIT) setHasMore(false);
        setTransactions(prev => pageIndex === 0 ? data : [...prev, ...data]);
      }
    } catch (e) {
      console.error('Error fetching txs:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchTransactions(0);
    if (profile?.id) {
      fetchDashboardData(profile.id);
    }
  }, [fetchTransactions, profile?.id, fetchDashboardData]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 20;
    if (bottom && hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTransactions(nextPage);
    }
  };

  // Get distinct transaction types
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    transactions.forEach(tx => types.add(tx.tx_type));
    return Array.from(types);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || tx.tx_type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, filterType]);

  // Basic mock conversion rate for display purposes only
  const conversionRates: Record<string, number> = { USD: 1.0, EUR: 0.92, GBP: 0.79, NGN: 1500.0 };
  const rate = conversionRates[currency] || 1.0;
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₦';

  return (
    <div className="page fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="stat-card" style={{ padding: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="stat-icon" style={{ width: 40, height: 40, background: 'rgba(5, 150, 105, 0.15)', color: 'var(--accent-primary)' }}>
            <Wallet size={20} />
          </div>
          <div>
            <span className="stat-label">Total Balance</span>
            <div className="stat-value" style={{ fontSize: 24, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              {nrtBalance.toFixed(10)} <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>NRT</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              ≈ {currencySymbol}{(nrtBalance * 0.1 * rate).toFixed(10)} {currency}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div style={{ marginTop: 16, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>
          Transaction History
        </h3>
        
        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, paddingRight: 10, paddingBottom: 8, paddingTop: 8 }}
            />
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
              style={{ paddingLeft: 28, paddingRight: 10, paddingBottom: 8, paddingTop: 8, appearance: 'none' }}
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {getTxMeta(type).label}
                </option>
              ))}
            </select>
            <Filter size={12} color="var(--text-tertiary)" style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* List */}
        <div 
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4, paddingBottom: 16 }}
        >
          {loading ? (
             <div style={{ textAlign: 'center', padding: '20px 0' }}>
               <Loader2 size={24} className="glow-pulse" color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
             </div>
          ) : filteredTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 12 }}>
              No transactions found.
            </div>
          ) : (
            <>
              {filteredTransactions.map(tx => {
                const m = getTxMeta(tx.tx_type);
                const isPositive = tx.amount > 0;
                return (
                  <div 
                    key={tx.id} 
                    onClick={() => setSelectedTx(tx)}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                      padding: '10px 12px', background: 'var(--bg-card)', 
                      border: '1px solid var(--glass-border)', borderRadius: 10,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: 8, 
                        background: m.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <m.icon size={16} color={m.color} />
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{m.label}</p>
                        <p style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                          {new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: isPositive ? '#10b981' : 'var(--text-primary)' }}>
                        {isPositive ? '+' : ''}{Number(tx.amount).toFixed(10)} NRT
                      </p>
                    </div>
                  </div>
                );
              })}
              {loadingMore && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <Loader2 size={16} color="var(--text-tertiary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <TransactionDetailModal receipt={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
}
