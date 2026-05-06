-- ============================================================
-- 00072: User Multi-Role & Active Role Tracking
-- ============================================================

-- 1. Add role flags and active role tracking
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS active_role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_sp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_isp BOOLEAN DEFAULT false;

-- 2. Backfill existing roles to the new flags
UPDATE public.users SET is_sp = true WHERE role = 'sp';
UPDATE public.users SET is_isp = true WHERE role = 'isp';
UPDATE public.users SET active_role = role WHERE active_role IS NULL;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_active_role ON public.users(active_role);
