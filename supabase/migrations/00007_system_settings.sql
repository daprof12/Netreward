-- Migration to create global system settings table

CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sp_cashback_percentage NUMERIC(5, 2) DEFAULT 10.00,
    isp_cashback_percentage NUMERIC(5, 2) DEFAULT 5.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure there is only ever one row in this table
CREATE UNIQUE INDEX system_settings_single_row ON public.system_settings ((true));

-- RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Anyone can read system settings" ON public.system_settings FOR SELECT USING (true);

-- Only admins can update
CREATE POLICY "Admins can update system settings" ON public.system_settings FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Insert default row
INSERT INTO public.system_settings (sp_cashback_percentage, isp_cashback_percentage) VALUES (10.00, 5.00);
