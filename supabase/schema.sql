-- ============================================
-- CROS-HELLA — Supabase Schema
-- ============================================

-- Drop existing tables if they exist to reset clean
DROP TABLE IF EXISTS photo_likes CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS poll_votes CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS spots CASCADE;
DROP TABLE IF EXISTS program CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS participants CASCADE;

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pseudo TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'declined')),
  bed_assignment TEXT,
  bio TEXT,
  password TEXT,
  is_admin BOOLEAN DEFAULT false,
  hype_level INTEGER DEFAULT 0 CHECK (hype_level >= 0 AND hype_level <= 6),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Games (jeux mystères)
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('quiz', 'physical', 'alcohol', 'disgusting', 'culture', 'creative', 'other')),
  is_revealed BOOLEAN DEFAULT false,
  revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Programme (planning du week-end)
CREATE TABLE IF NOT EXISTS program (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📌',
  day TEXT NOT NULL CHECK (day IN ('friday', 'saturday', 'sunday')),
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Spots de baignade
CREATE TABLE IF NOT EXISTS spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  maps_url TEXT,
  image_url TEXT,
  danger_level TEXT DEFAULT 'normal' CHECK (danger_level IN ('easy', 'normal', 'hard', 'extreme')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sondages
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES participants(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Votes aux sondages
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, participant_id)
);

-- Messages (chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos (galerie)
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Likes sur photos
CREATE TABLE IF NOT EXISTS photo_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(photo_id, participant_id)
);

-- ============================================
-- Données initiales — Participants
-- ============================================
INSERT INTO participants (name, pseudo, status, is_admin, bio) VALUES
  ('Niels', 'Maître', 'confirmed', true, 'L''hôte. Le boss. Celui qui a la maison. 🏠'),
  ('Nelly', 'Nellfest', 'confirmed', false, 'Meuf de Niels. La vraie cheffe. 👑'),
  ('Alva', 'Alvathor', 'confirmed', false, 'Sœur de Niels. Attention à elle. ⚡'),
  ('Célis', NULL, 'pending', false, 'Frère de Niels. Pseudo à venir... 🤔'),
  ('Charly', 'Chocolatione', 'confirmed', false, 'Le pote. Le classique. Le fiable. 🍫'),
  ('Ludo', 'Rosette', 'confirmed', false, 'L''autre pote. Celui qui danse. 💃'),
  ('Xav', 'El hombre calvo de músculos prominentes', 'confirmed', false, 'L''inventeur du concept. Respect. 🗿'),
  ('Hervé', NULL, 'pending', false, 'Le mystère. Viendra-t-il ? 🕵️')
ON CONFLICT DO NOTHING;

-- ============================================
-- Données initiales — Programme type
-- ============================================
INSERT INTO program (title, description, emoji, day, start_time, end_time, location, sort_order) VALUES
  ('Arrivée & Installation', 'Check-in, choix des chambres, premier apéro', '🏠', 'friday', '18:00', '20:00', 'La maison', 1),
  ('Soirée d''accueil', 'Apéro, musique, premier jeu mystère révélé', '🎉', 'friday', '20:00', '02:00', 'Salon / Terrasse', 2),
  ('Réveil & Petit-déj', 'Café, tartines, mal de tête', '☕', 'saturday', '09:00', '11:00', 'Cuisine', 3),
  ('Baignade', 'Direction les spots de baignade !', '🏊', 'saturday', '11:30', '15:00', 'Spots de baignade', 4),
  ('Jeux de l''après-midi', 'Les jeux mystères se succèdent', '🎮', 'saturday', '15:30', '19:00', 'Jardin / Salon', 5),
  ('Gros Soirée', 'BBQ, musique, fête, débauche', '🔥', 'saturday', '20:00', '03:00', 'Partout', 6),
  ('Dimanche Chill', 'Baignade tranquille, rangement, au revoir', '☀️', 'sunday', '10:00', '16:00', 'Maison / Spots', 7)
ON CONFLICT DO NOTHING;

-- ============================================
-- Données initiales — Spots de baignade
-- ============================================
INSERT INTO spots (name, description, maps_url, danger_level, sort_order) VALUES
  ('Spots de baignade Ardèche', 'Tous les spots sont sur la carte Google Maps de Niels', 'https://maps.app.goo.gl/hP4hV3Z3ZEYzVV5m8', 'normal', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS (Row Level Security) — Permissive pour l'instant
-- ============================================
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE program ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (on protègera plus tard)
CREATE POLICY "Allow all on participants" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on program" ON program FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on spots" ON spots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on polls" ON polls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on poll_votes" ON poll_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on photos" ON photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on photo_likes" ON photo_likes FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
