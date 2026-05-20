-- P2P Order Lifecycle: accepted status + cancel/auto-dispute RPCs
-- Created: 2026-05-19

-- ==========================================
-- 1. CANCEL P2P ORDER (refund escrow to seller)
-- ==========================================
CREATE OR REPLACE FUNCTION public.cancel_p2p_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_seller_wallet_id UUID;
BEGIN
    SELECT * INTO v_order FROM public.p2p_orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Only cancel if not already completed or cancelled
    IF v_order.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Order cannot be cancelled in its current state';
    END IF;

    -- Get seller wallet
    SELECT id INTO v_seller_wallet_id FROM public.wallets WHERE user_id = v_order.seller_id;

    -- Update order status
    UPDATE public.p2p_orders
    SET status = 'cancelled', escrow_locked = false
    WHERE id = p_order_id;

    -- Refund escrow to seller
    IF v_order.escrow_locked THEN
        UPDATE public.wallets
        SET nrt_balance = nrt_balance + v_order.nrt_amount
        WHERE id = v_seller_wallet_id;

        INSERT INTO public.transactions (wallet_id, amount, tx_type, description)
        VALUES (v_seller_wallet_id, v_order.nrt_amount, 'p2p', 'P2P Escrow Refunded (Order ' || p_order_id || ')');
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. AUTO-DISPUTE P2P ORDER (after payment timeout)
-- ==========================================
CREATE OR REPLACE FUNCTION public.auto_dispute_p2p_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
BEGIN
    SELECT * INTO v_order FROM public.p2p_orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.status NOT IN ('paid', 'accepted') THEN
        RAISE EXCEPTION 'Order is not in a disputable state';
    END IF;

    UPDATE public.p2p_orders
    SET status = 'disputed', has_dispute = true
    WHERE id = p_order_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. UPDATE NOTIFICATION TRIGGER for new statuses
-- ==========================================
CREATE OR REPLACE FUNCTION public.notify_p2p_order_update()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_prefs JSONB;
    v_buyer_prefs JSONB;
BEGIN
    -- Get Seller Preferences (with fallback for NULL)
    SELECT COALESCE(notification_preferences, '{"types":{"p2p":true}}'::JSONB)
      INTO v_seller_prefs FROM public.users WHERE id = NEW.seller_id;
    -- Get Buyer Preferences (with fallback for NULL)
    SELECT COALESCE(notification_preferences, '{"types":{"p2p":true}}'::JSONB)
      INTO v_buyer_prefs FROM public.users WHERE id = NEW.buyer_id;

    IF (TG_OP = 'INSERT') THEN
        -- Notify seller of new order
        IF COALESCE((v_seller_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.seller_id, 'New P2P Order',
                'You have a new buy order for ' || NEW.nrt_amount || ' NRT. Tap to accept or decline.',
                'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
        END IF;
    ELSIF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Accepted: notify buyer
        IF NEW.status = 'accepted' THEN
            IF COALESCE((v_buyer_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (NEW.buyer_id, 'Order Accepted',
                    'The seller has accepted your order. Proceed to make payment.',
                    'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
            END IF;
        END IF;

        -- Paid: notify seller
        IF NEW.status = 'paid' THEN
            IF COALESCE((v_seller_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (NEW.seller_id, 'Payment Proof Received',
                    'The buyer has marked payment as complete. Please verify and release NRT.',
                    'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
            END IF;
        END IF;

        -- Completed: notify both
        IF NEW.status = 'completed' THEN
            IF COALESCE((v_buyer_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (NEW.buyer_id, 'NRT Received!',
                    'The seller has released ' || NEW.nrt_amount || ' NRT to your wallet.',
                    'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
            END IF;
            IF COALESCE((v_seller_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (NEW.seller_id, 'Sale Complete',
                    'You have successfully sold ' || NEW.nrt_amount || ' NRT.',
                    'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
            END IF;
        END IF;

        -- Cancelled: notify the other party
        IF NEW.status = 'cancelled' THEN
            IF COALESCE((v_buyer_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (NEW.buyer_id, 'Order Cancelled',
                    'Your P2P order has been cancelled. Escrow has been refunded.',
                    'p2p', '/wallet/deposit/p2p');
            END IF;
            IF COALESCE((v_seller_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (NEW.seller_id, 'Order Cancelled',
                    'A P2P order has been cancelled. Your escrow has been refunded.',
                    'p2p', '/wallet/deposit/p2p');
            END IF;
        END IF;

        -- Disputed: notify both + admin
        IF NEW.status = 'disputed' THEN
            IF COALESCE((v_buyer_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (NEW.buyer_id, 'Trade Disputed',
                    'This trade has been escalated to the resolution center for review.',
                    'p2p', '/wallet/deposit/p2p/disputes');
            END IF;
            IF COALESCE((v_seller_prefs->'types'->>'p2p')::BOOLEAN, true) THEN
                INSERT INTO public.notifications (user_id, title, message, type, link)
                VALUES (NEW.seller_id, 'Trade Disputed',
                    'This trade has been escalated to the resolution center for review.',
                    'p2p', '/wallet/deposit/p2p/disputes');
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (drop old one first if exists)
DROP TRIGGER IF EXISTS p2p_order_notification_trigger ON public.p2p_orders;
CREATE TRIGGER p2p_order_notification_trigger
    AFTER INSERT OR UPDATE ON public.p2p_orders
    FOR EACH ROW EXECUTE FUNCTION public.notify_p2p_order_update();

-- ==========================================
-- 4. ENABLE REALTIME for p2p_orders
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.p2p_orders;
