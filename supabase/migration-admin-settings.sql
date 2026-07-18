-- Create app_settings table for dynamic key-value configuration
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read settings, public update/insert for Cros-chella
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on app_settings') THEN
    CREATE POLICY "Allow public read on app_settings" ON app_settings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update on app_settings') THEN
    CREATE POLICY "Allow public update on app_settings" ON app_settings FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert on app_settings') THEN
    CREATE POLICY "Allow public insert on app_settings" ON app_settings FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime for app_settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
  END IF;
END $$;
