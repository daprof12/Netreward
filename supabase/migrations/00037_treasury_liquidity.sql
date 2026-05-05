-- Migration: Automated Treasury and Liquidity Pools
-- Created: 2026-05-02

-- ==========================================
-- 1. Admin Treasury Ledger
-- ==========================================
CREATE TABLE IF NOT EXISTS public.admin_treasury (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nrt_balance NUMERIC(18, 6) DEFAULT 0.000000,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Initialize the single treasury row
INSERT INTO public.admin_treasury (nrt_balance) VALUES (0) ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.admin_treasury ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view treasury" ON public.admin_treasury
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================
-- 2. Gateway Liquidity Pools
-- ==========================================
CREATE TABLE IF NOT EXISTS public.gateway_liquidity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL UNIQUE, -- e.g. 'Paystack', 'Stripe'
    currency TEXT NOT NULL,             -- e.g. 'NGN', 'USD'
    fiat_balance NUMERIC(18, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_funded_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Initial Providers
INSERT INTO public.gateway_liquidity (provider_name, currency, fiat_balance) VALUES
    ('Paystack', 'NGN', 5000000.00), -- 5M NGN pre-funded for testing
    ('Stripe', 'USD', 10000.00),     -- 10k USD
    ('Flutterwave', 'GHS', 50000.00)
ON CONFLICT (provider_name) DO NOTHING;

ALTER TABLE public.gateway_liquidity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view liquidity" ON public.gateway_liquidity
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================
-- 3. Payout Audits
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payout_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    withdrawal_id UUID REFERENCES public.withdrawal_requests(id) ON DELETE CASCADE,
    gateway_id UUID REFERENCES public.gateway_liquidity(id) ON DELETE RESTRICT,
    amount_fiat NUMERIC(18, 2) NOT NULL,
    fee_incurred NUMERIC(18, 2) DEFAULT 0.00,
    status TEXT NOT NULL, -- 'success', 'liquidity_failed', 'api_failed'
    provider_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payout_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view payout audits" ON public.payout_audits
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================
-- 4. Automated Withdrawal RPC (Overhaul)
-- ==========================================
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
    IF v_gateway_id IS NOT NULL AND v_gateway_balance >= p_fiat_amount THEN
        -- SUCCESS PATH: Straight-through processing
        
        -- Deduct from user wallet
        UPDATE public.wallets SET nrt_balance = nrt_balance - p_amount_nrt, updated_at = now() WHERE id = v_wallet_id;
        
        -- Add NRT to Admin Treasury
        SELECT id INTO v_treasury_id FROM public.admin_treasury LIMIT 1 FOR UPDATE;
        UPDATE public.admin_treasury SET nrt_balance = nrt_balance + p_amount_nrt, updated_at = now() WHERE id = v_treasury_id;
        
        -- Deduct fiat from gateway liquidity pool
        UPDATE public.gateway_liquidity SET fiat_balance = fiat_balance - p_fiat_amount, updated_at = now() WHERE id = v_gateway_id;
        
        -- Create withdrawal request marked as processed
        INSERT INTO public.withdrawal_requests (user_id, amount_nrt, amount_fiat, currency, payment_method_id, status, processed_at)
        VALUES (v_user_id, p_amount_nrt, p_fiat_amount, p_currency, p_payment_method_id, 'processed', now())
        RETURNING id INTO v_withdrawal_id;

        -- Log automated audit success
        INSERT INTO public.payout_audits (withdrawal_id, gateway_id, amount_fiat, status, provider_reference)
        VALUES (v_withdrawal_id, v_gateway_id, p_fiat_amount, 'success', 'AUTO-' || upper(substr(md5(random()::text), 1, 8)));

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
        INSERT INTO public.withdrawal_requests (user_id, amount_nrt, amount_fiat, currency, payment_method_id, status)
        VALUES (v_user_id, p_amount_nrt, p_fiat_amount, p_currency, p_payment_method_id, 'pending')
        RETURNING id INTO v_withdrawal_id;

        -- Log automated audit failure
        IF v_gateway_id IS NOT NULL THEN
            INSERT INTO public.payout_audits (withdrawal_id, gateway_id, amount_fiat, status)
            VALUES (v_withdrawal_id, v_gateway_id, p_fiat_amount, 'liquidity_failed');
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
