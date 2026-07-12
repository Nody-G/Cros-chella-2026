-- Migration: Ajouter deleted_at sur participants (soft delete)
-- Idempotent: safe à re-exécuter

ALTER TABLE participants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
