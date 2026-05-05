-- Migration: Security Audit Fixes (NRT Escrow & Payments)
-- Description: Adds authorization checks, input validation, and row locking to critical financial RPCs.

-- 1. Fix create_campaign_with_escrow
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
    v_current_balance DECIMAL;
BEGIN
    -- [SECURITY] Verify that the creator is the current authenticated user
    IF p_creator_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You cannot spend from another user''s wallet.';
    END IF;

    -- [SECURITY] Verify positive amounts
    IF p_total_budget <= 0 OR p_reward_rate_per_gb <= 0 THEN
        RAISE EXCEPTION 'Invalid parameters: Amounts must be positive.';
    END IF;

    -- 1. Lock the wallet row for update
    SELECT nrt_balance INTO v_current_balance 
    FROM public.wallets 
    WHERE user_id = p_creator_id 
    FOR UPDATE;

    -- 2. Check balance
    IF v_current_balance IS NULL OR v_current_balance < p_total_budget THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Insufficient NRT balance.');
    END IF;

    -- 3. Create the campaign
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
    WHERE user_id = p_creator_id;

    -- 5. Log transaction
    INSERT INTO public.transactions (user_id, amount, type, status, description, reference)
    VALUES (p_creator_id, -p_total_budget, 'escrow', 'completed', 'Budget Escrow: ' || p_title, 'CAMP-' || v_campaign_id);

    RETURN jsonb_build_object('status', 'success', 'campaign_id', v_campaign_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix create_p2p_order
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
    -- [SECURITY] Verify buyer
    IF p_buyer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Buyer ID mismatch.';
    END IF;

    -- [SECURITY] Verify positive amount
    IF p_nrt_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount: Must be positive.';
    END IF;

    -- 1. Get offer details
    SELECT user_id INTO v_seller_id FROM public.p2p_offers WHERE id = p_offer_id;
    
    -- 2. Lock seller wallet for update
    SELECT id INTO v_seller_wallet_id FROM public.wallets WHERE user_id = v_seller_id FOR UPDATE;
    
    IF (SELECT nrt_balance FROM public.wallets WHERE id = v_seller_wallet_id) < p_nrt_amount THEN
        RAISE EXCEPTION 'Insufficient seller balance for escrow';
    END IF;

    -- 3. Create the order
    INSERT INTO public.p2p_orders (offer_id, seller_id, buyer_id, nrt_amount, fiat_amount, payment_method, status, escrow_locked)
    VALUES (p_offer_id, v_seller_id, p_buyer_id, p_nrt_amount, p_fiat_amount, p_payment_method, 'pending', true)
    RETURNING id INTO v_order_id;

    -- 4. Deduct from seller (Escrow Lock)
    UPDATE public.wallets SET nrt_balance = nrt_balance - p_nrt_amount WHERE id = v_seller_wallet_id;

    -- 5. Record transaction
    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (v_seller_id, -p_nrt_amount, 'p2p', 'completed', 'P2P Escrow Locked (Order ' || v_order_id || ')');

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix release_p2p_escrow (CRITICAL FIX)
CREATE OR REPLACE FUNCTION public.release_p2p_escrow(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_buyer_wallet_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- 1. Get order details and lock for update
    SELECT * INTO v_order FROM public.p2p_orders WHERE id = p_order_id FOR UPDATE;
    
    -- [SECURITY] Check if caller is the seller OR an admin
    SELECT (role = 'admin') INTO v_is_admin FROM public.users WHERE id = auth.uid();
    
    IF v_order.seller_id <> auth.uid() AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only the seller or an admin can release escrow.';
    END IF;

    IF v_order.status != 'paid' AND v_order.status != 'pending' THEN
        RAISE EXCEPTION 'Order is not in a releasable state';
    END IF;

    -- 2. Get buyer wallet
    SELECT id INTO v_buyer_wallet_id FROM public.wallets WHERE user_id = v_order.buyer_id;

    -- 3. Update order
    UPDATE public.p2p_orders SET status = 'completed', escrow_locked = false WHERE id = p_order_id;

    -- 4. Add balance to buyer
    UPDATE public.wallets SET nrt_balance = nrt_balance + v_order.nrt_amount WHERE id = v_buyer_wallet_id;

    -- 5. Record transaction
    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (v_order.buyer_id, v_order.nrt_amount, 'p2p', 'completed', 'P2P Escrow Received (Order ' || p_order_id || ')');

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix process_scan2pay
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
    -- [SECURITY] Verify payer
    IF p_payer_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Payer ID mismatch.';
    END IF;

    -- 1. Get session details and lock
    SELECT * INTO v_session FROM public.scan2pay_sessions WHERE id = p_session_id FOR UPDATE;
    
    IF v_session.status != 'pending' THEN
        RAISE EXCEPTION 'Checkout session is no longer active';
    END IF;

    IF v_session.expires_at < now() THEN
        UPDATE public.scan2pay_sessions SET status = 'expired' WHERE id = p_session_id;
        RAISE EXCEPTION 'Checkout session has expired';
    END IF;

    -- 2. Get wallets and lock
    SELECT id INTO v_payer_wallet_id FROM public.wallets WHERE user_id = p_payer_id FOR UPDATE;
    SELECT id INTO v_merchant_wallet_id FROM public.wallets WHERE user_id = v_session.merchant_id FOR UPDATE;

    -- 3. Check balance
    IF (SELECT nrt_balance FROM public.wallets WHERE id = v_payer_wallet_id) < v_session.amount_nrt THEN
        RAISE EXCEPTION 'Insufficient balance for payment';
    END IF;

    -- 4. Atomic transfer
    UPDATE public.wallets SET nrt_balance = nrt_balance - v_session.amount_nrt WHERE id = v_payer_wallet_id;
    UPDATE public.wallets SET nrt_balance = nrt_balance + v_session.amount_nrt WHERE id = v_merchant_wallet_id;

    -- 5. Transaction for payer
    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (p_payer_id, -v_session.amount_nrt, 'scan2pay', 'completed', 'Payment: ' || v_session.description)
    RETURNING id INTO v_tx_id;

    -- 6. Transaction for merchant
    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (v_session.merchant_id, v_session.amount_nrt, 'scan2pay', 'completed', 'Payment from user: ' || p_payer_id);

    -- 7. Update session
    UPDATE public.scan2pay_sessions SET status = 'completed', paid_by = p_payer_id, transaction_id = v_tx_id WHERE id = p_session_id;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
