-- Migration: 00110_tracking_batch_processing.sql
-- Description: Introduces a batch-processing RPC to drastically reduce database network round-trips when logging tracking events.

CREATE OR REPLACE FUNCTION public.process_tracking_batch(p_events JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event JSONB;
    v_result JSONB;
    v_results JSONB := '[]'::jsonb;
BEGIN
    -- Validate input
    IF jsonb_typeof(p_events) != 'array' THEN
        RAISE EXCEPTION 'Input must be a JSON array';
    END IF;

    -- Process each event inside the single database transaction
    FOR v_event IN SELECT * FROM jsonb_array_elements(p_events)
    LOOP
        -- We deliberately wrap the individual call in a sub-block so a failure
        -- in one event doesn't necessarily rollback the whole batch, 
        -- OR we just let it rollback if we prefer atomic batches.
        -- Given telemetry data, atomic batches are safer to retry.
        
        v_result := public.process_tracking_report(
            (v_event->>'device_id')::UUID,
            (v_event->>'campaign_id')::UUID,
            (v_event->>'session_id')::TEXT,
            (v_event->>'bytes_up')::BIGINT,
            (v_event->>'bytes_down')::BIGINT,
            (v_event->>'duration_seconds')::INTEGER,
            (v_event->>'session_start')::TIMESTAMPTZ,
            (v_event->>'session_end')::TIMESTAMPTZ,
            v_event->>'gaming_platform'
        );
        
        -- Inject the original reference data so the Edge Function can use it
        -- to construct the `tracking_sessions` log safely.
        v_result := v_result || jsonb_build_object(
            'req_device_fingerprint', v_event->>'req_device_fingerprint',
            'req_campaign_id', v_event->>'req_campaign_id'
        );

        v_results := v_results || jsonb_build_array(v_result);
    END LOOP;
    
    RETURN v_results;
END;
$$;
