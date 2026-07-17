-- Migration: Add created_by column to program table
ALTER TABLE program ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES participants(id) ON DELETE SET NULL;
