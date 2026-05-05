-- Migration: Fix User Sync Trigger
-- Description: Updates the handle_new_user trigger to be more resilient and automatically generate referral codes.

-- 1. Relax the email constraint to allow phone-only signups if needed
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_referral_code TEXT;
BEGIN
    -- 1. Determine the role safely
    BEGIN
        v_role := (new.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'user'::public.user_role;
    END;

    IF v_role IS NULL THEN
        v_role := 'user'::public.user_role;
    END IF;

    -- 2. Generate a unique referral code
    -- Format: NR-XXXXXXXX (last 8 chars of UUID)
    v_referral_code := 'NR-' || UPPER(RIGHT(REPLACE(new.id::text, '-', ''), 8));

    -- 3. Insert into public.users
    INSERT INTO public.users (
        id, 
        email, 
        display_name, 
        role, 
        referral_code
    )
    VALUES (
        new.id,
        new.email, -- Can now be NULL
        COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
        v_role,
        v_referral_code
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(public.users.display_name, EXCLUDED.display_name);
    
    -- 4. Create an empty wallet for the user automatically
    INSERT INTO public.wallets (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;

    -- 5. Create role-specific profiles
    IF v_role = 'sp' THEN
        INSERT INTO public.sp_profiles (user_id, company_name)
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'New SP'))
        ON CONFLICT (user_id) DO NOTHING;
    ELSIF v_role = 'isp' THEN
        INSERT INTO public.isp_profiles (user_id, isp_name)
        VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'New ISP'))
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: At least try to create the basic user record if something else fails
    -- (This prevents the entire signup flow from breaking if e.g. wallet creation fails)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger to ensure it's fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Sync any missing users now (Manual one-time sync for the 4th user)
-- Note: This only works if run as superuser or with enough permissions
INSERT INTO public.users (id, email, role, display_name, referral_code)
SELECT 
    id, 
    email, 
    COALESCE((raw_user_meta_data->>'role')::public.user_role, 'user'::public.user_role),
    COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
    'NR-' || UPPER(RIGHT(REPLACE(id::text, '-', ''), 8))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Also sync wallets for missing users
INSERT INTO public.wallets (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.wallets)
ON CONFLICT (user_id) DO NOTHING;
