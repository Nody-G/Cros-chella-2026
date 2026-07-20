-- Migration to store Mimo synthesis facts and timestamp on bot_dossiers
ALTER TABLE bot_dossiers ADD COLUMN IF NOT EXISTS synthesized_facts TEXT[];
ALTER TABLE bot_dossiers ADD COLUMN IF NOT EXISTS synthesized_at TIMESTAMPTZ;
