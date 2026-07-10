-- ============================================
-- CROS-HELLA — Seed Data
-- Execute ce SQL dans Supabase SQL Editor
-- ============================================

-- Participants
INSERT INTO participants (name, pseudo, status, is_admin, bio) VALUES
  ('Niels', 'Maitre', 'confirmed', true, 'L''hote. Le boss. Celui qui a la maison.'),
  ('Nelly', 'Nellfest', 'pending', false, 'Meuf de Niels. La vraie cheffe.'),
  ('Alva', 'Alvathor', 'pending', false, 'Soeur de Niels. Attention a elle.'),
  ('Celis', 'l''homme de l''ombre', 'pending', false, 'Le frere. L''ombre. Celui qu''on voit pas mais qui est la.'),
  ('Charly', 'Chocolatine', 'pending', false, 'Le pote. Le classique. Le fiable.'),
  ('Ludo', 'Rosette', 'pending', false, 'L''autre pote. Celui qui danse.'),
  ('Xav', 'El hombre calvo de musculos prominentes', 'pending', false, 'L''inventeur du concept. Respect.'),
  ('Herve', NULL, 'pending', false, 'Le mystere. Viendra-t-il ?'),
  ('Bber', 'Punch des iles', 'pending', false, 'Le punch des iles. Ca va mal tourner.')
ON CONFLICT DO NOTHING;

-- Spots de baignade
INSERT INTO spots (name, description, maps_url, danger_level, sort_order) VALUES
  ('Spots de baignade Ardeche', 'Tous les spots sont sur la carte Google Maps de Niels', 'https://maps.app.goo.gl/hP4hV3Z3ZEYzVV5m8', 'normal', 1)
ON CONFLICT DO NOTHING;
