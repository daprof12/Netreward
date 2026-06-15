-- Migration: System Backups Table
-- Description: Creates a table to store system backup records.

CREATE TABLE IF NOT EXISTS public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_id TEXT NOT NULL UNIQUE,
    size_mb NUMERIC NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system backups" ON public.system_backups
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Insert some dummy initial backups to seed the table
INSERT INTO public.system_backups (backup_id, size_mb, status, created_at) VALUES
    ('bk_1', 245, 'completed', now() - interval '2 days'),
    ('bk_2', 243, 'completed', now() - interval '3 days'),
    ('bk_3', 241, 'completed', now() - interval '4 days')
ON CONFLICT (backup_id) DO NOTHING;
