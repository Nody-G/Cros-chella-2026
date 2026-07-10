-- ============================================
-- CROS-HELLA — Migration : Realtime + Gallery Storage
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1) Activer Realtime sur les tables participants et photos
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE participants; EXCEPTION WHEN duplicate_object THEN END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE photos; EXCEPTION WHEN duplicate_object THEN END $$;

-- 2) Vérifier que la table photos a bien les bonnes colonnes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'caption'
  ) THEN
    ALTER TABLE photos ADD COLUMN caption TEXT;
  END IF;
END $$;

-- 3) RLS sur photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on photos' AND tablename = 'photos'
  ) THEN
    CREATE POLICY "Allow all on photos" ON photos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
