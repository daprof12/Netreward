-- Migration 00032: Wallet helper RPC + KYC Storage
-- Adds add_nrt_to_wallet RPC for safe deposit crediting
-- Creates kyc-documents storage bucket

-- ─── add_nrt_to_wallet RPC ───────────────────────────────────────────────
-- Atomically adds NRT to a user's wallet (used by InstantPurchase, admin credits, etc.)
CREATE OR REPLACE FUNCTION public.add_nrt_to_wallet(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE public.wallets
  SET nrt_balance = nrt_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING nrt_balance INTO v_new_balance;

  IF NOT FOUND THEN
    -- Create wallet if it doesn't exist
    INSERT INTO public.wallets (user_id, nrt_balance)
    VALUES (p_user_id, p_amount)
    RETURNING nrt_balance INTO v_new_balance;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'new_balance', v_new_balance,
    'amount_added', p_amount
  );
END;
$$;

-- ─── KYC Documents Storage Bucket ────────────────────────────────────────
-- Create the bucket for KYC document uploads (ID docs, selfies, business docs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  true,
  10485760,  -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can upload to their own folder
CREATE POLICY "Users can upload KYC docs to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: Users can view their own docs
CREATE POLICY "Users can view own KYC docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: Public read for admin review (public bucket)
CREATE POLICY "Public read for KYC docs"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'kyc-documents');

-- Storage RLS: Users can update/overwrite their own docs
CREATE POLICY "Users can update own KYC docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
