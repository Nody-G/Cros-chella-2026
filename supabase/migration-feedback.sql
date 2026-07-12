-- Migration: Add feedback table for bug reports and improvement ideas
-- Safe/idempotent

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'bug' CHECK (type IN ('bug', 'idea')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'dismissed')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Everyone can read feedback (so participants see it's taken seriously)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_select_all' AND tablename = 'feedback') THEN
    CREATE POLICY feedback_select_all ON feedback FOR SELECT USING (true);
  END IF;
END $$;

-- Everyone can insert feedback
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_insert_all' AND tablename = 'feedback') THEN
    CREATE POLICY feedback_insert_all ON feedback FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Only service role can update/delete (admin via API)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_update_service' AND tablename = 'feedback') THEN
    CREATE POLICY feedback_update_service ON feedback FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_delete_service' AND tablename = 'feedback') THEN
    CREATE POLICY feedback_delete_service ON feedback FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
EXCEPTION WHEN others THEN NULL;
END $$;
