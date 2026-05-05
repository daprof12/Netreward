-- Migration: Secure Solana Wallet Storage
-- Created: 2026-05-02

-- Add encryption fields to wallets table
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT,
ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'custodial'; -- 'custodial' or 'external'

-- Index for public key lookups
CREATE INDEX IF NOT EXISTS idx_wallets_solana_public_key ON public.wallets(solana_public_key);

-- Comment for security awareness
COMMENT ON COLUMN public.wallets.encrypted_private_key IS 'AES-256 encrypted private key. Requires master key from environment to decrypt.';
