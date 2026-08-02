-- Fase 0 de docs/WORKOUT_ACCESS_AND_CONTINUITY_PLAN.md — 2026-08-02
--
-- Contexto: `ai.checkin_adjustment` estava sendo usada para gatear a CRIAÇÃO
-- do treino por IA, quando por nome e por texto comercial (plans.text nos
-- locales) ela deveria gatear apenas o AJUSTE diário por energia/sono/fadiga.
-- Efeito: o tier Free nunca recebeu geração por IA, apesar de vendido com
-- "Algumas dicas de IA por semana". Decisão do líder do projeto (2026-08-02):
-- o Free passa a consumir IA na geração, sem calibração diária.
--
-- Esta migração:
--   1. Cria a chave `ai.workout_generation` (criação), permitida em todos os
--      tiers. `ai.checkin_adjustment` (ajuste) permanece com a configuração
--      atual — free/trial=false — e passa a significar só isso.
--   2. Corrige `workout.exercises_per_session` do Free: estava em 2, nunca
--      aplicada em nenhum ponto do código (achado 5 do plano), incompatível
--      até com o piso de 4 blocos de DEFAULT_SESSION_ORDER. Passa a 6 —
--      tamanho modal observado em planos reais gerados por IA (39/46 dos
--      planos com 5-6 exercícios, consulta em produção 2026-08-02).
--
-- Aplicação: aguardando autorização explícita do líder do projeto.
-- Rollback: ver bloco no final deste arquivo.

insert into feature_permissions (feature_key, plan_key, allowed, limit_value)
values
  ('ai.workout_generation', 'free',          true, null),
  ('ai.workout_generation', 'trial',         true, null),
  ('ai.workout_generation', 'pro',           true, null),
  ('ai.workout_generation', 'ai_fitness',    true, null),
  ('ai.workout_generation', 'ai_performance', true, null),
  ('ai.workout_generation', 'elite',         true, null)
on conflict (feature_key, plan_key) do update
  set allowed = excluded.allowed, limit_value = excluded.limit_value;

update feature_permissions
set limit_value = 6
where feature_key = 'workout.exercises_per_session' and plan_key = 'free';

-- ── Rollback ──────────────────────────────────────────────────────────────
-- delete from feature_permissions where feature_key = 'ai.workout_generation';
-- update feature_permissions set limit_value = 2
--   where feature_key = 'workout.exercises_per_session' and plan_key = 'free';
