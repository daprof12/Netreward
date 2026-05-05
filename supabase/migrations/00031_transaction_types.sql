-- Migration: Add missing transaction types for full UI support
-- Created: 2026-05-01

-- Add referral_bonus and cashback transaction types
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'referral_bonus';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'cashback';

-- Add optional status column to transactions for pending/failed tracking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' 
CHECK (status IN ('completed', 'pending', 'failed'));
