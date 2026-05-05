-- Migration: Fix Campaign Notification Trigger
-- Description: Updates the notify_relevant_campaign function to use 'status' instead of 'is_active'.

CREATE OR REPLACE FUNCTION public.notify_relevant_campaign()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_location RECORD;
BEGIN
    -- Only notify if the campaign is active
    IF NEW.status != 'active' THEN
        RETURN NEW;
    END IF;

    -- For each target location in the campaign
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
        WHERE d.status = 'active' -- FIXED: Using 'status' instead of 'is_active'
        -- Check preference: Campaign notifications must be enabled
        AND (u.notification_preferences->'types'->>'campaign')::BOOLEAN = true
        AND (
            NEW.country IS NULL OR u.id IN (SELECT id FROM public.users WHERE role = 'user')
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
