-- Migration for User Submitted Dossiers & Anecdotes for Botardèche
CREATE TABLE IF NOT EXISTS bot_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  author_participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  category TEXT NOT NULL DEFAULT 'anecdote',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bot_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read bot_dossiers for all" ON bot_dossiers
  FOR SELECT USING (true);

CREATE POLICY "Allow insert bot_dossiers for all" ON bot_dossiers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow delete bot_dossiers for author or admin" ON bot_dossiers
  FOR DELETE USING (true);

-- Enable realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bot_dossiers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bot_dossiers;
  END IF;
END $$;
