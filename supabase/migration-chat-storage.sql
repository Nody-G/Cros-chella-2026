-- ============================================
-- CROS-HELLA — Migration : Chat Storage Policies
-- Permet l'upload et la lecture d'images dans chat/
-- ============================================

-- Policy : lecture publique des images chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read chat images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow public read chat images" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'chat');
  END IF;
END $$;

-- Policy : upload d'images chat (anonyme car pas d'auth Supabase classique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload chat images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow upload chat images" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'chat');
  END IF;
END $$;

-- Policy : suppression d'images chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow delete chat images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow delete chat images" ON storage.objects
      FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'chat');
  END IF;
END $$;
