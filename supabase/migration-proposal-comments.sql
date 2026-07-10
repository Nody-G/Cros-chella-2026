-- Migration: proposal_comments table
-- Safe/idempotent

DO $$
BEGIN
  -- Create proposal_comments table
  CREATE TABLE IF NOT EXISTS proposal_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES program_proposals(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Index for fast lookups by proposal
  CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON proposal_comments(proposal_id);

  -- Enable RLS
  ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

  -- Policies (permissive for this app — no real auth)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on proposal_comments'
  ) THEN
    CREATE POLICY "Allow all on proposal_comments" ON proposal_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Enable realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE proposal_comments;

EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
