-- Migration: Fix RPC Transaction Column Names
-- Description: Migration 00054 introduced wrong column names when inserting into
-- public.transactions. The correct schema uses wallet_id + tx_type, NOT user_id + type + status.
-- This migration corrects all four affected RPCs and also fixes the webhook nrtTracker.ts
-- column references so the netreward-webhook Edge Function works correctly.

-- ─── 1. create_campaign_with_escrow ───────────────────────────────────────────
-- Problem: 00054 used (user_id, amount, type, status, description, reference)
-- Fix:     Use (wallet_id, amount, tx_type, description, blockchain_signature)

CREATE OR REPLACE FUNCTION public.create_campaign_with_escrow(
    p_creator_id UUID,
    p_sp_id UUID,
    p_isp_id UUID,
    p_service_id UUID,
    p_network_id UUID,
    p_title TEXT,
    p_reward_rate_per_gb DECIMAL,
    p_total_budget DECIMAL,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_is_recurring BOOLEAN,
    p_country TEXT,
    p_target_locations JSONB
) RETURNS JSONB AS $$
DECLARE
    v_campaign_id UUID;
    v_wallet_id UUID;
    v_current_balance DECIMAL;
BEGIN
    -- [SECURITY] Verify caller is the creator
    IF p_creator_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You cannot spend from another user''s wallet.';
    END IF;

    IF p_total_budget <= 0 OR p_reward_rate_per_gb <= 0 THEN
        RAISE EXCEPTION 'Invalid parameters: Amounts must be positive.';
    END IF;

    -- 1. Lock wallet row
    SELECT id, nrt_balance INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_creator_id
    FOR UPDATE;

    -- 2. Validate wallet & balance
    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'User wallet not found.');
    END IF;

    IF v_current_balance IS NULL OR v_current_balance < p_total_budget THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Insufficient NRT balance. Required: ' || p_total_budget || ', Available: ' || COALESCE(v_current_balance, 0)
        );
    END IF;

    -- 3. Create campaign
    INSERT INTO public.campaigns (
        sp_id, isp_id, service_id, network_id, title,
        total_budget, escrow_nrt, reward_rate_per_gb,
        start_date, end_date, is_recurring, status,
        country, target_locations
    ) VALUES (
        p_sp_id, p_isp_id, p_service_id, p_network_id, p_title,
        p_total_budget, p_total_budget, p_reward_rate_per_gb,
        p_start_date, p_end_date, p_is_recurring, 'active',
        p_country, p_target_locations
    ) RETURNING id INTO v_campaign_id;

    -- 4. Deduct NRT
    UPDATE public.wallets
    SET nrt_balance = nrt_balance - p_total_budget
    WHERE id = v_wallet_id;

    -- 5. Log transaction (correct columns: wallet_id, tx_type, blockchain_signature)
    INSERT INTO public.transactions (
        wallet_id,
        amount,
        tx_type,
        description,
        blockchain_signature
    ) VALUES (
        v_wallet_id,
        -p_total_budget,
        'escrow'::transaction_type,
        'Budget Escrow for Campaign: ' || p_title,
        'CAMP-' || v_campaign_id
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'campaign_id', v_campaign_id,
        'message', 'Campaign launched successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_campaign_with_escrow TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_campaign_with_escrow TO service_role;


-- ─── 2. create_p2p_order ──────────────────────────────────────────────────────
-- Problem: 00054 used (user_id, amount, type, status, description)
-- Fix:     Use (wallet_id, amount, tx_type, description)

CREATE OR REPLACE FUNCTION public.create_p2p_order(
    p_offer_id UUID,
    p_buyer_id UUID,
    p_nrt_amount NUMERIC,
    p_fiat_amount NUMERIC,
    p_payment_method TEXT
) RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_seller_id UUID;
    v_seller_wallet_id UUID;
BEGIN
    IF p_buyer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Buyer ID mismatch.';
    END IF;

    IF p_nrt_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount: Must be positive.';
    END IF;

    SELECT user_id INTO v_seller_id FROM public.p2p_offers WHERE id = p_offer_id;
    SELECT id INTO v_seller_wallet_id FROM public.wallets WHERE user_id = v_seller_id FOR UPDATE;

    IF (SELECT nrt_balance FROM public.wallets WHERE id = v_seller_wallet_id) < p_nrt_amount THEN
        RAISE EXCEPTION 'Insufficient seller balance for escrow';
    END IF;

    INSERT INTO public.p2p_orders (
        offer_id, seller_id, buyer_id, nrt_amount,
        fiat_amount, payment_method, status, escrow_locked
    ) VALUES (
        p_offer_id, v_seller_id, p_buyer_id, p_nrt_amount,
        p_fiat_amount, p_payment_method, 'pending', true
    ) RETURNING id INTO v_order_id;

    UPDATE public.wallets SET nrt_balance = nrt_balance - p_nrt_amount WHERE id = v_seller_wallet_id;

    -- Correct columns
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_seller_wallet_id, -p_nrt_amount, 'p2p'::transaction_type, 'P2P Escrow Locked (Order ' || v_order_id || ')');

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_p2p_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_p2p_order TO service_role;


-- ─── 3. release_p2p_escrow ────────────────────────────────────────────────────
-- Problem: 00054 used (user_id, amount, type, status, description)
-- Fix:     Use (wallet_id, amount, tx_type, description)

CREATE OR REPLACE FUNCTION public.release_p2p_escrow(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_buyer_wallet_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    SELECT * INTO v_order FROM public.p2p_orders WHERE id = p_order_id FOR UPDATE;

    SELECT (role = 'admin') INTO v_is_admin FROM public.users WHERE id = auth.uid();

    IF v_order.seller_id <> auth.uid() AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only the seller or an admin can release escrow.';
    END IF;

    IF v_order.status NOT IN ('paid', 'pending') THEN
        RAISE EXCEPTION 'Order is not in a releasable state';
    END IF;

    SELECT id INTO v_buyer_wallet_id FROM public.wallets WHERE user_id = v_order.buyer_id;

    UPDATE public.p2p_orders SET status = 'completed', escrow_locked = false WHERE id = p_order_id;
    UPDATE public.wallets SET nrt_balance = nrt_balance + v_order.nrt_amount WHERE id = v_buyer_wallet_id;

    -- Correct columns
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_buyer_wallet_id, v_order.nrt_amount, 'p2p'::transaction_type, 'P2P Escrow Received (Order ' || p_order_id || ')');

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.release_p2p_escrow TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_p2p_escrow TO service_role;


-- ─── 4. process_scan2pay ──────────────────────────────────────────────────────
-- Problem: 00054 used (user_id, amount, type, status, description)
-- Fix:     Use (wallet_id, amount, tx_type, description)

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

    -- Correct columns — payer debit
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_payer_wallet_id, -v_session.amount_nrt, 'scan2pay'::transaction_type, 'Payment: ' || v_session.description)
    RETURNING id INTO v_tx_id;

    -- Correct columns — merchant credit
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_merchant_wallet_id, v_session.amount_nrt, 'scan2pay'::transaction_type, 'Payment received from user: ' || p_payer_id);

    UPDATE public.scan2pay_sessions
    SET status = 'completed', paid_by = p_payer_id, transaction_id = v_tx_id
    WHERE id = p_session_id;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.process_scan2pay TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_scan2pay TO service_role;
