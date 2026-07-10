-- Migration: Add reactions JSONB column to messages (for chat emoji reactions)
-- Safe/idempotent

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'reactions'
  ) THEN
    ALTER TABLE messages ADD COLUMN reactions JSONB DEFAULT '{}';
  END IF;
END $$;
