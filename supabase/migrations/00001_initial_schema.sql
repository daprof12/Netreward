-- Initial Schema Migration for NetReward
-- Created: 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('user', 'sp', 'isp', 'admin');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE transaction_type AS ENUM ('reward', 'withdrawal', 'deposit', 'fee');

-- ==========================================
-- 2. TABLES
-- ==========================================

-- USERS TABLE
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'user'::user_role,
    display_name TEXT,
    avatar_url TEXT,
    kyc_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- WALLETS TABLE (Internal Ledger / Solana Mapping)
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    solana_public_key TEXT UNIQUE,
    nrt_balance NUMERIC(18, 6) DEFAULT 0.000000,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- SP PROFILES
CREATE TABLE public.sp_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    company_name TEXT NOT NULL,
    industry TEXT,
    total_budget_nrt NUMERIC(18, 6) DEFAULT 0.000000,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ISP PROFILES
CREATE TABLE public.isp_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    isp_name TEXT NOT NULL,
    region TEXT,
    nhs_score INTEGER DEFAULT 80 CHECK (nhs_score >= 0 AND nhs_score <= 100),
    total_revenue_nrt NUMERIC(18, 6) DEFAULT 0.000000,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- CAMPAIGNS
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sp_id UUID REFERENCES public.sp_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_app TEXT NOT NULL,
    reward_rate_per_gb NUMERIC(18, 6) NOT NULL,
    total_budget NUMERIC(18, 6) NOT NULL,
    budget_spent NUMERIC(18, 6) DEFAULT 0.000000,
    status campaign_status DEFAULT 'draft'::campaign_status,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- USER CAMPAIGN ENROLLMENT
CREATE TABLE public.user_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    data_consumed_gb NUMERIC(10, 4) DEFAULT 0.0000,
    nrt_earned NUMERIC(18, 6) DEFAULT 0.000000,
    status TEXT DEFAULT 'active',
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, campaign_id)
);

-- TRANSACTIONS LEDGER
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount NUMERIC(18, 6) NOT NULL,
    tx_type transaction_type NOT NULL,
    description TEXT,
    blockchain_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.isp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Wallets
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- Campaigns (Public read for active campaigns, SP read/write for own)
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "SP can manage own campaigns" ON public.campaigns FOR ALL USING (
    sp_id IN (SELECT id FROM public.sp_profiles WHERE user_id = auth.uid())
);

-- User Campaigns
CREATE POLICY "Users can view own enrollments" ON public.user_campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll themselves" ON public.user_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

-- ==========================================
-- 4. TRIGGERS
-- ==========================================
-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_wallets_modtime BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_campaigns_modtime BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
