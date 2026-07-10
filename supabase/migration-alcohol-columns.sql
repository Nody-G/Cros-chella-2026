-- Migration: ajouter colonnes alcohol_preferences et favorite_alcohol
-- Idempotent: DO $$ blocks

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'alcohol_preferences'
  ) THEN
    ALTER TABLE participants ADD COLUMN alcohol_preferences text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'favorite_alcohol'
  ) THEN
    ALTER TABLE participants ADD COLUMN favorite_alcohol text;
  END IF;
END $$;
