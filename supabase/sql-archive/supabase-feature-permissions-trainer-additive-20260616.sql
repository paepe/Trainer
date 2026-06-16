-- Trainer feature permissions — additive/accumulative model
-- trial → pro → elite: each tier inherits everything below it.
-- Trainer plans also include client-side features (scores, AI) at the level
-- appropriate to that tier, since trainers are also practitioners.
--
-- Applied to prod 2026-06-16.

delete from public.feature_permissions where plan_key in ('trial', 'pro', 'elite');

insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
-- ── TRIAL ────────────────────────────────────────────────────────────────────
('clients.limit',             'trial', true,  3),
('coach_dna',                 'trial', false, null),
('studio.branding',           'trial', false, null),
('marketplace.listing',       'trial', false, null),
('marketplace.revenue_share', 'trial', false, null),
('scores.basic',              'trial', true,  null),
('scores.advanced',           'trial', false, null),
('ai.checkin_adjustment',     'trial', false, null),
('ai.advanced_analysis',      'trial', false, null),

-- ── PRO ──────────────────────────────────────────────────────────────────────
('clients.limit',             'pro',   true,  50),
('coach_dna',                 'pro',   true,  null),
('studio.branding',           'pro',   true,  null),
('marketplace.listing',       'pro',   false, null),
('marketplace.revenue_share', 'pro',   false, null),
('scores.basic',              'pro',   true,  null),
('scores.advanced',           'pro',   true,  null),
('ai.checkin_adjustment',     'pro',   true,  null),
('ai.advanced_analysis',      'pro',   true,  null),

-- ── ELITE ────────────────────────────────────────────────────────────────────
('clients.limit',             'elite', true,  null),
('coach_dna',                 'elite', true,  null),
('studio.branding',           'elite', true,  null),
('marketplace.listing',       'elite', true,  null),
('marketplace.revenue_share', 'elite', true,  null),
('scores.basic',              'elite', true,  null),
('scores.advanced',           'elite', true,  null),
('ai.checkin_adjustment',     'elite', true,  null),
('ai.advanced_analysis',      'elite', true,  null);
