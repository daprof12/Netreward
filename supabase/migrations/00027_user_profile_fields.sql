-- Migration: User Profile Fields & Role Switching (Phase H)
-- Created: 2026-05-01

-- ==========================================
-- 1. Add phone column
-- ==========================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- ==========================================
-- 2. RPC: Switch User Role
-- ==========================================
-- This function allows users to switch their role safely.
-- It prevents self-promotion to 'admin'.
CREATE OR REPLACE FUNCTION switch_user_role(new_role text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_current_role user_role;
BEGIN
    -- Get caller ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate new role
    IF new_role NOT IN ('user', 'sp', 'isp') THEN
        RAISE EXCEPTION 'Invalid role selection';
    END IF;

    -- Get current role
    SELECT role INTO v_current_role FROM public.users WHERE id = v_user_id;

    -- Prevent current admins from accidentally downgrading themselves or being manipulated
    IF v_current_role = 'admin' THEN
        RAISE EXCEPTION 'Admins cannot change their role via this method';
    END IF;

    -- Update role
    UPDATE public.users
    SET role = new_role::user_role,
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_role', new_role
    );
END;
$$;
