-- Migration: Ajouter colonne "source" à la table photos
-- Pour distinguer les photos uploadées directement vs importées du chat
-- Idempotent: safe à re-exécuter

DO $$
BEGIN
  -- Ajouter la colonne source si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'source'
  ) THEN
    ALTER TABLE photos ADD COLUMN source TEXT DEFAULT 'gallery';
    -- Valeurs possibles: 'gallery' (upload direct), 'chat' (importé du chat)
    COMMENT ON COLUMN photos.source IS 'Origine de la photo: gallery (upload direct) ou chat (importée du chat)';
  END IF;
END $$;
