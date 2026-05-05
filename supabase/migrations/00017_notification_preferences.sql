-- Phase 9: Notification Preferences
-- Created: 2026

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "push": true,
  "email": true,
  "in_app": true,
  "types": {
    "payment": true,
    "campaign": true,
    "p2p": true,
    "system": true
  }
}'::JSONB;
