-- ============================================
-- CROS-HELLA — Migration : Realtime + Gallery Storage
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1) Activer Realtime sur les tables participants et photos
-- (nécessaire pour que les subscriptions .on('postgres_changes') fonctionnent)
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;

-- 2) S'assurer que le bucket avatars accepte le sous-dossier gallery/
-- (Le bucket 'avatars' doit déjà exister — créé dans Storage > New Bucket)
-- Les policies existantes sur avatars devraient couvrir gallery/ aussi
-- car le path commence par le participant_id.

-- Si tu veux créer une policy spécifique pour gallery :
-- (décommenter si nécessaire)
-- CREATE POLICY "Allow public read gallery" ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'gallery');
-- CREATE POLICY "Allow authenticated upload gallery" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'gallery');
-- CREATE POLICY "Allow authenticated delete gallery" ON storage.objects
--   FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'gallery');

-- 3) Vérifier que la table photos a bien les bonnes colonnes
-- (normalement déjà OK via schema.sql original)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'caption'
  ) THEN
    ALTER TABLE photos ADD COLUMN caption TEXT;
  END IF;
END $$;

-- 4) RLS sur photos (devrait déjà être fait dans schema.sql)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on photos' AND tablename = 'photos'
  ) THEN
    CREATE POLICY "Allow all on photos" ON photos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
