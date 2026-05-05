-- View for KYC Submissions with User Details
-- Created: 2026

CREATE OR REPLACE VIEW public.kyc_view AS
SELECT 
    ks.*,
    u.email as user_email,
    u.display_name as user_display_name
FROM 
    public.kyc_submissions ks
LEFT JOIN 
    public.users u ON ks.user_id = u.id;

-- Ensure RLS doesn't block the view if it's based on restricted tables
-- Views in Postgres don't have RLS themselves, but the underlying tables do.
-- However, we can use SECURITY DEFINER if needed.
