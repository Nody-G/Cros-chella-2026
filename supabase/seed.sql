-- ============================================
-- CROS-HELLA — Seed Data
-- Exécute ce SQL dans Supabase SQL Editor
-- ============================================

-- Participants
INSERT INTO participants (name, pseudo, status, is_admin, bio) VALUES
  ('Niels', 'Maître', 'confirmed', true, 'L''hôte. Le boss. Celui qui a la maison. 🏠'),
  ('Nelly', 'Nellfest', 'confirmed', false, 'Meuf de Niels. La vraie cheffe. 👑'),
  ('Alva', 'Alvathor', 'confirmed', false, 'Sœur de Niels. Attention à elle. ⚡'),
  ('Célis', NULL, 'pending', false, 'Frère de Niels. Pseudo à venir... 🤔'),
  ('Charly', 'Chocolatione', 'confirmed', false, 'Le pote. Le classique. Le fiable. 🍫'),
  ('Ludo', 'Rosette', 'confirmed', false, 'L''autre pote. Celui qui danse. 💃'),
  ('Xav', 'El hombre calvo de músculos prominentes', 'confirmed', false, 'L''inventeur du concept. Respect. 🗿'),
  ('Hervé', NULL, 'pending', false, 'Le mystère. Viendra-t-il ? 🕵️');

-- Programme
INSERT INTO program (title, description, emoji, day, start_time, end_time, location, sort_order) VALUES
  ('Arrivée & Installation', 'Check-in, choix des chambres, premier apéro', '🏠', 'friday', '18:00', '20:00', 'La maison', 1),
  ('Soirée d''accueil', 'Apéro, musique, premier jeu mystère révélé', '🎉', 'friday', '20:00', '02:00', 'Salon / Terrasse', 2),
  ('Réveil & Petit-déj', 'Café, tartines, mal de tête', '☕', 'saturday', '09:00', '11:00', 'Cuisine', 3),
  ('Baignade', 'Direction les spots de baignade !', '🏊', 'saturday', '11:30', '15:00', 'Spots de baignade', 4),
  ('Jeux de l''après-midi', 'Les jeux mystères se succèdent', '🎮', 'saturday', '15:30', '19:00', 'Jardin / Salon', 5),
  ('Gros Soirée', 'BBQ, musique, fête, débauche', '🔥', 'saturday', '20:00', '03:00', 'Partout', 6),
  ('Dimanche Chill', 'Baignade tranquille, rangement, au revoir', '☀️', 'sunday', '10:00', '16:00', 'Maison / Spots', 7);

-- Spots de baignade
INSERT INTO spots (name, description, maps_url, danger_level, sort_order) VALUES
  ('Spots de baignade Ardèche', 'Tous les spots sont sur la carte Google Maps de Niels', 'https://maps.app.goo.gl/hP4hV3Z3ZEYzVV5m8', 'normal', 1);
