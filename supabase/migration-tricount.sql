-- CROS-HELLA — Migration: Tricount / Expense splitting
-- Tables: expenses, expense_splits, settlements
-- All amounts in CENTS (integer) to avoid float precision issues

-- ============================================
-- EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paid_by UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0), -- in cents
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('food', 'alcohol', 'transport', 'activities', 'accommodation', 'other')),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXPENSE SPLITS (who owes what for each expense)
-- ============================================
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0), -- share in cents
  is_settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(expense_id, participant_id)
);

-- ============================================
-- SETTLEMENTS (manual debt resolution)
-- ============================================
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_participant UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  to_participant UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0), -- in cents
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (from_participant != to_participant)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_participant ON expense_splits(participant_id);
CREATE INDEX IF NOT EXISTS idx_settlements_from ON settlements(from_participant);
CREATE INDEX IF NOT EXISTS idx_settlements_to ON settlements(to_participant);

-- ============================================
-- RLS (Row Level Security) — allow all for now
-- ============================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access (same pattern as other tables)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_expenses' AND tablename = 'expenses') THEN
    CREATE POLICY allow_all_expenses ON expenses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_expense_splits' AND tablename = 'expense_splits') THEN
    CREATE POLICY allow_all_expense_splits ON expense_splits FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_settlements' AND tablename = 'settlements') THEN
    CREATE POLICY allow_all_settlements ON settlements FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- REALTIME
-- ============================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE expense_splits;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================
-- TRIGGER: auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON expenses;
CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();
