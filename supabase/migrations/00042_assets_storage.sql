-- Migration 00042: Assets Storage Bucket
-- Creates a public 'assets' bucket for application images, logos, etc.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  10485760,  -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read for all assets
CREATE POLICY "Public read for assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Storage RLS: Only admins can upload/modify assets
CREATE POLICY "Admins can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets' AND
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assets' AND
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins can delete assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets' AND
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);


