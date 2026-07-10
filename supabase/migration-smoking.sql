-- Migration: Ajouter colonne smoking_preferences
-- Idempotent: utilise IF NOT EXISTS

ALTER TABLE participants ADD COLUMN IF NOT EXISTS smoking_preferences text[];

-- Activer le realtime sur la table (ignore si déjà membre)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE participants;
EXCEPTION WHEN duplicate_object THEN
  -- already a member, ignore
END $$;
