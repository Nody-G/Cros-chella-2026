-- Migration: Ajouter "thursday" aux contraintes CHECK pour program et program_proposals
-- Idempotent: supprime l'ancienne contrainte et recrée avec "thursday"

-- Table program
ALTER TABLE program DROP CONSTRAINT IF EXISTS program_day_check;
ALTER TABLE program ADD CONSTRAINT program_day_check CHECK (day IN ('thursday', 'friday', 'saturday', 'sunday'));

-- Table program_proposals
ALTER TABLE program_proposals DROP CONSTRAINT IF EXISTS program_proposals_day_check;
ALTER TABLE program_proposals ADD CONSTRAINT program_proposals_day_check CHECK (day IN ('thursday', 'friday', 'saturday', 'sunday'));
