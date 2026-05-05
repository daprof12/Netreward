-- Migration: Deduct Wallet Balance RPC for Edge Functions
-- Created: 2026-05-02

CREATE OR REPLACE FUNCTION deduct_wallet_balance(
    p_wallet_id UUID,
    p_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.wallets 
    SET nrt_balance = nrt_balance - p_amount, 
        updated_at = now() 
    WHERE id = p_wallet_id;
END;
$$;
