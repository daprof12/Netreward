-- Migration: Add Country to Users
-- Created: 2026-05-02

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';

-- Update existing users to have a default country if needed
UPDATE public.users SET country = 'Nigeria' WHERE country IS NULL OR country = 'Unknown'; -- Assuming Nigeria as a sensible default based on Paystack presence, or keep as 'Unknown'

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country);
