-- ============================================
-- CROS-HELLA — Schema SQL
-- Execute ce SQL dans Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: participants
-- ============================================
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  pseudo TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  is_admin BOOLEAN DEFAULT false,
  bio TEXT,
  avatar_url TEXT,
  emoji_avatar TEXT,
  tagline TEXT,
  fun_title TEXT,
  festival_role TEXT,
  specialty TEXT,
  superpower TEXT,
  weakness TEXT,
  catchphrase TEXT,
  anthem TEXT,
  alcohol_preferences TEXT[] DEFAULT '{}',
  favorite_alcohol TEXT,
  smoking_preferences TEXT[] DEFAULT '{}',
  bed_assignment TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: program_items
-- ============================================
CREATE TABLE IF NOT EXISTS program_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  day TEXT NOT NULL CHECK (day IN ('vendredi', 'samedi', 'samedi_matin', 'samedi_aprem', 'samedi_soir', 'dimanche')),
  time_start TEXT,
  time_end TEXT,
  location TEXT,
  category TEXT DEFAULT 'autre',
  is_revealed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES participants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: program_proposals
-- ============================================
CREATE TABLE IF NOT EXISTS program_proposals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  proposed_by UUID REFERENCES participants(id) NOT NULL,
  day TEXT,
  time_start TEXT,
  category TEXT DEFAULT 'autre',
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: proposal_votes
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  proposal_id UUID REFERENCES program_proposals(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, participant_id)
);

-- ============================================
-- Table: proposal_comments
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  proposal_id UUID REFERENCES program_proposals(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: proposal_likes
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  proposal_id UUID REFERENCES program_proposals(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proposal_id, participant_id)
);

-- ============================================
-- Table: games
-- ============================================
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  category TEXT DEFAULT 'autre',
  submitted_by UUID REFERENCES participants(id) NOT NULL,
  is_revealed BOOLEAN DEFAULT false,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: polls
-- ============================================
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES participants(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: poll_votes
-- ============================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, participant_id)
);

-- ============================================
-- Table: messages (chat)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  content TEXT,
  image_url TEXT,
  reply_to UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: message_reactions
-- ============================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, participant_id, emoji)
);

-- ============================================
-- Table: photos (galerie)
-- ============================================
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: photo_comments
-- ============================================
CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: photo_likes
-- ============================================
CREATE TABLE IF NOT EXISTS photo_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, participant_id)
);

-- ============================================
-- Table: spots
-- ============================================
CREATE TABLE IF NOT EXISTS spots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  maps_url TEXT,
  danger_level TEXT DEFAULT 'normal' CHECK (danger_level IN ('safe', 'normal', 'dangerous', 'extreme')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: reactions (general)
-- ============================================
CREATE TABLE IF NOT EXISTS reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  participant_id UUID REFERENCES participants(id) NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_id, participant_id, emoji)
);

-- ============================================
-- Données initiales — Participants
-- ============================================
INSERT INTO participants (name, pseudo, status, is_admin, bio) VALUES
  ('Niels', 'Maître', 'confirmed', true, 'L''hôte. Le boss. Celui qui a la maison. 🏠'),
  ('Nelly', 'Nellfest', 'confirmed', false, 'Meuf de Niels. La vraie cheffe. 👑'),
  ('Alva', 'Alvathor', 'confirmed', false, 'Sœur de Niels. Attention à elle. ⚡'),
  ('Célis', 'l''homme de l''ombre', 'confirmed', false, 'Le frère. L''ombre. Celui qu''on voit pas mais qui est là. 🌑'),
  ('Charly', 'Chocolatione', 'confirmed', false, 'Le pote. Le classique. Le fiable. 🍫'),
  ('Ludo', 'Rosette', 'confirmed', false, 'L''autre pote. Celui qui danse. 💃'),
  ('Xav', 'El hombre calvo de músculos prominentes', 'confirmed', false, 'L''inventeur du concept. Respect. 🗿'),
  ('Hervé', NULL, 'pending', false, 'Le mystère. Viendra-t-il ? 🕵️'),
  ('Bber', 'Punch des îles', 'confirmed', false, 'Le punch des îles. Ça va mal tourner. 🍹🏝️')
ON CONFLICT DO NOTHING;

-- ============================================
-- Données initiales — Spots de baignade
-- ============================================
INSERT INTO spots (name, description, maps_url, danger_level, sort_order) VALUES
  ('Spots de baignade Ardèche', 'Tous les spots sont sur la carte Google Maps de Niels', 'https://maps.app.goo.gl/hP4hV3Z3ZEYzVV5m8', 'normal', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS (Row Level Security) — Permissive pour l'instant
-- Idempotent: DO blocks check if policy exists
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_participants') THEN
    ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_participants ON participants FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_program_items') THEN
    ALTER TABLE program_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_program_items ON program_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_program_proposals') THEN
    ALTER TABLE program_proposals ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_program_proposals ON program_proposals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_proposal_votes') THEN
    ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_proposal_votes ON proposal_votes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_proposal_comments') THEN
    ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_proposal_comments ON proposal_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_proposal_likes') THEN
    ALTER TABLE proposal_likes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_proposal_likes ON proposal_likes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_games') THEN
    ALTER TABLE games ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_games ON games FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_polls') THEN
    ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_polls ON polls FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_poll_votes') THEN
    ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_poll_votes ON poll_votes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_messages') THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_messages ON messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_message_reactions') THEN
    ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_message_reactions ON message_reactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_photos') THEN
    ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_photos ON photos FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_photo_comments') THEN
    ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_photo_comments ON photo_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_photo_likes') THEN
    ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_photo_likes ON photo_likes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_spots') THEN
    ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_spots ON spots FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_reactions') THEN
    ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY allow_all_reactions ON reactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Realtime subscriptions
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;
ALTER PUBLICATION supabase_realtime ADD TABLE photo_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE photo_likes;
