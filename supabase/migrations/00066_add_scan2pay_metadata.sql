-- Migration: Add checkout session metadata and redirect URLs
-- Adds columns to scan2pay_sessions to support external API integrations

ALTER TABLE public.scan2pay_sessions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS success_url TEXT,
ADD COLUMN IF NOT EXISTS cancel_url TEXT;
