CREATE OR REPLACE FUNCTION public.process_scan2pay(
    p_session_id UUID,
    p_payer_id UUID
) RETURNS UUID AS $$
DECLARE
    v_session RECORD;
    v_payer_wallet_id UUID;
    v_merchant_wallet_id UUID;
    v_tx_id UUID;
BEGIN
    IF p_payer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Payer ID mismatch.';
    END IF;

    SELECT * INTO v_session FROM public.scan2pay_sessions WHERE id = p_session_id FOR UPDATE;

    IF v_session.status != 'pending' THEN
        RAISE EXCEPTION 'Checkout session is no longer active';
    END IF;

    IF v_session.expires_at < now() THEN
        UPDATE public.scan2pay_sessions SET status = 'expired' WHERE id = p_session_id;
        RAISE EXCEPTION 'Checkout session has expired';
    END IF;

    SELECT id INTO v_payer_wallet_id FROM public.wallets WHERE user_id = p_payer_id FOR UPDATE;
    SELECT id INTO v_merchant_wallet_id FROM public.wallets WHERE user_id = v_session.merchant_id FOR UPDATE;

    IF (SELECT nrt_balance FROM public.wallets WHERE id = v_payer_wallet_id) < v_session.amount_nrt THEN
        RAISE EXCEPTION 'Insufficient balance for payment';
    END IF;

    UPDATE public.wallets SET nrt_balance = nrt_balance - v_session.amount_nrt WHERE id = v_payer_wallet_id;
    UPDATE public.wallets SET nrt_balance = nrt_balance + v_session.amount_nrt WHERE id = v_merchant_wallet_id;

    -- Correct columns — payer debit with status 'completed'
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description, status)
    VALUES (v_payer_wallet_id, -v_session.amount_nrt, 'scan2pay'::transaction_type, 'Payment: ' || v_session.description, 'completed')
    RETURNING id INTO v_tx_id;

    -- Correct columns — merchant credit with status 'completed'
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description, status)
    VALUES (v_merchant_wallet_id, v_session.amount_nrt, 'scan2pay'::transaction_type, 'Payment received from user: ' || p_payer_id, 'completed');

    UPDATE public.scan2pay_sessions
    SET status = 'completed', paid_by = p_payer_id, transaction_id = v_tx_id
    WHERE id = p_session_id;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_scan2pay TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_scan2pay TO service_role;
