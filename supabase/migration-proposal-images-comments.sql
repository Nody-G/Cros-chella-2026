-- Migration: Proposal images + Photo comments
-- Safe to run multiple times (IF NOT EXISTS)

-- 1. Add image_url to program_proposals
ALTER TABLE program_proposals ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Create photo_comments table
CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast comment lookup by photo
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo_id ON photo_comments(photo_id);

-- 3. Enable realtime on photo_comments
ALTER PUBLICATION supabase_realtime ADD TABLE photo_comments;

-- 4. RLS policies for photo_comments
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read comments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read photo comments'
  ) THEN
    CREATE POLICY "Anyone can read photo comments"
      ON photo_comments FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow anyone to insert comments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can insert photo comments'
  ) THEN
    CREATE POLICY "Anyone can insert photo comments"
      ON photo_comments FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anyone to delete comments (app-level auth handles permissions)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can delete photo comments'
  ) THEN
    CREATE POLICY "Anyone can delete photo comments"
      ON photo_comments FOR DELETE
      USING (true);
  END IF;
END $$;

-- 5. RLS policies for program_proposals (allow update/delete — app-level auth)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can update proposals'
  ) THEN
    CREATE POLICY "Anyone can update proposals"
      ON program_proposals FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can delete proposal votes'
  ) THEN
    CREATE POLICY "Anyone can delete proposal votes"
      ON program_proposal_votes FOR DELETE
      USING (true);
  END IF;
END $$;
