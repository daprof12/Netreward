-- Migration: Add 'web' platform to gaming_accounts check constraint
-- Description: Allows users to link their web/browser game accounts.

ALTER TABLE public.gaming_accounts 
  DROP CONSTRAINT IF EXISTS gaming_accounts_platform_check;

ALTER TABLE public.gaming_accounts 
  ADD CONSTRAINT gaming_accounts_platform_check 
  CHECK (platform IN ('playstation', 'xbox', 'steam', 'oculus_vr', 'nintendo_switch', 'android', 'ios', 'web'));
