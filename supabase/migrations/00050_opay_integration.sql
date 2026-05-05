-- Migration: OPay Payment Gateway Integration
-- Created: 2026-05-02

-- 1. Create opay_payments table to track OPay payment lifecycle
CREATE TABLE IF NOT EXISTS public.opay_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    reference TEXT NOT NULL UNIQUE,
    order_no TEXT,
    amount_fiat NUMERIC NOT NULL,
    amount_nrt NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    pay_method TEXT, -- BankCard, BankTransfer, USSD, MobileMoney, or blank for all
    status TEXT NOT NULL DEFAULT 'INITIAL'
        CHECK (status IN ('INITIAL', 'PENDING', 'SUCCESS', 'FAIL', 'CLOSE')),
    cashier_url TEXT,
    opay_transaction_id TEXT,
    fee_fiat NUMERIC DEFAULT 0,
    callback_payload JSONB,
    provider_name TEXT DEFAULT 'OPay',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opay_payments_user ON public.opay_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_opay_payments_reference ON public.opay_payments(reference);
CREATE INDEX IF NOT EXISTS idx_opay_payments_status ON public.opay_payments(status);

-- 2. RLS Policies
ALTER TABLE public.opay_payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own records
CREATE POLICY opay_payments_user_select ON public.opay_payments
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own records (via edge function with service role, but also direct)
CREATE POLICY opay_payments_user_insert ON public.opay_payments
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admin can read all
CREATE POLICY opay_payments_admin_select ON public.opay_payments
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- Admin can update all (for manual status corrections)
CREATE POLICY opay_payments_admin_update ON public.opay_payments
    FOR UPDATE TO authenticated
    USING (public.is_admin());

-- 3. Seed OPay config keys into kv_settings (sandbox defaults)
INSERT INTO public.kv_settings (key, value) VALUES
    ('opay_merchant_id', '""'),
    ('opay_public_key', '""'),
    ('opay_secret_key', '""'),
    ('opay_environment', '"sandbox"'),
    ('opay_callback_url', '""'),
    ('withdrawal_disbursement_mode', '"manual"'),
    ('system_config', '{"spCashbackPercentage": 10, "ispCashbackPercentage": 5}')
ON CONFLICT (key) DO NOTHING;

-- 4. Function to complete an OPay payment after successful callback
CREATE OR REPLACE FUNCTION complete_opay_payment(
    p_reference TEXT,
    p_opay_transaction_id TEXT,
    p_callback_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment RECORD;
    v_wallet_id UUID;
    v_treasury_id UUID;
    v_treasury_balance NUMERIC;
    v_gateway_id UUID;
BEGIN
    -- Get the payment record
    SELECT * INTO v_payment
    FROM public.opay_payments
    WHERE reference = p_reference
    FOR UPDATE;

    IF v_payment IS NULL THEN
        RAISE EXCEPTION 'Payment reference not found: %', p_reference;
    END IF;

    -- Skip if already processed
    IF v_payment.status = 'SUCCESS' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already processed');
    END IF;

    -- Update OPay payment record
    UPDATE public.opay_payments
    SET status = 'SUCCESS',
        opay_transaction_id = p_opay_transaction_id,
        callback_payload = p_callback_payload,
        updated_at = now()
    WHERE id = v_payment.id;

    -- Get user wallet
    SELECT id INTO v_wallet_id
    FROM public.wallets
    WHERE user_id = v_payment.user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'User wallet not found';
    END IF;

    -- Get Admin Treasury
    SELECT id, nrt_balance INTO v_treasury_id, v_treasury_balance
    FROM public.admin_treasury
    LIMIT 1
    FOR UPDATE;

    IF v_treasury_id IS NULL THEN
        RAISE EXCEPTION 'Admin treasury not initialized';
    END IF;

    IF v_treasury_balance < v_payment.amount_nrt THEN
        RAISE EXCEPTION 'Insufficient liquidity in Admin Treasury';
    END IF;

    -- Find or create gateway liquidity pool
    SELECT id INTO v_gateway_id
    FROM public.gateway_liquidity
    WHERE provider_name = v_payment.provider_name AND currency = v_payment.currency
    LIMIT 1
    FOR UPDATE;

    IF v_gateway_id IS NULL THEN
        INSERT INTO public.gateway_liquidity (provider_name, currency, fiat_balance, status)
        VALUES (v_payment.provider_name, v_payment.currency, 0.00, 'active')
        RETURNING id INTO v_gateway_id;
    END IF;

    -- Execute closed-loop transaction
    -- 1. Deduct NRT from Treasury
    UPDATE public.admin_treasury
    SET nrt_balance = nrt_balance - v_payment.amount_nrt,
        updated_at = now()
    WHERE id = v_treasury_id;

    -- 2. Add fiat to gateway liquidity
    UPDATE public.gateway_liquidity
    SET fiat_balance = fiat_balance + v_payment.amount_fiat,
        updated_at = now()
    WHERE id = v_gateway_id;

    -- 3. Credit NRT to user wallet
    UPDATE public.wallets
    SET nrt_balance = nrt_balance + v_payment.amount_nrt,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- 4. Record transaction
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description, status)
    VALUES (v_wallet_id, v_payment.amount_nrt, 'deposit',
            'Instant Purchase via OPay (' || v_payment.currency || ' ' || v_payment.amount_fiat || ')',
            'completed');

    -- 5. Record platform revenue from fee
    IF v_payment.fee_fiat > 0 THEN
        INSERT INTO public.platform_revenue (source, provider, fiat_amount, currency, description)
        VALUES ('Instant Purchase', 'OPay', v_payment.fee_fiat, v_payment.currency, 'OPay purchase fee');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'nrt_credited', v_payment.amount_nrt,
        'fiat_collected', v_payment.amount_fiat,
        'wallet_id', v_wallet_id
    );
END;
$$;
