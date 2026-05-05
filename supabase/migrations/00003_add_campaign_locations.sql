-- Add target_locations column to campaigns to store structured geographic data
-- Format: [{ name: string, lat: number, lon: number, radiusKm: number }]

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS target_locations JSONB DEFAULT '[]'::jsonb;
