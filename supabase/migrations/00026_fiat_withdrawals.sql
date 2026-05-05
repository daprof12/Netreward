-- Migration: Fiat Off-Ramp & Withdrawals (Phase G)
-- Created: 2026-05-01

-- ==========================================
-- 1. Platform Banks
-- ==========================================
CREATE TABLE IF NOT EXISTS public.platform_banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Anyone can read active banks. Admin can manage.
ALTER TABLE public.platform_banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active platform banks" ON public.platform_banks
    FOR SELECT USING (status = 'active');


-- ==========================================
-- 2. User Payment Methods
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    bank_id UUID REFERENCES public.platform_banks(id) ON DELETE RESTRICT,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, bank_id, account_number)
);

-- RLS: Users manage their own payment methods
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their payment methods" ON public.user_payment_methods
    FOR ALL USING (user_id = auth.uid());


-- ==========================================
-- 3. Withdrawal Requests
-- ==========================================
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount_nrt NUMERIC(18, 6) NOT NULL CHECK (amount_nrt > 0),
    amount_fiat NUMERIC(18, 6) NOT NULL CHECK (amount_fiat >= 0),
    currency TEXT NOT NULL,
    payment_method_id UUID REFERENCES public.user_payment_methods(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- RLS: Users can view their own requests.
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own withdrawal requests" ON public.withdrawal_requests
    FOR SELECT USING (user_id = auth.uid());


-- ==========================================
-- 4. RPC: Request Fiat Withdrawal
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

    -- Check balance
    IF v_current_balance < p_amount_nrt THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Deduct balance
    UPDATE public.wallets
    SET nrt_balance = nrt_balance - p_amount_nrt,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- Create ledger transaction (negative amount for withdrawal)
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_wallet_id, -p_amount_nrt, 'withdrawal', 'Fiat Withdrawal (' || p_currency || ')');

    -- Create withdrawal request
    INSERT INTO public.withdrawal_requests (user_id, amount_nrt, amount_fiat, currency, payment_method_id, status)
    VALUES (v_user_id, p_amount_nrt, p_fiat_amount, p_currency, p_payment_method_id, 'pending')
    RETURNING id INTO v_withdrawal_id;

    RETURN jsonb_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id,
        'new_balance', v_current_balance - p_amount_nrt
    );
END;
$$;


-- ==========================================
-- 5. Seed Platform Banks
-- ==========================================
INSERT INTO public.platform_banks (name, country, status) VALUES
    ('GTBank', 'Nigeria', 'active'),
    ('First Bank', 'Nigeria', 'active'),
    ('Zenith Bank', 'Nigeria', 'active'),
    ('Chase Bank', 'USA', 'active'),
    ('Wells Fargo', 'USA', 'active'),
    ('Monzo', 'UK', 'active'),
    ('Barclays', 'UK', 'active')
ON CONFLICT DO NOTHING;
