-- Migration: Standardize Transaction & Withdrawal Statuses
-- Created: 2026-05-02

-- 1. Standardize status check for transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'rejected'));

-- 2. Standardize status check for withdrawal_requests
ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;

-- Now update existing 'processed' to 'completed'
UPDATE public.withdrawal_requests SET status = 'completed' WHERE status = 'processed';

ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'rejected'));

-- 3. Add link between withdrawal_requests and transactions if not exists
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id);

-- 4. Update admin_process_withdrawal RPC to use standard statuses and update linked transaction
CREATE OR REPLACE FUNCTION admin_process_withdrawal(
    p_withdrawal_id UUID,
    p_status TEXT, -- 'completed', 'failed', 'rejected'
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_user_id UUID;
    v_wallet_id UUID;
    v_amount_nrt NUMERIC;
    v_current_status TEXT;
    v_withdrawal_type TEXT;
    v_current_balance NUMERIC;
    v_transaction_id UUID;
BEGIN
    -- Verify admin caller using is_admin() for recursion safety
    v_admin_id := auth.uid();
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Standardize input status (allow 'processed' for backward compatibility during transition if needed, but map to 'completed')
    IF p_status = 'processed' THEN p_status := 'completed'; END IF;

    IF p_status NOT IN ('completed', 'failed', 'rejected') THEN
        RAISE EXCEPTION 'Invalid target status. Must be completed, failed, or rejected.';
    END IF;

    -- Get withdrawal details
    SELECT user_id, amount_nrt, status, withdrawal_type, transaction_id 
    INTO v_user_id, v_amount_nrt, v_current_status, v_withdrawal_type, v_transaction_id
    FROM public.withdrawal_requests
    WHERE id = p_withdrawal_id
    FOR UPDATE;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Withdrawal request not found';
    END IF;

    IF v_current_status != 'pending' THEN
        RAISE EXCEPTION 'Only pending withdrawals can be updated (Current status: %)', v_current_status;
    END IF;

    -- Update withdrawal status
    UPDATE public.withdrawal_requests
    SET status = p_status,
        processed_at = now()
    WHERE id = p_withdrawal_id;

    -- Update linked transaction status if it exists
    IF v_transaction_id IS NOT NULL THEN
        UPDATE public.transactions SET status = p_status WHERE id = v_transaction_id;
    END IF;

    -- If completed successfully AND it's a FIAT withdrawal, move NRT to Admin Treasury
    IF p_status = 'completed' AND v_withdrawal_type = 'fiat' THEN
        DECLARE
            v_treasury_id UUID;
        BEGIN
            SELECT id INTO v_treasury_id FROM public.admin_treasury LIMIT 1 FOR UPDATE;
            UPDATE public.admin_treasury SET nrt_balance = nrt_balance + v_amount_nrt, updated_at = now() WHERE id = v_treasury_id;
        END;
    END IF;

    -- If rejected or failed, we must refund the NRT to the user
    IF p_status IN ('rejected', 'failed') THEN
        -- Get user wallet and lock it
        SELECT id, nrt_balance INTO v_wallet_id, v_current_balance
        FROM public.wallets
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF v_wallet_id IS NULL THEN
            RAISE EXCEPTION 'User wallet not found';
        END IF;

        -- Refund NRT to user
        UPDATE public.wallets
        SET nrt_balance = nrt_balance + v_amount_nrt,
            updated_at = now()
        WHERE id = v_wallet_id;

        -- Create refund ledger transaction (Refunds are always 'completed' immediately)
        INSERT INTO public.transactions (wallet_id, amount, tx_type, description, status)
        VALUES (v_wallet_id, v_amount_nrt, 'deposit', COALESCE(p_reason, 'Refund: Withdrawal ' || p_status), 'completed');
        
        -- If the original withdrawal transaction was pending, we already marked it as failed/rejected above.
        
        RETURN jsonb_build_object('success', true, 'status', p_status, 'refunded', true);
    END IF;

    RETURN jsonb_build_object('success', true, 'status', p_status, 'refunded', false);
END;
$$;

-- 5. Update request_fiat_withdrawal to link transaction
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
    v_transaction_id UUID;
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
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description, status)
    VALUES (v_wallet_id, -p_amount_nrt, 'withdrawal', 'Fiat Withdrawal (' || p_currency || ')', 'pending')
    RETURNING id INTO v_transaction_id;

    -- Create withdrawal request
    INSERT INTO public.withdrawal_requests (user_id, amount_nrt, amount_fiat, currency, payment_method_id, status, transaction_id)
    VALUES (v_user_id, p_amount_nrt, p_fiat_amount, p_currency, p_payment_method_id, 'pending', v_transaction_id)
    RETURNING id INTO v_withdrawal_id;

    RETURN jsonb_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id,
        'new_balance', v_current_balance - p_amount_nrt
    );
END;
$$;
