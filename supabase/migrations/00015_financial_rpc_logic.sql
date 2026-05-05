-- Phase 9: Financial Logic (Escrow & Payments)
-- Created: 2026

-- ==========================================
-- 1. P2P ESCROW LOGIC
-- ==========================================

-- Function to create a P2P order and lock escrow
CREATE OR REPLACE FUNCTION public.create_p2p_order(
    p_offer_id UUID,
    p_buyer_id UUID,
    p_nrt_amount NUMERIC,
    p_fiat_amount NUMERIC,
    p_payment_method TEXT
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_seller_id UUID;
    v_seller_wallet_id UUID;
BEGIN
    -- 1. Get offer details and seller
    SELECT user_id INTO v_seller_id FROM public.p2p_offers WHERE id = p_offer_id;
    
    -- 2. Check if seller has enough balance
    SELECT id INTO v_seller_wallet_id FROM public.wallets WHERE user_id = v_seller_id;
    
    IF (SELECT nrt_balance FROM public.wallets WHERE id = v_seller_wallet_id) < p_nrt_amount THEN
        RAISE EXCEPTION 'Insufficient seller balance for escrow';
    END IF;

    -- 3. Create the order
    INSERT INTO public.p2p_orders (
        offer_id, seller_id, buyer_id, nrt_amount, fiat_amount, payment_method, status, escrow_locked
    )
    VALUES (
        p_offer_id, v_seller_id, p_buyer_id, p_nrt_amount, p_fiat_amount, p_payment_method, 'pending', true
    )
    RETURNING id INTO v_order_id;

    -- 4. Deduct from seller balance (Escrow Lock)
    UPDATE public.wallets 
    SET nrt_balance = nrt_balance - p_nrt_amount 
    WHERE id = v_seller_wallet_id;

    -- 5. Record transaction
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_seller_wallet_id, -p_nrt_amount, 'p2p', 'P2P Escrow Locked (Order ' || v_order_id || ')');

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release P2P escrow to buyer
CREATE OR REPLACE FUNCTION public.release_p2p_escrow(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_buyer_wallet_id UUID;
BEGIN
    -- 1. Get order details
    SELECT * INTO v_order FROM public.p2p_orders WHERE id = p_order_id;
    
    IF v_order.status != 'paid' AND v_order.status != 'pending' THEN
        RAISE EXCEPTION 'Order is not in a releasable state';
    END IF;

    -- 2. Get buyer wallet
    SELECT id INTO v_buyer_wallet_id FROM public.wallets WHERE user_id = v_order.buyer_id;

    -- 3. Update order status
    UPDATE public.p2p_orders 
    SET status = 'completed', escrow_locked = false 
    WHERE id = p_order_id;

    -- 4. Add balance to buyer
    UPDATE public.wallets 
    SET nrt_balance = nrt_balance + v_order.nrt_amount 
    WHERE id = v_buyer_wallet_id;

    -- 5. Record transaction
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_buyer_wallet_id, v_order.nrt_amount, 'p2p', 'P2P Escrow Received (Order ' || p_order_id || ')');

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. SCAN2PAY ATOMIC PAYMENT
-- ==========================================

-- Function to process a Scan2Pay checkout
CREATE OR REPLACE FUNCTION public.process_scan2pay(
    p_session_id UUID,
    p_payer_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_session RECORD;
    v_payer_wallet_id UUID;
    v_merchant_wallet_id UUID;
    v_tx_id UUID;
BEGIN
    -- 1. Get session details
    SELECT * INTO v_session FROM public.scan2pay_sessions WHERE id = p_session_id;
    
    IF v_session.status != 'pending' THEN
        RAISE EXCEPTION 'Checkout session is no longer active';
    END IF;

    IF v_session.expires_at < now() THEN
        UPDATE public.scan2pay_sessions SET status = 'expired' WHERE id = p_session_id;
        RAISE EXCEPTION 'Checkout session has expired';
    END IF;

    -- 2. Get wallets
    SELECT id INTO v_payer_wallet_id FROM public.wallets WHERE user_id = p_payer_id;
    SELECT id INTO v_merchant_wallet_id FROM public.wallets WHERE user_id = v_session.merchant_id;

    -- 3. Check payer balance
    IF (SELECT nrt_balance FROM public.wallets WHERE id = v_payer_wallet_id) < v_session.amount_nrt THEN
        RAISE EXCEPTION 'Insufficient balance for payment';
    END IF;

    -- 4. Perform atomic transfer
    -- Deduct from payer
    UPDATE public.wallets SET nrt_balance = nrt_balance - v_session.amount_nrt WHERE id = v_payer_wallet_id;
    -- Add to merchant
    UPDATE public.wallets SET nrt_balance = nrt_balance + v_session.amount_nrt WHERE id = v_merchant_wallet_id;

    -- 5. Create transaction record for payer
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_payer_wallet_id, -v_session.amount_nrt, 'scan2pay', 'Payment to Merchant: ' || v_session.description)
    RETURNING id INTO v_tx_id;

    -- 6. Create transaction record for merchant
    INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
    VALUES (v_merchant_wallet_id, v_session.amount_nrt, 'scan2pay', 'Payment received from user: ' || p_payer_id);

    -- 7. Update session status
    UPDATE public.scan2pay_sessions 
    SET status = 'completed', paid_by = p_payer_id, transaction_id = v_tx_id 
    WHERE id = p_session_id;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
