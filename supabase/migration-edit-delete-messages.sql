-- Migration: Add edit/delete support to messages
-- edited_at: timestamp when message was last edited (null = never edited)
-- deleted_at: timestamp when message was soft-deleted (null = not deleted)

ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL;

-- Enable realtime for UPDATE and DELETE on messages
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN
  -- already a member, ignore
END $$;
