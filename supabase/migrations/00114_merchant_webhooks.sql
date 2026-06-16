-- Migration: Trigger Merchant Webhook Dispatcher
-- Uses pg_net to call the dispatch-merchant-webhook Edge Function when a scan2pay checkout completes.

-- Note: In local Supabase development or hosted Supabase, pg_net is available.
-- We must make an HTTP POST request to the local or remote Edge Function.
-- We use a trigger that passes the old and new record to the Edge Function payload.

CREATE OR REPLACE FUNCTION public.trigger_merchant_webhook()
RETURNS TRIGGER AS $$
DECLARE
    v_url TEXT;
BEGIN
    -- We'll try to find the edge function URL
    -- In production, you might set an environment variable or use a constant.
    -- Assuming local development fallback:
    v_url := current_setting('custom.edge_function_url', true);
    IF v_url IS NULL OR v_url = '' THEN
        -- Fallback to typical local URL
        v_url := 'http://kong:8000/functions/v1/dispatch-merchant-webhook';
    END IF;

    -- Send POST request to Edge Function without blocking the transaction
    PERFORM net.http_post(
        url := v_url,
        body := jsonb_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'record', row_to_json(NEW),
            'old_record', row_to_json(OLD)
        ),
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer anon"}'::jsonb
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to scan2pay_sessions
DROP TRIGGER IF EXISTS on_scan2pay_completed_webhook ON public.scan2pay_sessions;
CREATE TRIGGER on_scan2pay_completed_webhook
    AFTER UPDATE ON public.scan2pay_sessions
    FOR EACH ROW
    -- Only fire when status changes to completed
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
    EXECUTE PROCEDURE public.trigger_merchant_webhook();
