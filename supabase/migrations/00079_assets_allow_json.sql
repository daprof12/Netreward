-- Migration 00079: Allow JSON uploads to assets bucket
-- Adds application/json to the allowed MIME types so nrt-metadata.json can be hosted there.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'application/json'
]
WHERE id = 'assets';
