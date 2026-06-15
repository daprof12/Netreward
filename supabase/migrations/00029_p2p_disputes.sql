-- Migration: P2P Disputes
-- Created: 2026-05-01

-- ==========================================
-- 1. P2P Disputes
-- ==========================================
DROP TABLE IF EXISTS public.p2p_disputes CASCADE;

CREATE TABLE IF NOT EXISTS public.p2p_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    trade_id TEXT NOT NULL,
    category TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
    evidence_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.p2p_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own disputes" ON public.p2p_disputes
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create disputes" ON public.p2p_disputes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_p2p_disputes_modtime
    BEFORE UPDATE ON public.p2p_disputes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- 2. Dispute Messages
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dispute_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_id UUID REFERENCES public.p2p_disputes(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'counterparty')),
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages on own disputes" ON public.dispute_messages
    FOR SELECT USING (
        dispute_id IN (SELECT id FROM public.p2p_disputes WHERE user_id = auth.uid())
    );
CREATE POLICY "Users can add messages to own disputes" ON public.dispute_messages
    FOR INSERT WITH CHECK (
        dispute_id IN (SELECT id FROM public.p2p_disputes WHERE user_id = auth.uid())
    );
