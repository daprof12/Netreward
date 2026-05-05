-- Migration: Withdrawal Fees & Crypto Integration
-- Created: 2026-05-02

-- 1. Alter withdrawal_requests table
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS withdrawal_type TEXT DEFAULT 'fiat' CHECK (withdrawal_type IN ('fiat', 'crypto'));
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS crypto_address TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS fee_fiat NUMERIC DEFAULT 0;

-- 2. Update request_fiat_withdrawal to log platform revenue (1.5% fee)
CREATE OR REPLACE FUNCTION request_fiat_withdrawal(
    p_amount_nrt NUMERIC,
    p_payment_method_id UUID,
    p_fiat_amount NUMERIC,
    p_currency TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_wallet_id UUID;
    v_current_balance NUMERIC;
    v_withdrawal_id UUID;
    v_gateway_id UUID;
    v_gateway_balance NUMERIC;
    v_treasury_id UUID;
    v_provider_name TEXT;
    v_fee_fiat NUMERIC;
    v_net_fiat NUMERIC;
BEGIN
    -- Get caller ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify payment method belongs to user
    IF NOT EXISTS (SELECT 1 FROM public.user_payment_methods WHERE id = p_payment_method_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    -- Get wallet and lock it for update
    SELECT id, nrt_balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    -- Check user balance
    IF v_current_balance < p_amount_nrt THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Calculate 1.5% Withdrawal Fee
    v_fee_fiat := p_fiat_amount * 0.015;
    v_net_fiat := p_fiat_amount - v_fee_fiat;

    -- ==========================================
    -- AUTOMATED ROUTING LOGIC
    -- ==========================================
    
    -- 1. Find an active gateway for the requested currency
    SELECT id, fiat_balance, provider_name INTO v_gateway_id, v_gateway_balance, v_provider_name
    FROM public.gateway_liquidity
    WHERE currency = p_currency AND status = 'active'
    LIMIT 1
    FOR UPDATE;

    -- 2. Check if liquidity exists
    IF v_gateway_id IS NOT NULL AND v_gateway_balance >= v_net_fiat THEN
        -- SUCCESS PATH: Straight-through processing
        
        -- Deduct from user wallet
        UPDATE public.wallets SET nrt_balance = nrt_balance - p_amount_nrt, updated_at = now() WHERE id = v_wallet_id;
        
        -- Add NRT to Admin Treasury
        SELECT id INTO v_treasury_id FROM public.admin_treasury LIMIT 1 FOR UPDATE;
        UPDATE public.admin_treasury SET nrt_balance = nrt_balance + p_amount_nrt, updated_at = now() WHERE id = v_treasury_id;
        
        -- Deduct net fiat from gateway liquidity pool
        UPDATE public.gateway_liquidity SET fiat_balance = fiat_balance - v_net_fiat, updated_at = now() WHERE id = v_gateway_id;
        
        -- Create withdrawal request marked as processed
        INSERT INTO public.withdrawal_requests (user_id, amount_nrt, amount_fiat, fee_fiat, currency, payment_method_id, withdrawal_type, status, processed_at)
        VALUES (v_user_id, p_amount_nrt, v_net_fiat, v_fee_fiat, p_currency, p_payment_method_id, 'fiat', 'processed', now())
        RETURNING id INTO v_withdrawal_id;

        -- Log platform revenue
        INSERT INTO public.platform_revenue (source, provider, fiat_amount, currency, description)
        VALUES ('Fiat Withdrawal Fee', v_provider_name, v_fee_fiat, p_currency, '1.5% withdrawal fee on ' || p_fiat_amount || ' ' || p_currency);

        -- Log automated audit success
        INSERT INTO public.payout_audits (withdrawal_id, gateway_id, amount_fiat, fee_incurred, status, provider_reference)
        VALUES (v_withdrawal_id, v_gateway_id, v_net_fiat, v_fee_fiat, 'success', 'AUTO-' || upper(substr(md5(random()::text), 1, 8)));

        -- User Ledger transaction
        INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
        VALUES (v_wallet_id, -p_amount_nrt, 'withdrawal', 'Automated Fiat Withdrawal via ' || v_provider_name);

        RETURN jsonb_build_object(
            'success', true,
            'automated', true,
            'withdrawal_id', v_withdrawal_id,
            'new_balance', v_current_balance - p_amount_nrt
        );

    ELSE
        -- FAILURE PATH: Insufficient fiat liquidity (Fallback to manual pending)
        
        -- Deduct from user wallet unconditionally to prevent double-spending (Escrow)
        UPDATE public.wallets SET nrt_balance = nrt_balance - p_amount_nrt, updated_at = now() WHERE id = v_wallet_id;

        -- Create withdrawal request marked as pending
        INSERT INTO public.withdrawal_requests (user_id, amount_nrt, amount_fiat, fee_fiat, currency, payment_method_id, withdrawal_type, status)
        VALUES (v_user_id, p_amount_nrt, v_net_fiat, v_fee_fiat, p_currency, p_payment_method_id, 'fiat', 'pending')
        RETURNING id INTO v_withdrawal_id;

        -- Log automated audit failure
        IF v_gateway_id IS NOT NULL THEN
            INSERT INTO public.payout_audits (withdrawal_id, gateway_id, amount_fiat, status)
            VALUES (v_withdrawal_id, v_gateway_id, v_net_fiat, 'liquidity_failed');
        END IF;

        -- User Ledger transaction
        INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
        VALUES (v_wallet_id, -p_amount_nrt, 'withdrawal', 'Pending Fiat Withdrawal');
        
        RETURN jsonb_build_object(
            'success', true,
            'automated', false,
            'withdrawal_id', v_withdrawal_id,
            'reason', 'Requires manual review due to liquidity routing.'
        );
    END IF;
END;
$$;

-- 3. Create Crypto Withdrawal RPC
CREATE OR REPLACE FUNCTION request_crypto_withdrawal(
    p_amount_nrt NUMERIC,
    p_crypto_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_wallet_id UUID;
    v_current_balance NUMERIC;
    v_withdrawal_id UUID;
BEGIN
    -- Get caller ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get wallet and lock it for update
    SELECT id, nrt_balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    -- Check user balance
    IF v_current_balance < p_amount_nrt THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Deduct from user wallet unconditionally (Escrow)
    UPDATE public.wallets SET nrt_balance = nrt_balance - p_amount_nrt, updated_at = now() WHERE id = v_wallet_id;

    -- Create withdrawal request marked as pending
    INSERT INTO public.withdrawal_requests (user_id, amount_nrt, amount_fiat, fee_fiat, currency, withdrawal_type, crypto_address, status)
    VALUES (v_user_id, p_amount_nrt, 0, 0, 'NRT', 'crypto', p_crypto_address, 'pending')
    RETURNING id INTO v_withdrawal_id;

    -- User Ledger transaction
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_wallet_id, -p_amount_nrt, 'withdrawal', 'Pending Crypto Withdrawal (Solana)');
    
    RETURN jsonb_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id
    );
END;
$$;
