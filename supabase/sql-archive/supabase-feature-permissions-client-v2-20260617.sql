-- Client feature permissions v2 — novas feature keys por plano de aluno
-- Modelo aditivo: free → ai_fitness → ai_performance
--
-- Convenção workout.exercise_type:
--   limit_value = 0  → fitness apenas
--   limit_value = null → fitness + desempenho (sem restrição)
--
-- Aplicado a prod: 2026-06-17

-- ── workout.sessions_per_week ─────────────────────────────────────────────────
insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
('workout.sessions_per_week', 'free',           true, 1),
('workout.sessions_per_week', 'ai_fitness',     true, 7),
('workout.sessions_per_week', 'ai_performance', true, null)
on conflict (feature_key, plan_key) do update
  set allowed = excluded.allowed, limit_value = excluded.limit_value;

-- ── workout.exercises_per_session ─────────────────────────────────────────────
insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
('workout.exercises_per_session', 'free',           true, 2),
('workout.exercises_per_session', 'ai_fitness',     true, null),
('workout.exercises_per_session', 'ai_performance', true, null)
on conflict (feature_key, plan_key) do update
  set allowed = excluded.allowed, limit_value = excluded.limit_value;

-- ── workout.exercise_type (0=fitness only, null=all) ─────────────────────────
insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
('workout.exercise_type', 'free',           true, 0),
('workout.exercise_type', 'ai_fitness',     true, 0),
('workout.exercise_type', 'ai_performance', true, null)
on conflict (feature_key, plan_key) do update
  set allowed = excluded.allowed, limit_value = excluded.limit_value;

-- ── checkin.full ─────────────────────────────────────────────────────────────
insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
('checkin.full', 'free',           false, null),
('checkin.full', 'ai_fitness',     true,  null),
('checkin.full', 'ai_performance', true,  null)
on conflict (feature_key, plan_key) do update
  set allowed = excluded.allowed, limit_value = excluded.limit_value;

-- ── trainer_plan.days_per_week ────────────────────────────────────────────────
insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
('trainer_plan.days_per_week', 'free',           true, 1),
('trainer_plan.days_per_week', 'ai_fitness',     true, 3),
('trainer_plan.days_per_week', 'ai_performance', true, null)
on conflict (feature_key, plan_key) do update
  set allowed = excluded.allowed, limit_value = excluded.limit_value;

-- ── progress.fitness_advanced ─────────────────────────────────────────────────
insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
('progress.fitness_advanced', 'free',           false, null),
('progress.fitness_advanced', 'ai_fitness',     true,  null),
('progress.fitness_advanced', 'ai_performance', true,  null)
on conflict (feature_key, plan_key) do update
  set allowed = excluded.allowed, limit_value = excluded.limit_value;

-- ── progress.performance ──────────────────────────────────────────────────────
insert into public.feature_permissions (feature_key, plan_key, allowed, limit_value) values
('progress.performance', 'free',           false, null),
('progress.performance', 'ai_fitness',     false, null),
('progress.performance', 'ai_performance', true,  null)
on conflict (feature_key, plan_key) do update
  set allowed = excluded.allowed, limit_value = excluded.limit_value;
