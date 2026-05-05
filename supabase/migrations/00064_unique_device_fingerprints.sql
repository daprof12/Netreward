-- Migration: Enforce Unique Device Fingerprints
-- Description: Cleans up duplicate fingerprints (keeping the oldest) and applies a UNIQUE constraint to enforce strict 1-to-1 device-to-user linking.

-- 1. Deduplicate existing records
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY fingerprint ORDER BY created_at ASC) as rn
    FROM public.devices
    WHERE fingerprint IS NOT NULL
)
DELETE FROM public.devices
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 2. Add the unique constraint
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS unique_fingerprint;
ALTER TABLE public.devices ADD CONSTRAINT unique_fingerprint UNIQUE (fingerprint);
