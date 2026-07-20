-- Migration to allow UPDATE policy on bot_dossiers table for RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bot_dossiers' AND policyname = 'Allow update bot_dossiers for all'
  ) THEN
    CREATE POLICY "Allow update bot_dossiers for all" ON bot_dossiers
      FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
