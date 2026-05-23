import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useWallet } from './useWallet';

export type TransactionType = 
  | 'reward' | 'withdrawal' | 'deposit' | 'fee' 
  | 'p2p' | 'scan2pay' | 'escrow_lock' | 'refund'
  | 'referral_bonus' | 'cashback';

export interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  tx_type: TransactionType;
  description: string;
  status?: string;
  created_at: string;
}

export function useTransactions() {
  const { user, role } = useAuthStore();
  const { wallet } = useWallet();

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions', user?.id, role],
    queryFn: async () => {
      if (!wallet?.id) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      let mapped = (data || []).map((tx: any) => ({
        ...tx,
        amount: Number(tx.amount),
        // Derive status from amount/type if no status column exists
        status: tx.status || 'completed',
      })) as Transaction[];

      mapped = mapped.filter(tx => {
        if (role === 'user') {
          if (tx.tx_type === 'scan2pay' && tx.amount > 0) return false; // SP receiving payment
          if (tx.tx_type === 'cashback') return false;
          if (tx.tx_type === 'reward' && tx.description?.toLowerCase().includes('cashback')) return false; // Hide SP/ISP cashback from user
          if (tx.tx_type === 'deposit') return false;
          if (tx.tx_type === 'fee') return false;
          return true;
        } else if (role === 'sp') {
          if (tx.tx_type === 'reward' && !tx.description?.toLowerCase().includes('sp 10% cashback')) return false;
          if (tx.tx_type === 'p2p') return false;
          if (tx.tx_type === 'referral_bonus') return false;
          if (tx.tx_type === 'scan2pay' && tx.amount < 0) return false; // User making payment
          if (tx.tx_type === 'cashback' && tx.description?.toLowerCase().includes('isp')) return false;
          return true;
        } else if (role === 'isp') {
          if (tx.tx_type === 'reward' && !tx.description?.toLowerCase().includes('isp 5% cashback')) return false;
          if (tx.tx_type === 'p2p') return false;
          if (tx.tx_type === 'referral_bonus') return false;
          if (tx.tx_type === 'scan2pay') return false;
          if (tx.tx_type === 'cashback' && !tx.description?.toLowerCase().includes('isp')) return false;
          return true;
        }
        return true;
      });

      return mapped;
    },
    enabled: !!wallet?.id,
  });

  // Calculate totals
  const totalEarned = transactions
    ? transactions
        .filter(t => ['reward', 'deposit', 'referral_bonus', 'cashback', 'refund'].includes(t.tx_type) && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const totalWithdrawn = transactions
    ? transactions
        .filter(t => t.tx_type === 'withdrawal' || t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    : 0;

  return {
    transactions: transactions || [],
    isLoading,
    error,
    totalEarned,
    totalWithdrawn
  };
}

