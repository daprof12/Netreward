-- Migration: Fix Gateway Liquidity Unique Constraint
-- Created: 2026-05-13
-- Resolves error: duplicate key value violates unique constraint "gateway_liquidity_provider_name_key"
-- by allowing a provider to have liquidity pools in multiple currencies.

BEGIN;

-- Drop the single-column unique constraint
ALTER TABLE public.gateway_liquidity
DROP CONSTRAINT IF EXISTS gateway_liquidity_provider_name_key;

-- Add a composite unique constraint for provider and currency combination
ALTER TABLE public.gateway_liquidity
ADD CONSTRAINT gateway_liquidity_provider_currency_key UNIQUE (provider_name, currency);

COMMIT;
