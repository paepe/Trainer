-- =============================================================================
-- TrAIner · Migration — Coach DNA
-- Creates the coach_dna table with JSONB blocks per step,
-- RLS (trainer owns their row), and auto-updated_at trigger.
-- Run once in Supabase SQL Editor.
-- =============================================================================

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coach_dna (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Wizard progress
  current_step    text        NOT NULL DEFAULT 'identity',
  completed_at    timestamptz,
  archetype       text,          -- derived: performance | technician | motivator | guide | drill | movement
  dna_active      boolean     NOT NULL DEFAULT false,

  -- Phase 1 — Blocks 1–6 (JSONB, nullable until each block is saved)
  identity        jsonb,         -- { photo, name, gender, age }
  background      jsonb,         -- { years, certs[] }
  fitness         jsonb,         -- { level }
  training        jsonb,         -- { methods[], envs[], intensity }
  dna_style       jsonb,         -- { style[] }
  dna_principles  jsonb,         -- { principles[] }

  -- Phase 2 — Blocks 7–12 (reserved, nullable)
  focus           jsonb,         -- { strength, endurance, mobility, athletic, coord, balance }
  exercises       jsonb,         -- { favorites[], avoid[] }
  design          jsonb,         -- { formats[], curve }
  structure       jsonb,         -- { order[] }
  audience        jsonb,         -- { tone[], clients[] }
  philosophy      jsonb,         -- { motto, prompt }

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT coach_dna_trainer_id_key UNIQUE (trainer_id)
);

-- ── Auto-updated_at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coach_dna_set_updated_at ON coach_dna;
CREATE TRIGGER coach_dna_set_updated_at
  BEFORE UPDATE ON coach_dna
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE coach_dna ENABLE ROW LEVEL SECURITY;

-- Trainer reads and writes only their own row
DROP POLICY IF EXISTS "trainer manages own coach dna" ON coach_dna;
CREATE POLICY "trainer manages own coach dna" ON coach_dna
  FOR ALL
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients have no access (no select policy for client role)

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_coach_dna_trainer_id  ON coach_dna (trainer_id);
CREATE INDEX IF NOT EXISTS idx_coach_dna_dna_active  ON coach_dna (dna_active) WHERE dna_active = true;
CREATE INDEX IF NOT EXISTS idx_coach_dna_archetype   ON coach_dna (archetype)  WHERE archetype IS NOT NULL;
