-- Phase 9: Wallet & P2P Persistence
-- Created: 2026

-- ==========================================
-- 1. EXTEND ENUMS
-- ==========================================
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'p2p';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'scan2pay';

-- ==========================================
-- 2. P2P MARKETPLACE
-- ==========================================

-- P2P OFFERS (Listings)
CREATE TABLE IF NOT EXISTS public.p2p_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    nrt_amount NUMERIC(18, 6) NOT NULL,
    price_per_nrt NUMERIC(10, 6) NOT NULL,
    min_limit NUMERIC(18, 6),
    max_limit NUMERIC(18, 6),
    payment_methods TEXT[] NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'completed'
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- P2P ORDERS (Trades)
CREATE TABLE IF NOT EXISTS public.p2p_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID REFERENCES public.p2p_offers(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    nrt_amount NUMERIC(18, 6) NOT NULL,
    fiat_amount NUMERIC(18, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'completed', 'disputed', 'cancelled'
    proof_url TEXT,
    escrow_locked BOOLEAN DEFAULT false,
    has_dispute BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. PAYMENT ACCOUNTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.payment_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'Bank Transfer', 'Mobile Money', etc.
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 4. SCAN2PAY SESSIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.scan2pay_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount_nrt NUMERIC(18, 6) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'cancelled'
    expires_at TIMESTAMPTZ NOT NULL,
    paid_by UUID REFERENCES public.users(id),
    transaction_id UUID REFERENCES public.transactions(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 5. DEVICES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'mobile', 'desktop', 'tablet'
    mac_address TEXT,
    last_location JSONB, -- { "lat": 6.5244, "lon": 3.3792 }
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 6. RLS POLICIES
-- ==========================================

ALTER TABLE public.p2p_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan2pay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- P2P Offers: Anyone can view active, owner can manage
CREATE POLICY "Anyone can view active p2p offers" ON public.p2p_offers FOR SELECT USING (status = 'active');
CREATE POLICY "Users can manage own p2p offers" ON public.p2p_offers FOR ALL USING (auth.uid() = user_id);

-- P2P Orders: Involved parties or admins can view/update
CREATE POLICY "Participants can view own p2p orders" ON public.p2p_orders FOR SELECT 
USING (auth.uid() = seller_id OR auth.uid() = buyer_id OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Participants can update own p2p orders" ON public.p2p_orders FOR UPDATE
USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- Payment Accounts: Owner only
CREATE POLICY "Users can manage own payment accounts" ON public.payment_accounts FOR ALL USING (auth.uid() = user_id);

-- Scan2Pay: Merchant can view/manage, anyone can view pending by ID
CREATE POLICY "Merchants can view own scan2pay sessions" ON public.scan2pay_sessions FOR SELECT USING (auth.uid() = merchant_id);
CREATE POLICY "Anyone can view scan2pay session by id" ON public.scan2pay_sessions FOR SELECT USING (status = 'pending');

-- Devices: Owner only
CREATE POLICY "Users can manage own devices" ON public.devices FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 7. TRIGGERS
-- ==========================================
CREATE TRIGGER update_p2p_offers_modtime BEFORE UPDATE ON public.p2p_offers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_p2p_orders_modtime BEFORE UPDATE ON public.p2p_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payment_accounts_modtime BEFORE UPDATE ON public.payment_accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
