-- Migration: Fix Admin RLS Recursion and Wallet Access
-- Created: 2026-05-02

-- 1. Redefine is_admin() to be more robust and avoid recursion
-- We use SECURITY DEFINER so it runs as the owner (postgres), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This query runs as the function owner (postgres), which bypasses RLS on public.users
  -- This is the key to breaking the recursion loop
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Add explicit Admin policies for core tables
-- CRITICAL: Use the is_admin() function here, NOT a subquery on the users table.

-- Users
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
CREATE POLICY "Admin can view all users" ON public.users FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin can update all users" ON public.users;
CREATE POLICY "Admin can update all users" ON public.users FOR UPDATE USING (is_admin());

-- Wallets
DROP POLICY IF EXISTS "Admin can view all wallets" ON public.wallets;
CREATE POLICY "Admin can view all wallets" ON public.wallets FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admin can update all wallets" ON public.wallets;
CREATE POLICY "Admin can update all wallets" ON public.wallets FOR ALL USING (is_admin());

-- Transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (is_admin());

-- Withdrawal Requests
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can manage withdrawal requests" ON public.withdrawal_requests;
CREATE POLICY "Admins can manage withdrawal requests" ON public.withdrawal_requests FOR UPDATE USING (is_admin());

-- Payment Methods
DROP POLICY IF EXISTS "Admins can view all payment methods" ON public.user_payment_methods;
CREATE POLICY "Admins can view all payment methods" ON public.user_payment_methods FOR SELECT USING (is_admin());

-- Profiles
DROP POLICY IF EXISTS "Admins can view all sp_profiles" ON public.sp_profiles;
CREATE POLICY "Admins can view all sp_profiles" ON public.sp_profiles FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "Admins can view all isp_profiles" ON public.isp_profiles;
CREATE POLICY "Admins can view all isp_profiles" ON public.isp_profiles FOR SELECT USING (is_admin());

-- 4. Enable RLS (Ensure they are enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.isp_profiles ENABLE ROW LEVEL SECURITY;


