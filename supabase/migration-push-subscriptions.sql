-- ============================================
-- Table: push_subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_push_subscriptions') THEN
    ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_push_subscriptions ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
