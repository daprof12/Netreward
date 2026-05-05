-- KYC Submissions Migration for NetReward
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Created: 2026

-- ==========================================
-- KYC Submissions Table
-- ==========================================

DO $$ BEGIN
    CREATE TYPE kyc_submission_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.kyc_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Target role being requested
    target_role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'sp' | 'isp'
    
    -- Personal Liveness (all roles)
    selfie_instruction_1 TEXT DEFAULT 'turn_head',   -- metadata for audit
    selfie_instruction_2 TEXT DEFAULT 'open_mouth',
    selfie_instruction_3 TEXT DEFAULT 'rotate_head',
    selfie_url TEXT,          -- photo captured during liveness check
    
    -- Personal Document (all roles)
    id_doc_type TEXT,         -- 'passport' | 'drivers_license' | 'national_id'
    id_doc_url TEXT,          -- front of government ID
    
    -- Business fields (SP and ISP only)
    business_name TEXT,
    website TEXT,
    business_email TEXT,
    phone_number TEXT,
    business_address TEXT,
    biz_reg_url TEXT,         -- Business Registration document
    logo_url TEXT,            -- Company Logo
    
    -- ISP only
    isp_license_url TEXT,     -- Telecom Authority License
    
    -- Submission metadata
    status kyc_submission_status DEFAULT 'pending',
    admin_note TEXT,          -- rejection reason or approval note
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER kyc_submissions_updated_at
    BEFORE UPDATE ON public.kyc_submissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- RLS Policies
-- ==========================================

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own kyc submissions"
    ON public.kyc_submissions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can submit kyc"
    ON public.kyc_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role (used by admin) can manage all
CREATE POLICY "Admins can view all kyc submissions"
    ON public.kyc_submissions FOR ALL
    USING (true);

-- ==========================================
-- Update users table: add kyc_status column
-- ==========================================

ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'none'; 
    -- 'none' | 'pending' | 'verified' | 'rejected'

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS kyc_submissions_user_id_idx ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS kyc_submissions_status_idx ON public.kyc_submissions(status);
