-- Phase 9: Comprehensive Row Level Security (RLS) Enforcement
-- Created: 2026

-- ==========================================
-- 1. UTILITY FUNCTIONS
-- ==========================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 2. ENABLE RLS ON ALL TABLES
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.isp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan2pay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. DROP EXISTING POLICIES (Idempotency)
-- ==========================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ==========================================
-- 4. USERS & PROFILES
-- ==========================================

-- Users
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Profiles
CREATE POLICY "Users can view own sp_profile" ON public.sp_profiles FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can manage own sp_profile" ON public.sp_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own isp_profile" ON public.isp_profiles FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can manage own isp_profile" ON public.isp_profiles FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 5. SERVICES, NETWORKS & CAMPAIGNS
-- ==========================================

-- Services
CREATE POLICY "Anyone can view verified services" ON public.services FOR SELECT USING (verified = true OR status = 'active' OR sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()));
CREATE POLICY "SPs can manage own services" ON public.services FOR ALL USING (sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()));

-- Networks
CREATE POLICY "Anyone can view verified networks" ON public.networks FOR SELECT USING (verified = true OR isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()));
CREATE POLICY "ISPs can manage own networks" ON public.networks FOR ALL USING (isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid()));

-- Campaigns
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "Owners can manage own campaigns" ON public.campaigns FOR ALL USING (
    sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid()) OR
    isp_id IN (SELECT id FROM public.isp_profiles WHERE user_id = auth.uid())
);

-- ==========================================
-- 6. WALLETS & TRANSACTIONS
-- ==========================================

-- Wallets
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()) OR is_admin()
);

-- ==========================================
-- 7. P2P & PAYMENTS
-- ==========================================

-- P2P Offers
CREATE POLICY "Anyone can view active p2p offers" ON public.p2p_offers FOR SELECT USING (status = 'active');
CREATE POLICY "Users can manage own p2p offers" ON public.p2p_offers FOR ALL USING (auth.uid() = user_id);

-- P2P Orders
CREATE POLICY "Participants or admins can view p2p orders" ON public.p2p_orders FOR SELECT USING (
    auth.uid() = seller_id OR auth.uid() = buyer_id OR is_admin()
);
CREATE POLICY "Participants can update p2p orders" ON public.p2p_orders FOR UPDATE USING (
    auth.uid() = seller_id OR auth.uid() = buyer_id
);

-- Payment Accounts
CREATE POLICY "Users can manage own payment accounts" ON public.payment_accounts FOR ALL USING (auth.uid() = user_id);

-- Scan2Pay
CREATE POLICY "Merchants or payers can view sessions" ON public.scan2pay_sessions FOR SELECT USING (
    auth.uid() = merchant_id OR auth.uid() = paid_by OR status = 'pending'
);
CREATE POLICY "Merchants can manage own sessions" ON public.scan2pay_sessions FOR ALL USING (auth.uid() = merchant_id);

-- ==========================================
-- 8. SYSTEM & ADMIN
-- ==========================================

-- KYC Submissions
CREATE POLICY "Users can view own kyc" ON public.kyc_submissions FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can submit kyc" ON public.kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all kyc" ON public.kyc_submissions FOR ALL USING (is_admin());

-- Devices
CREATE POLICY "Users can manage own devices" ON public.devices FOR ALL USING (auth.uid() = user_id);

-- Admin Global Access
-- Note: Already covered in most policies via OR is_admin()
