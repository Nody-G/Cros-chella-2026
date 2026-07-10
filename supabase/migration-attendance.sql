-- ============================================
-- CROS-HELLA — Migration: Add attendance column
-- Replaces hype_level with simple yes/maybe/no
-- ============================================

-- Add attendance column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'attendance'
  ) THEN
    ALTER TABLE participants ADD COLUMN attendance TEXT CHECK (attendance IN ('yes', 'maybe', 'no'));
    RAISE NOTICE 'Added attendance column to participants';
  ELSE
    RAISE NOTICE 'attendance column already exists';
  END IF;
END $$;
