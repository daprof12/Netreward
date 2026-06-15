-- Migration: Per-role KYC status columns
-- Each user role (user, sp, isp) gets its own independent KYC status.
-- This allows a user to be verified as a standard user but rejected as SP/ISP.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS kyc_user_status TEXT DEFAULT 'none' CHECK (kyc_user_status IN ('none','pending','verified','rejected')),
  ADD COLUMN IF NOT EXISTS kyc_sp_status   TEXT DEFAULT 'none' CHECK (kyc_sp_status   IN ('none','pending','verified','rejected')),
  ADD COLUMN IF NOT EXISTS kyc_isp_status  TEXT DEFAULT 'none' CHECK (kyc_isp_status  IN ('none','pending','verified','rejected'));

-- Back-fill: migrate existing kyc_status into kyc_user_status
UPDATE public.users
  SET kyc_user_status = kyc_status
  WHERE kyc_status IN ('pending','verified','rejected');

-- Index for admin dashboard queries
CREATE INDEX IF NOT EXISTS users_kyc_user_status_idx ON public.users(kyc_user_status);
CREATE INDEX IF NOT EXISTS users_kyc_sp_status_idx   ON public.users(kyc_sp_status);
CREATE INDEX IF NOT EXISTS users_kyc_isp_status_idx  ON public.users(kyc_isp_status);
