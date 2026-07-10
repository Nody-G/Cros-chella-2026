-- Migration: Ensure messages table has image_url column
-- The messages table was created manually, this ensures image_url exists

ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Also ensure the chat storage bucket exists and is public
-- (This is idempotent - will not fail if already exists)
