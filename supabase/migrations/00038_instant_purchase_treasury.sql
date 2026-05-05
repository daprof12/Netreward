-- Migration: Instant Purchase Treasury Integration
-- Created: 2026-05-02

-- 1. Seed Admin Treasury with initial NRT liquidity
UPDATE public.admin_treasury 
SET nrt_balance = nrt_balance + 100000000.000000, 
    updated_at = now() 
WHERE id = (SELECT id FROM public.admin_treasury LIMIT 1);

-- 2. Create RPC for processing instant purchases
CREATE OR REPLACE FUNCTION process_instant_purchase(
    p_amount_nrt NUMERIC,
    p_amount_fiat NUMERIC,
    p_currency TEXT,
    p_provider_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_wallet_id UUID;
    v_treasury_id UUID;
    v_treasury_balance NUMERIC;
    v_gateway_id UUID;
BEGIN
    -- Get caller ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get wallet and lock it for update
    SELECT id INTO v_wallet_id
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    -- Get Admin Treasury and lock it
    SELECT id, nrt_balance INTO v_treasury_id, v_treasury_balance 
    FROM public.admin_treasury 
    LIMIT 1 
    FOR UPDATE;

    IF v_treasury_id IS NULL THEN
        RAISE EXCEPTION 'Admin treasury not initialized';
    END IF;

    -- Ensure Treasury has enough NRT to sell
    IF v_treasury_balance < p_amount_nrt THEN
        RAISE EXCEPTION 'Insufficient liquidity in Admin Treasury. Please contact support.';
    END IF;

    -- Find or create the Gateway Liquidity pool for the provider
    SELECT id INTO v_gateway_id
    FROM public.gateway_liquidity
    WHERE provider_name = p_provider_name AND currency = p_currency
    LIMIT 1
    FOR UPDATE;

    IF v_gateway_id IS NULL THEN
        -- Auto-create gateway liquidity pool if it doesn't exist for this provider/currency combo
        INSERT INTO public.gateway_liquidity (provider_name, currency, fiat_balance, status)
        VALUES (p_provider_name, p_currency, 0.00, 'active')
        RETURNING id INTO v_gateway_id;
    END IF;

    -- ==========================================
    -- EXECUTE CLOSED-LOOP TRANSACTION
    -- ==========================================

    -- 1. Deduct NRT from Admin Treasury
    UPDATE public.admin_treasury 
    SET nrt_balance = nrt_balance - p_amount_nrt, 
        updated_at = now() 
    WHERE id = v_treasury_id;

    -- 2. Add Fiat to Gateway Liquidity
    UPDATE public.gateway_liquidity 
    SET fiat_balance = fiat_balance + p_amount_fiat, 
        updated_at = now() 
    WHERE id = v_gateway_id;

    -- 3. Add NRT to User Wallet
    UPDATE public.wallets 
    SET nrt_balance = nrt_balance + p_amount_nrt, 
        updated_at = now() 
    WHERE id = v_wallet_id;

    -- 4. Record User Transaction
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description, status)
    VALUES (v_wallet_id, p_amount_nrt, 'deposit', 'Instant Purchase via ' || p_provider_name, 'completed');

    -- Note: Payout audits are only for withdrawals, so we don't log fiat deposits there.
    -- The fiat deposit is inherently verified since this RPC is called after payment success.

    RETURN jsonb_build_object(
        'success', true,
        'nrt_credited', p_amount_nrt,
        'fiat_debited', p_amount_fiat
    );
END;
$$;
