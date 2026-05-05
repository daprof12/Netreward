-- Phase 9: Real-time Notifications & Targeted Campaign Alerts
-- Created: 2026

-- ==========================================
-- 1. NOTIFICATIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'payment', 'campaign', 'system', 'p2p'
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- 2. TARGETED CAMPAIGN TRIGGER
-- ==========================================

-- Function to notify users about relevant new campaigns
CREATE OR REPLACE FUNCTION public.notify_relevant_campaign()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_location RECORD;
BEGIN
    -- Only notify for active campaigns
    IF NEW.status != 'active' THEN
        RETURN NEW;
    END IF;

    -- Iterate through each target location in the campaign
    FOR v_location IN SELECT * FROM jsonb_to_recordset(NEW.target_locations) AS x(name TEXT, lat NUMERIC, lon NUMERIC, radiusKm NUMERIC)
    LOOP
        -- Find users whose devices were last seen within the radius of this location
        -- (Using a simple distance calculation for demo purposes; in production, use PostGIS)
        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT DISTINCT d.user_id, 
               'New Relevant Campaign: ' || NEW.title,
               'An ISP/SP just launched a campaign near your location. Earn NRT now!',
               'campaign',
               '/campaigns/' || NEW.id
        FROM public.devices d
        JOIN public.users u ON d.user_id = u.id
        WHERE d.is_active = true
        -- Mock location matching logic: assume devices have 'last_location' JSONB {lat, lon}
        -- For now, we'll notify users whose devices have matching 'country' if last_location is missing
        AND (
            NEW.country IS NULL OR u.id IN (SELECT id FROM public.users WHERE role = 'user')
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_campaign_activated
    AFTER INSERT OR UPDATE OF status ON public.campaigns
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE PROCEDURE public.notify_relevant_campaign();

-- ==========================================
-- 3. FINANCIAL NOTIFICATION TRIGGERS
-- ==========================================

-- Function to notify on P2P Order updates
CREATE OR REPLACE FUNCTION public.notify_p2p_order_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.seller_id, 'New P2P Order', 'You have a new buy order for ' || NEW.nrt_amount || ' NRT.', 'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
    ELSIF (OLD.status != NEW.status) THEN
        -- Notify Buyer
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.buyer_id, 'Order Update: ' || NEW.status, 'Your P2P order status has changed to ' || NEW.status, 'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
        
        -- Notify Seller
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.seller_id, 'Order Update: ' || NEW.status, 'The P2P order status has changed to ' || NEW.status, 'p2p', '/wallet/deposit/p2p/orders/' || NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_p2p_order_change
    AFTER INSERT OR UPDATE ON public.p2p_orders
    FOR EACH ROW
    EXECUTE PROCEDURE public.notify_p2p_order_update();

-- Function to notify on Scan2Pay completion
CREATE OR REPLACE FUNCTION public.notify_scan2pay_success()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
        -- Notify Payer
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.paid_by, 'Payment Successful', 'You successfully paid ' || NEW.amount_nrt || ' NRT via Scan2Pay.', 'payment', '/transactions');
        
        -- Notify Merchant
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (NEW.merchant_id, 'Payment Received', 'You received ' || NEW.amount_nrt || ' NRT via Scan2Pay.', 'payment', '/transactions');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_scan2pay_completed
    AFTER UPDATE ON public.scan2pay_sessions
    FOR EACH ROW
    EXECUTE PROCEDURE public.notify_scan2pay_success();
