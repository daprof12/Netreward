-- Migration: Gaming Accounts + Console Device Type
-- Created: 2026-05-20

-- ─── 1. Gaming Accounts Table ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gaming_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN (
        'playstation', 'xbox', 'steam', 'oculus_vr', 'nintendo_switch', 'android', 'ios'
    )),
    platform_username TEXT NOT NULL,
    display_name TEXT,
    verified BOOLEAN DEFAULT false,
    linked_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, platform)
);

-- ─── 2. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.gaming_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own gaming accounts
DROP POLICY IF EXISTS "Users can view own gaming accounts" ON public.gaming_accounts;
CREATE POLICY "Users can view own gaming accounts"
    ON public.gaming_accounts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own gaming accounts" ON public.gaming_accounts;
CREATE POLICY "Users can insert own gaming accounts"
    ON public.gaming_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own gaming accounts" ON public.gaming_accounts;
CREATE POLICY "Users can update own gaming accounts"
    ON public.gaming_accounts FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own gaming accounts" ON public.gaming_accounts;
CREATE POLICY "Users can delete own gaming accounts"
    ON public.gaming_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view all gaming accounts
DROP POLICY IF EXISTS "Admins can view all gaming accounts" ON public.gaming_accounts;
CREATE POLICY "Admins can view all gaming accounts"
    ON public.gaming_accounts FOR SELECT
    USING (is_admin());

-- SP can read gaming accounts (to match platform IDs to NRT users via campaigns)
DROP POLICY IF EXISTS "SP can view gaming accounts for their campaigns" ON public.gaming_accounts;
CREATE POLICY "SP can view gaming accounts for their campaigns"
    ON public.gaming_accounts FOR SELECT
    USING (
        user_id IN (
            SELECT uc.user_id FROM public.user_campaigns uc
            JOIN public.campaigns c ON uc.campaign_id = c.id
            JOIN public.sp_profiles sp ON c.sp_id = sp.id
            WHERE sp.user_id = auth.uid()
        )
    );

-- ─── 3. Triggers ────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_gaming_accounts_modtime ON public.gaming_accounts;
CREATE TRIGGER update_gaming_accounts_modtime
    BEFORE UPDATE ON public.gaming_accounts
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─── 4. Extend devices.device_type to support 'console' ────────────────────
-- Drop and recreate the CHECK constraint to add 'console' as a valid type

ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_device_type_check;
ALTER TABLE public.devices ADD CONSTRAINT devices_device_type_check
    CHECK (device_type IN ('phone', 'laptop', 'tablet', 'desktop', 'console', 'other'));

-- ─── 5. Add gaming platform URL columns to services ─────────────────────────
-- When a service category is 'Gaming', these store the console/platform listing URLs

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS playstation_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS xbox_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS steam_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS oculus_url TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS nintendo_url TEXT;
