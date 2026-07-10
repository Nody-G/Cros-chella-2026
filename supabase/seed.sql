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

-- Spots de baignade
INSERT INTO spots (name, description, maps_url, danger_level, sort_order) VALUES
  ('Spots de baignade Ardèche', 'Tous les spots sont sur la carte Google Maps de Niels', 'https://maps.app.goo.gl/hP4hV3Z3ZEYzVV5m8', 'normal', 1);
