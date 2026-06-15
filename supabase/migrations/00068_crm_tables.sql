-- Phase 10: CRM & Audits Enhancements
-- Created: 2026

-- ==========================================
-- 1. CRM COMMUNICATIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.crm_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    target_role TEXT, -- if null and target_user_id null, it's 'All Users'
    type TEXT NOT NULL, 
    channels TEXT[] NOT NULL, 
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage crm_communications" ON public.crm_communications USING (true) WITH CHECK (true);

-- ==========================================
-- 2. USER AUDITS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'open',
    reason TEXT NOT NULL,
    report_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage user_audits" ON public.user_audits USING (true) WITH CHECK (true);

-- ==========================================
-- 3. CRM LEADS (Marketing for SP/ISP)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    target_role TEXT NOT NULL, -- 'sp' or 'isp'
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'in_negotiation', 'converted', 'lost'
    assigned_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage crm_leads" ON public.crm_leads USING (true) WITH CHECK (true);

-- Notify trigger for updated_at
CREATE OR REPLACE FUNCTION update_crm_leads_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crm_leads_modtime
    BEFORE UPDATE ON public.crm_leads
    FOR EACH ROW EXECUTE PROCEDURE update_crm_leads_modtime();

CREATE OR REPLACE FUNCTION update_user_audits_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_audits_modtime
    BEFORE UPDATE ON public.user_audits
    FOR EACH ROW EXECUTE PROCEDURE update_user_audits_modtime();
