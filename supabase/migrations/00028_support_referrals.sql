-- Migration: Support Tickets & Referrals
-- Created: 2026-05-01

-- ==========================================
-- 1. Support Tickets
-- ==========================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" ON public.support_tickets
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create tickets" ON public.support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_support_tickets_modtime
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- 2. Ticket Messages (for replies)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages on own tickets" ON public.ticket_messages
    FOR SELECT USING (
        ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can add messages to own tickets" ON public.ticket_messages
    FOR INSERT WITH CHECK (
        ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    );

-- ==========================================
-- 3. Referrals
-- ==========================================
-- Add referral_code and referred_by to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

-- Auto-generate referral codes for existing users (use last 8 chars for uniqueness)
UPDATE public.users
SET referral_code = 'NR-' || UPPER(RIGHT(REPLACE(id::text, '-', ''), 8))
WHERE referral_code IS NULL;

-- Referral rewards tracking
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reward_nrt NUMERIC(18, 6) DEFAULT 5.000000,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(referrer_id, referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referrals
    FOR SELECT USING (referrer_id = auth.uid());
