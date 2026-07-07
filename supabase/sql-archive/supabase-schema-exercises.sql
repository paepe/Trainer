-- exercises (library) — canonical schema, reverse-engineered from the live
-- sevenseeds.trainer database on 2026-07-07 (system audit Phase 4).
-- The table was originally created outside tracked migrations; this file
-- closes that gap so DB-side enforcement is verifiable from the repo.
-- Status CHECK shown here is the post-cleanup contract
-- (see supabase-cleanup-20260707.sql).

CREATE TABLE IF NOT EXISTS exercises (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL UNIQUE,
  muscle_group          text NOT NULL,
  equipment             text[] DEFAULT '{}',
  level                 text NOT NULL
                        CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  short_instruction     text,
  status                text DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'restricted', 'blocked')),
  alternatives          text[] DEFAULT '{}',
  restrictions          text[] DEFAULT '{}',
  movement_pattern      text,
  relative_risk_regions text[] DEFAULT '{}',
  accessibility_tags    text[] DEFAULT '{}',
  exercise_category     text
                        CHECK (exercise_category IN ('fitness', 'performance', 'mobility')),
  video_url             text,
  created_by            uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- RLS policies (as live in production):
--   "anyone can select exercises"        — SELECT USING (true)
--   "trainers/admins manage exercises"   — ALL USING (EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = auth.uid()
--         AND profiles.role IN ('trainer','studio_admin','studio_trainer')))
