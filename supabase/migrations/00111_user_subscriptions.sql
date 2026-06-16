-- Migration: User Subscriptions

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    network_id UUID REFERENCES public.networks(id) ON DELETE SET NULL,
    merchant_name TEXT NOT NULL,
    merchant_logo TEXT,
    category TEXT NOT NULL,
    merchant_type TEXT NOT NULL CHECK (merchant_type IN ('sp', 'isp')),
    auto_renew BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    last_payment_at TIMESTAMPTZ,
    next_renewal_at TIMESTAMPTZ,
    amount_nrt NUMERIC(18, 6),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure a user only has one active subscription per service or network
CREATE UNIQUE INDEX user_service_sub_idx ON public.user_subscriptions(user_id, service_id) WHERE service_id IS NOT NULL;
CREATE UNIQUE INDEX user_network_sub_idx ON public.user_subscriptions(user_id, network_id) WHERE network_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" 
ON public.user_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Merchants can view subscriptions to their services" 
ON public.user_subscriptions FOR SELECT 
USING (auth.uid() = merchant_id);

CREATE POLICY "Users can update own subscriptions" 
ON public.user_subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_subscriptions_modtime 
BEFORE UPDATE ON public.user_subscriptions 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to auto-create or update subscription on scan2pay completion
CREATE OR REPLACE FUNCTION public.handle_scan2pay_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_merchant_role TEXT;
    v_merchant_name TEXT;
    v_merchant_logo TEXT;
    v_category TEXT;
    v_service_id UUID;
    v_network_id UUID;
    v_existing_sub_id UUID;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.paid_by IS NOT NULL THEN
        -- Determine if merchant is SP or ISP
        SELECT role INTO v_merchant_role FROM public.users WHERE id = NEW.merchant_id;
        
        IF v_merchant_role = 'sp' THEN
            -- Get SP details
            SELECT id, name, category, logo_url INTO v_service_id, v_merchant_name, v_category, v_merchant_logo 
            FROM public.services 
            WHERE sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = NEW.merchant_id)
            LIMIT 1;
            
            IF v_service_id IS NOT NULL THEN
                -- Check if subscription already exists
                SELECT id INTO v_existing_sub_id FROM public.user_subscriptions WHERE user_id = NEW.paid_by AND service_id = v_service_id;
                
                IF v_existing_sub_id IS NOT NULL THEN
                    UPDATE public.user_subscriptions 
                    SET last_payment_at = now(), next_renewal_at = now() + INTERVAL '30 days', amount_nrt = NEW.amount_nrt, status = 'active'
                    WHERE id = v_existing_sub_id;
                ELSE
                    INSERT INTO public.user_subscriptions (
                        user_id, merchant_id, service_id, merchant_name, merchant_logo, category, merchant_type, auto_renew, status, last_payment_at, next_renewal_at, amount_nrt
                    ) VALUES (
                        NEW.paid_by, NEW.merchant_id, v_service_id, v_merchant_name, v_merchant_logo, v_category, 'sp', true, 'active', now(), now() + INTERVAL '30 days', NEW.amount_nrt
                    );
                END IF;
            END IF;
            
        ELSIF v_merchant_role = 'isp' THEN
            -- Get ISP details
            SELECT id, name, category, logo_url INTO v_network_id, v_merchant_name, v_category, v_merchant_logo 
            FROM public.networks 
            WHERE isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = NEW.merchant_id)
            LIMIT 1;
            
            IF v_network_id IS NOT NULL THEN
                -- Check if subscription already exists
                SELECT id INTO v_existing_sub_id FROM public.user_subscriptions WHERE user_id = NEW.paid_by AND network_id = v_network_id;
                
                IF v_existing_sub_id IS NOT NULL THEN
                    UPDATE public.user_subscriptions 
                    SET last_payment_at = now(), next_renewal_at = now() + INTERVAL '30 days', amount_nrt = NEW.amount_nrt, status = 'active'
                    WHERE id = v_existing_sub_id;
                ELSE
                    INSERT INTO public.user_subscriptions (
                        user_id, merchant_id, network_id, merchant_name, merchant_logo, category, merchant_type, auto_renew, status, last_payment_at, next_renewal_at, amount_nrt
                    ) VALUES (
                        NEW.paid_by, NEW.merchant_id, v_network_id, v_merchant_name, v_merchant_logo, v_category, 'isp', true, 'active', now(), now() + INTERVAL '30 days', NEW.amount_nrt
                    );
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to scan2pay_sessions
DROP TRIGGER IF EXISTS on_scan2pay_subscription ON public.scan2pay_sessions;
CREATE TRIGGER on_scan2pay_subscription
    AFTER UPDATE ON public.scan2pay_sessions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_scan2pay_subscription();
