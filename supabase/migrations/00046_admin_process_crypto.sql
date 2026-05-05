-- Migration: Admin Process Withdrawal Update for Crypto
-- Created: 2026-05-02

CREATE OR REPLACE FUNCTION admin_process_withdrawal(
    p_withdrawal_id UUID,
    p_status TEXT, -- 'processed', 'failed', 'rejected'
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
BEGIN
    -- Verify admin caller
    v_admin_id := auth.uid();
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    IF p_status NOT IN ('processed', 'failed', 'rejected') THEN
        RAISE EXCEPTION 'Invalid target status. Must be processed, failed, or rejected.';
    END IF;

    -- Get withdrawal details
    SELECT user_id, amount_nrt, status, withdrawal_type INTO v_user_id, v_amount_nrt, v_current_status, v_withdrawal_type
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

    -- If processed successfully AND it's a FIAT withdrawal, move NRT to Admin Treasury
    -- (Because for Crypto withdrawals, the NRT leaves the ecosystem to the blockchain, it doesn't go to Treasury)
    IF p_status = 'processed' AND v_withdrawal_type = 'fiat' THEN
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

        -- Create refund ledger transaction
        INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
        VALUES (v_wallet_id, v_amount_nrt, 'deposit', COALESCE(p_reason, 'Refund: Withdrawal ' || p_status));
        
        RETURN jsonb_build_object('success', true, 'status', p_status, 'refunded', true);
    END IF;

    RETURN jsonb_build_object('success', true, 'status', p_status, 'refunded', false);
END;
$$;
