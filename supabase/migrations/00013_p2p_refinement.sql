-- Phase 7: P2P Market Refinement (Disputes & Ratings)
-- Created: 2026

-- ==========================================
-- P2P Seller Ratings & Reviews
-- ==========================================
CREATE TABLE IF NOT EXISTS p2p_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES p2p_orders(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id), -- The seller being rated
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- P2P Dispute Management
-- ==========================================
CREATE TABLE IF NOT EXISTS p2p_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES p2p_orders(id) ON DELETE CASCADE,
    raised_by UUID REFERENCES auth.users(id),
    category TEXT DEFAULT 'other', -- 'payment_not_received', 'wrong_amount', 'unresponsive', 'other'
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[], -- Array of image/doc URLs
    status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'dismissed'
    internal_admin_note TEXT, -- For admin investigation tracking
    resolution TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Update p2p_orders to track if a dispute exists
ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS has_dispute BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE p2p_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Reviews
CREATE POLICY "Anyone can view reviews" ON p2p_reviews
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can leave reviews for their orders" ON p2p_reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = reviewer_id);

-- RLS Policies for Disputes
CREATE POLICY "Users can view their own disputes" ON p2p_disputes
    FOR SELECT TO authenticated
    USING (raised_by = auth.uid() OR EXISTS (
        SELECT 1 FROM p2p_orders WHERE id = order_id AND (seller_id = auth.uid() OR buyer_id = auth.uid())
    ) OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Users can raise disputes" ON p2p_disputes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = raised_by);

CREATE POLICY "Admins can update disputes" ON p2p_disputes
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Trigger for updated_at
CREATE TRIGGER handle_p2p_disputes_updated_at
    BEFORE UPDATE ON p2p_disputes
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
