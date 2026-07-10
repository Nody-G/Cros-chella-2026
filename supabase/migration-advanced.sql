-- ============================================
-- CROS-HELLA — Migration : Profil avancé + Planning dynamique
-- À exécuter APRÈS le schema.sql original
-- ============================================

-- 0) Admin code séparé du password personnel
ALTER TABLE participants ADD COLUMN IF NOT EXISTS admin_code TEXT;

-- 1) Profil personnalisé avancé
ALTER TABLE participants ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS emoji_avatar TEXT DEFAULT '😎';
ALTER TABLE participants ADD COLUMN IF NOT EXISTS fun_title TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS special_skill TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS festival_role TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS catchphrase TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS theme_song TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS superpower TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS weakness TEXT;

-- 2) Planning dynamique : responsable + statut tâche
ALTER TABLE program ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES participants(id) ON DELETE SET NULL;
ALTER TABLE program ADD COLUMN IF NOT EXISTS task_status TEXT DEFAULT 'pending' CHECK (task_status IN ('pending', 'accepted', 'done'));
ALTER TABLE program ADD COLUMN IF NOT EXISTS volunteer_note TEXT;

-- 3) Propositions de programme par les participants
CREATE TABLE IF NOT EXISTS program_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES program(id) ON DELETE SET NULL,
  proposer_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '💡',
  day TEXT NOT NULL CHECK (day IN ('friday', 'saturday', 'sunday')),
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  vote_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Votes sur les propositions
CREATE TABLE IF NOT EXISTS program_proposal_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES program_proposals(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, participant_id)
);

-- 5) RLS policies pour les nouvelles tables
ALTER TABLE program_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_proposal_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on program_proposals') THEN CREATE POLICY "Allow all on program_proposals" ON program_proposals FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on program_proposal_votes') THEN CREATE POLICY "Allow all on program_proposal_votes" ON program_proposal_votes FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

-- 6) RPC functions for vote counting
CREATE OR REPLACE FUNCTION increment_vote_count(p_id UUID)
RETURNS void AS $FUNC$
BEGIN
  UPDATE program_proposals SET vote_count = vote_count + 1 WHERE id = p_id;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_vote_count(p_id UUID)
RETURNS void AS $FUNC$
BEGIN
  UPDATE program_proposals SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = p_id;
END;
$FUNC$ LANGUAGE plpgsql SECURITY DEFINER;
