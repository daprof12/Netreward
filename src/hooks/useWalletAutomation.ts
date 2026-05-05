import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { generateSecureWallet } from '@/lib/solana';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '@/stores/useWalletStore';

/**
 * Hook that ensures a user has a Solana wallet assigned.
 * If not, it generates a new secure keypair, encrypts it, and saves it to the database.
 */
export function useWalletAutomation() {
  const { user } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const { fetchBalance } = useWalletStore();

  useEffect(() => {
    if (!user) return;

    const checkAndGenerateWallet = async () => {
      try {
        // 1. Check if wallet already has a public key
        const { data: wallet, error: fetchError } = await supabase
          .from('wallets')
          .select('solana_public_key, encrypted_private_key')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // 2. If it exists and has a key, we are done
        if (wallet?.solana_public_key) return;

        // 3. Generate new secure wallet
        setIsSyncing(true);
        const newWallet = await generateSecureWallet();

        // 4. Upsert the wallet record, explicitly using user_id as the conflict key
        const { error: updateError } = await supabase
          .from('wallets')
          .upsert({
            user_id: user.id,
            solana_public_key: newWallet.publicKey,
            encrypted_private_key: newWallet.encryptedPrivateKey,
            encryption_iv: newWallet.iv,
            wallet_type: 'custodial',
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (updateError) throw updateError;
        
        // 5. Invalidate cache and update store to reflect new address/balance
        queryClient.invalidateQueries({ queryKey: ['wallet', user.id] });
        await fetchBalance(user.id);
        
        console.log('Automated Wallet Generation: Success', newWallet.publicKey);
      } catch (e) {
        console.error('Automated Wallet Generation: Failed', e);
      } finally {
        setIsSyncing(false);
      }
    };

    checkAndGenerateWallet();
  }, [user]);

  return { isSyncing };
}
