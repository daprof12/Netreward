-- Phase 9: Refined Notifications with Preferences
-- Created: 2026

-- Update P2P notification trigger to check preferences
CREATE OR REPLACE FUNCTION public.notify_p2p_order_update()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_prefs JSONB;
    v_buyer_prefs JSONB;
BEGIN
    -- Get Seller Preferences
    SELECT notification_preferences INTO v_seller_prefs FROM public.users WHERE id = NEW.seller_id;
    -- Get Buyer Preferences
    SELECT notification_preferences INTO v_buyer_prefs FROM public.users WHERE id = NEW.buyer_id;

    IF (TG_OP = 'INSERT') THEN
        -- Check if seller wants P2P notifications
        IF (v_seller_prefs->'types'->>'p2p')::BOOLEAN THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.seller_id, 'New P2P Order', 'You have a new buy order for ' || NEW.nrt_amount || ' NRT.', 'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
        END IF;
    ELSIF (OLD.status != NEW.status) THEN
        -- Notify Buyer
        IF (v_buyer_prefs->'types'->>'p2p')::BOOLEAN THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.buyer_id, 'Order Update: ' || NEW.status, 'Your P2P order status has changed to ' || NEW.status, 'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
        END IF;
        
        -- Notify Seller
        IF (v_seller_prefs->'types'->>'p2p')::BOOLEAN THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.seller_id, 'Order Update: ' || NEW.status, 'The P2P order status has changed to ' || NEW.status, 'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Scan2Pay notification trigger to check preferences
CREATE OR REPLACE FUNCTION public.notify_scan2pay_success()
RETURNS TRIGGER AS $$
DECLARE
    v_payer_prefs JSONB;
    v_merchant_prefs JSONB;
BEGIN
    IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
        SELECT notification_preferences INTO v_payer_prefs FROM public.users WHERE id = NEW.paid_by;
        SELECT notification_preferences INTO v_merchant_prefs FROM public.users WHERE id = NEW.merchant_id;

        -- Notify Payer
        IF (v_payer_prefs->'types'->>'payment')::BOOLEAN THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.paid_by, 'Payment Successful', 'You successfully paid ' || NEW.amount_nrt || ' NRT via Scan2Pay.', 'payment', '/transactions');
        END IF;
        
        -- Notify Merchant
        IF (v_merchant_prefs->'types'->>'payment')::BOOLEAN THEN
            INSERT INTO public.notifications (user_id, title, message, type, link)
            VALUES (NEW.merchant_id, 'Payment Received', 'You received ' || NEW.amount_nrt || ' NRT via Scan2Pay.', 'payment', '/transactions');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Campaign notification trigger to check preferences
CREATE OR REPLACE FUNCTION public.notify_relevant_campaign()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_location RECORD;
BEGIN
    IF NEW.status != 'active' THEN
        RETURN NEW;
    END IF;

    FOR v_location IN SELECT * FROM jsonb_to_recordset(NEW.target_locations) AS x(name TEXT, lat NUMERIC, lon NUMERIC, radiusKm NUMERIC)
    LOOP
        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT DISTINCT d.user_id, 
               'New Relevant Campaign: ' || NEW.title,
               'An ISP/SP just launched a campaign near your location. Earn NRT now!',
               'campaign',
               '/campaigns/' || NEW.id
        FROM public.devices d
        JOIN public.users u ON d.user_id = u.id
        WHERE d.is_active = true
        -- Check preference: Campaign notifications must be enabled
        AND (u.notification_preferences->'types'->>'campaign')::BOOLEAN = true
        AND (
            NEW.country IS NULL OR u.id IN (SELECT id FROM public.users WHERE role = 'user')
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
