import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

export interface PlatformBank {
  id: string;
  name: string;
  country: string;
  status: string;
}

export interface UserPaymentMethod {
  id: string;
  bank_id: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  platform_banks?: PlatformBank;
}

export function useWithdrawals() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // 1. Fetch available banks (filtered by country if needed)
  const { data: platformBanks, isLoading: isBanksLoading } = useQuery({
    queryKey: ['platform_banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_banks')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as PlatformBank[];
    }
  });

  // 2. Fetch user's saved payment methods
  const { data: paymentMethods, isLoading: isMethodsLoading } = useQuery({
    queryKey: ['payment_methods', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_payment_methods')
        .select(`
          *,
          platform_banks (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UserPaymentMethod[];
    },
    enabled: !!user,
  });

  // 3. Add a new payment method with gateway validation
  const addPaymentMethodMutation = useMutation({
    mutationFn: async (params: { bank_id: string; account_number: string; account_name: string }) => {
      if (!user) throw new Error('Not authenticated');

      // First, validate account via gateway (Paystack/Stripe)
      const { data: validation, error: validationErr } = await supabase.functions.invoke('validate-bank-account', {
        body: {
          bank_id: params.bank_id,
          account_number: params.account_number
        }
      });

      if (validationErr || !validation?.success) {
        throw new Error(validation?.error || 'Account validation failed');
      }

      // If valid, insert into DB
      const { data, error } = await supabase
        .from('user_payment_methods')
        .insert({
          user_id: user.id,
          bank_id: params.bank_id,
          account_number: params.account_number,
          account_name: validation.account_name // Use the name returned by the bank
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment_methods', user?.id] });
    }
  });

  // 4. Request withdrawal
  const requestWithdrawalMutation = useMutation({
    mutationFn: async (params: { amountNrt: number; paymentMethodId: string; fiatAmount: number; currency: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('request_fiat_withdrawal', {
        p_amount_nrt: params.amountNrt,
        p_payment_method_id: params.paymentMethodId,
        p_fiat_amount: params.fiatAmount,
        p_currency: params.currency
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate everything related to balance and history
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
    }
  });

  return {
    platformBanks,
    isBanksLoading,
    paymentMethods,
    isMethodsLoading,
    addPaymentMethod: addPaymentMethodMutation.mutateAsync,
    isAddingMethod: addPaymentMethodMutation.isPending,
    requestWithdrawal: requestWithdrawalMutation.mutateAsync,
    isRequestingWithdrawal: requestWithdrawalMutation.isPending
  };
}
