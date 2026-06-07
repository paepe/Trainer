-- =============================================================================
-- TrAIner · Migration — checkin_prontidao: denormalize + input_source
-- Resolves spec gap: core check-in signals as queryable columns (RN-2.x)
-- Run once in Supabase SQL Editor.
-- =============================================================================

-- ── 1. Add denormalised core columns ─────────────────────────────────────────
-- These mirror fields already stored inside quick_data/detailed_data JSONB.
-- Purpose: enable range queries (energy < 5, pain_present = true, etc.)
-- without JSONB extraction on every scan.
-- Note: 'variant' is kept as-is; spec's 'checkin_type' is equivalent.

ALTER TABLE checkin_prontidao
  ADD COLUMN IF NOT EXISTS energy_level      integer
    CHECK (energy_level BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS sleep_quality     text
    CHECK (sleep_quality IN ('poor', 'regular', 'good', 'excellent')),
  ADD COLUMN IF NOT EXISTS fatigue_level     integer
    CHECK (fatigue_level BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS pain_present      boolean,
  ADD COLUMN IF NOT EXISTS pain_intensity    integer
    CHECK (pain_intensity BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS available_minutes integer,
  ADD COLUMN IF NOT EXISTS training_location text,
  ADD COLUMN IF NOT EXISTS input_source      text NOT NULL DEFAULT 'form'
    CHECK (input_source IN ('voice', 'form'));

-- ── 2. Backfill existing rows from JSONB ─────────────────────────────────────

UPDATE checkin_prontidao
SET
  energy_level      = (quick_data ->> 'energy')::integer,
  sleep_quality     =  quick_data ->> 'sleep_quality',
  fatigue_level     = (quick_data ->> 'fatigue')::integer,
  pain_present      = (quick_data -> 'pain' ->> 'present')::boolean,
  pain_intensity    = (quick_data -> 'pain' ->> 'intensity')::integer,
  available_minutes = (quick_data ->> 'available_minutes')::integer,
  training_location = COALESCE(
                        detailed_data ->> 'location_today',
                        quick_data    ->> 'location_today'
                      )
WHERE quick_data IS NOT NULL
   OR detailed_data IS NOT NULL;

-- Set input_source from variant for all existing rows
UPDATE checkin_prontidao
SET input_source = CASE WHEN variant = 'voice' THEN 'voice' ELSE 'form' END;

-- ── 3. Trigger: keep denormalised columns in sync on INSERT ──────────────────
-- Prevents future drift without requiring every write path to remember the cols.

CREATE OR REPLACE FUNCTION sync_checkin_denorm()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.energy_level      := (NEW.quick_data ->> 'energy')::integer;
  NEW.sleep_quality     :=  NEW.quick_data ->> 'sleep_quality';
  NEW.fatigue_level     := (NEW.quick_data ->> 'fatigue')::integer;
  NEW.pain_present      := (NEW.quick_data -> 'pain' ->> 'present')::boolean;
  NEW.pain_intensity    := (NEW.quick_data -> 'pain' ->> 'intensity')::integer;
  NEW.available_minutes := (NEW.quick_data ->> 'available_minutes')::integer;
  NEW.training_location := COALESCE(
                             NEW.detailed_data ->> 'location_today',
                             NEW.quick_data    ->> 'location_today'
                           );
  -- input_source: caller sets it explicitly; default 'form' is the fallback
  RETURN NEW;
END;
$$;

CREATE TRIGGER checkin_denorm_sync
  BEFORE INSERT ON checkin_prontidao
  FOR EACH ROW
  WHEN (NEW.quick_data IS NOT NULL OR NEW.detailed_data IS NOT NULL)
  EXECUTE FUNCTION sync_checkin_denorm();

-- ── 4. Indexes for range + filter queries ─────────────────────────────────────

CREATE INDEX IF NOT EXISTS checkin_energy_idx
  ON checkin_prontidao(user_id, energy_level);

CREATE INDEX IF NOT EXISTS checkin_fatigue_idx
  ON checkin_prontidao(user_id, fatigue_level);

CREATE INDEX IF NOT EXISTS checkin_sleep_idx
  ON checkin_prontidao(user_id, sleep_quality);

CREATE INDEX IF NOT EXISTS checkin_pain_idx
  ON checkin_prontidao(user_id, pain_present)
  WHERE pain_present = true;

CREATE INDEX IF NOT EXISTS checkin_location_idx
  ON checkin_prontidao(user_id, training_location);

CREATE INDEX IF NOT EXISTS checkin_input_source_idx
  ON checkin_prontidao(input_source);
