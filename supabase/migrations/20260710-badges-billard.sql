-- ============================================
-- Migration: Custom Badges + Billard Tournament (doubles)
-- Date: 2026-07-10
-- Idempotent: safe to re-run
-- ============================================

-- ============================================
-- CUSTOM BADGES — Admin awards badges to participants
-- ============================================

CREATE TABLE IF NOT EXISTS custom_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  awarded_by UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT '🏅',
  title TEXT NOT NULL,
  description TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by participant
CREATE INDEX IF NOT EXISTS idx_custom_badges_participant ON custom_badges(participant_id);
CREATE INDEX IF NOT EXISTS idx_custom_badges_awarded_by ON custom_badges(awarded_by);

-- RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_custom_badges') THEN
    ALTER TABLE custom_badges ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_custom_badges ON custom_badges FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE custom_badges;

-- ============================================
-- BILLARD TOURNAMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS billard_tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Tournoi de Billard 🎱',
  game_type TEXT NOT NULL DEFAULT '8ball' CHECK (game_type IN ('8ball', '9ball')),
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'done')),
  winner_team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billard_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES billard_tournaments(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  team_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- A player can only be in one team per tournament
  UNIQUE (tournament_id, player1_id),
  UNIQUE (tournament_id, player2_id)
);

-- Add FK for winner_team_id after billard_teams exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'billard_tournaments_winner_team_id_fkey'
  ) THEN
    ALTER TABLE billard_tournaments
      ADD CONSTRAINT billard_tournaments_winner_team_id_fkey
      FOREIGN KEY (winner_team_id) REFERENCES billard_teams(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS billard_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES billard_tournaments(id) ON DELETE CASCADE,
  round INT NOT NULL,          -- 1 = finale, 2 = demi, 4 = quart, 8 = huitième...
  match_order INT NOT NULL DEFAULT 0,  -- order within the round
  team1_id UUID NOT NULL REFERENCES billard_teams(id) ON DELETE CASCADE,
  team2_id UUID REFERENCES billard_teams(id) ON DELETE CASCADE,  -- null = bye
  team1_score INT,
  team2_score INT,
  winner_team_id UUID REFERENCES billard_teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'bye')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billard_teams_tournament ON billard_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_billard_matches_tournament ON billard_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_billard_matches_round ON billard_matches(tournament_id, round);

-- RLS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_billard_tournaments') THEN
    ALTER TABLE billard_tournaments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_billard_tournaments ON billard_tournaments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_billard_teams') THEN
    ALTER TABLE billard_teams ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_billard_teams ON billard_teams FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_billard_matches') THEN
    ALTER TABLE billard_matches ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_billard_matches ON billard_matches FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE billard_tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE billard_teams;
ALTER PUBLICATION supabase_realtime ADD TABLE billard_matches;
