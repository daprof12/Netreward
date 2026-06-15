-- Migration: DevOps Optimizations & GDPR Compliance
-- Created: 2026-06-13
-- Details: Adds hot-path indexes for tracking scalability and RPCs for GDPR compliance (export/delete).

-- =============================================
-- 1. Scalability Indexes (Hot Paths)
-- =============================================

-- Index for retrieving sessions by campaign and date (used heavily in processing and charts)
CREATE INDEX IF NOT EXISTS idx_device_data_sessions_campaign_end 
    ON public.device_data_sessions(campaign_id, session_end DESC);

-- Index for fast user campaign lookup (used by tracking function)
CREATE INDEX IF NOT EXISTS idx_user_campaigns_user_id 
    ON public.user_campaigns(user_id);

-- Index for resolving devices by fingerprint
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint 
    ON public.devices(fingerprint);

-- Index for tracking sessions (for cleanups/archiving)
CREATE INDEX IF NOT EXISTS idx_tracking_sessions_created 
    ON public.tracking_sessions(created_at DESC);


-- =============================================
-- 2. GDPR Compliance: Data Export (Right to Access)
-- =============================================

CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile JSONB;
    v_devices JSONB;
    v_sessions JSONB;
    v_wallets JSONB;
    v_transactions JSONB;
BEGIN
    -- Check caller auth
    IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Can only export your own data';
    END IF;

    -- Fetch user profile
    SELECT row_to_json(u)::jsonb INTO v_profile
    FROM public.users u WHERE id = p_user_id;

    -- Fetch devices
    SELECT jsonb_agg(row_to_json(d)) INTO v_devices
    FROM public.devices d WHERE user_id = p_user_id;

    -- Fetch top 100 recent sessions
    SELECT jsonb_agg(row_to_json(s)) INTO v_sessions
    FROM (
        SELECT session_id, bytes_up, bytes_down, duration_seconds, session_start, session_end, verified
        FROM public.device_data_sessions
        WHERE device_id IN (SELECT id FROM public.devices WHERE user_id = p_user_id)
        ORDER BY session_end DESC
        LIMIT 100
    ) s;

    -- Fetch wallet
    SELECT jsonb_agg(row_to_json(w)) INTO v_wallets
    FROM public.wallets w WHERE user_id = p_user_id;

    -- Fetch recent transactions
    SELECT jsonb_agg(row_to_json(t)) INTO v_transactions
    FROM (
        SELECT amount, currency, tx_type, status, description, created_at
        FROM public.transactions
        WHERE user_id = p_user_id OR wallet_id IN (SELECT id FROM public.wallets WHERE user_id = p_user_id)
        ORDER BY created_at DESC
        LIMIT 100
    ) t;

    RETURN jsonb_build_object(
        'profile', COALESCE(v_profile, '{}'::jsonb),
        'devices', COALESCE(v_devices, '[]'::jsonb),
        'sessions', COALESCE(v_sessions, '[]'::jsonb),
        'wallets', COALESCE(v_wallets, '[]'::jsonb),
        'transactions', COALESCE(v_transactions, '[]'::jsonb),
        'exported_at', now()
    );
END;
$$;


-- =============================================
-- 3. GDPR Compliance: Data Deletion (Right to Erasure)
-- =============================================

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check caller auth
    IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Can only delete your own data';
    END IF;

    -- Instead of hard deleting immediately (which breaks foreign keys and accounting),
    -- we anonymize the PII data. 
    -- NRT balances and aggregate usage data remain for network consistency.

    -- 1. Anonymize user profile
    UPDATE public.users 
    SET email = 'deleted_' || id || '@anonymized.netreward',
        first_name = 'Deleted',
        last_name = 'User',
        phone_number = NULL,
        is_kyc_verified = false,
        kyc_level = 0,
        banned = true,
        updated_at = now()
    WHERE id = p_user_id;

    -- 2. Anonymize Devices (keep the data sessions for campaign stats, but scrub the device)
    UPDATE public.devices
    SET name = 'Deleted Device',
        fingerprint = NULL,
        isp_name = 'Unknown',
        ip_address = NULL
    WHERE user_id = p_user_id;

    -- 3. Clear auth user (requires external call to auth.users, but we can't do that safely from here easily, 
    -- so this RPC assumes the edge function or client will subsequently call auth api to delete)

    RETURN TRUE;
END;
$$;
