-- Migration: bot_conversations table for Botardèche chat
-- Idempotent — safe to re-run

-- Table pour stocker l'historique des conversations avec le bot
CREATE TABLE IF NOT EXISTS bot_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour charger rapidement l'historique d'un participant
CREATE INDEX IF NOT EXISTS idx_bot_conversations_participant 
  ON bot_conversations(participant_id, created_at DESC);

-- Index pour le rate limiting (compter les messages récents)
CREATE INDEX IF NOT EXISTS idx_bot_conversations_recent 
  ON bot_conversations(participant_id, created_at);

-- RLS
ALTER TABLE bot_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: tout le monde peut lire/écrire (on gère les permissions dans l'app)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bot_conversations_all' AND tablename = 'bot_conversations') THEN
    CREATE POLICY bot_conversations_all ON bot_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Realtime (pour que les messages du bot arrivent en temps réel)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bot_conversations;
EXCEPTION WHEN others THEN NULL;
END $$;
