-- Feature Permission Matrix — 2026-06-16
-- Single source of truth for plan_key × feature_key access control.
-- New plans or feature bundles require only INSERT/UPDATE here — zero code changes.
--
-- RLS: public read (no user data stored); write restricted to service_role.

CREATE TABLE IF NOT EXISTS public.feature_permissions (
  feature_key   TEXT    NOT NULL,
  plan_key      TEXT    NOT NULL,
  allowed       BOOLEAN NOT NULL DEFAULT false,
  limit_value   INTEGER,          -- nullable; used for numeric caps (e.g. clients.limit = 3)
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feature_key, plan_key)
);

ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;

-- Any authenticated (or anonymous) user may read the matrix.
CREATE POLICY "feature_permissions_public_read"
  ON public.feature_permissions
  FOR SELECT
  USING (true);

-- Only service_role may mutate.
-- (No INSERT/UPDATE/DELETE policy → defaults to deny for non-service roles.)

-- ── Seed ─────────────────────────────────────────────────────────────────────
-- feature_key taxonomy:
--   scores.basic          — 4 free predictive scores
--   scores.advanced       — 5 advanced predictive scores (fatigue/recovery/etc.)
--   ai.checkin_adjustment — AI adapts workout based on daily check-in data
--   ai.advanced_analysis  — trend analysis, body rhythm full tracking
--   coach_dna             — Coach DNA questionnaire + archetype engine
--   clients.limit         — max active trainer_clients (NULL = unlimited)
--   studio.branding       — custom studio branding
--   marketplace.listing   — trainer listing on public marketplace
--   marketplace.revenue_share — 15% revenue share on marketplace clients

INSERT INTO public.feature_permissions (feature_key, plan_key, allowed, limit_value) VALUES

-- ── Client plans ─────────────────────────────────────────────────────────────
('scores.basic',           'free',           true,  NULL),
('scores.advanced',        'free',           false, NULL),
('ai.checkin_adjustment',  'free',           false, NULL),
('ai.advanced_analysis',   'free',           false, NULL),

('scores.basic',           'ai_fitness',     true,  NULL),
('scores.advanced',        'ai_fitness',     false, NULL),
('ai.checkin_adjustment',  'ai_fitness',     true,  NULL),
('ai.advanced_analysis',   'ai_fitness',     false, NULL),

('scores.basic',           'ai_performance', true,  NULL),
('scores.advanced',        'ai_performance', true,  NULL),
('ai.checkin_adjustment',  'ai_performance', true,  NULL),
('ai.advanced_analysis',   'ai_performance', true,  NULL),

-- ── Trainer plans ─────────────────────────────────────────────────────────────
('clients.limit',          'trial',          true,  3),
('coach_dna',              'trial',          false, NULL),
('studio.branding',        'trial',          false, NULL),
('marketplace.listing',    'trial',          false, NULL),
('marketplace.revenue_share', 'trial',       false, NULL),

('clients.limit',          'pro',            true,  NULL),   -- NULL = unlimited
('coach_dna',              'pro',            true,  NULL),
('studio.branding',        'pro',            true,  NULL),
('marketplace.listing',    'pro',            false, NULL),
('marketplace.revenue_share', 'pro',         false, NULL),

('clients.limit',          'elite',          true,  NULL),
('coach_dna',              'elite',          true,  NULL),
('studio.branding',        'elite',          true,  NULL),
('marketplace.listing',    'elite',          true,  NULL),
('marketplace.revenue_share', 'elite',       true,  NULL)

ON CONFLICT (feature_key, plan_key) DO UPDATE
  SET allowed     = EXCLUDED.allowed,
      limit_value = EXCLUDED.limit_value,
      updated_at  = now();
