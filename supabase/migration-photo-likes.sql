-- Migration: photo_likes table + RLS + realtime
-- Safe/idempotent

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS photo_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(photo_id, participant_id)
  );

  ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on photo_likes'
  ) THEN
    CREATE POLICY "Allow all on photo_likes" ON photo_likes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  ALTER PUBLICATION supabase_realtime ADD TABLE photo_likes;

EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
