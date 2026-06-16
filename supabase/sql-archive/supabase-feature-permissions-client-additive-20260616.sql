-- Client feature permissions — additive/accumulative model
-- free → ai_fitness → ai_performance: each tier inherits everything below it.
--
-- free           → base: scores.basic only, no AI
-- ai_fitness     → free + ai.checkin_adjustment (smart workout generation)
-- ai_performance → ai_fitness + scores.advanced + ai.advanced_analysis (predictive layer)
--
-- Applied to prod 2026-06-16.

delete from public.feature_permissions where plan_key in ('free', 'ai_fitness', 'ai_performance');

insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
-- ── FREE ─────────────────────────────────────────────────────────────────────
('scores.basic',          'free',           true,  null),
('scores.advanced',       'free',           false, null),
('ai.checkin_adjustment', 'free',           false, null),
('ai.advanced_analysis',  'free',           false, null),

-- ── AI FITNESS ───────────────────────────────────────────────────────────────
('scores.basic',          'ai_fitness',     true,  null),
('scores.advanced',       'ai_fitness',     false, null),
('ai.checkin_adjustment', 'ai_fitness',     true,  null),
('ai.advanced_analysis',  'ai_fitness',     false, null),

-- ── AI PERFORMANCE ───────────────────────────────────────────────────────────
('scores.basic',          'ai_performance', true,  null),
('scores.advanced',       'ai_performance', true,  null),
('ai.checkin_adjustment', 'ai_performance', true,  null),
('ai.advanced_analysis',  'ai_performance', true,  null);
