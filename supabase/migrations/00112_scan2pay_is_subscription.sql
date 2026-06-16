-- Migration: Add is_subscription to scan2pay_sessions

ALTER TABLE public.scan2pay_sessions 
ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;

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
    -- Only process if status changed to completed, paid_by is set, and it IS a subscription payment
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.paid_by IS NOT NULL AND NEW.is_subscription = true THEN
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
