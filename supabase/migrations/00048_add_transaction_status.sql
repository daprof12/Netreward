-- Migration: Add Status to Transactions Table
-- Created: 2026-05-02

-- 1. Add status column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));

-- 2. Update process_instant_purchase to be compatible
-- (The column now exists, so the previous error should be resolved)
