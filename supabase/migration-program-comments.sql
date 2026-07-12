-- Migration: program_comments table (commentaires sur les activités du programme)
-- Idempotent — safe to run multiple times

DO $
BEGIN
  -- Create program_comments table
  CREATE TABLE IF NOT EXISTS program_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    program_id UUID REFERENCES program(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES participants(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $;

-- Index
CREATE INDEX IF NOT EXISTS idx_program_comments_program_id ON program_comments(program_id);

-- RLS
DO $
BEGIN
  ALTER TABLE program_comments ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL;
END $;

DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on program_comments') THEN
    CREATE POLICY "Allow all on program_comments" ON program_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $;

-- Realtime
DO $
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE program_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;
