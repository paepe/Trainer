-- Shared translation cache for trainer-authored exercise content (Open
-- Finding, docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md — manually-entered
-- exercise names/notes render untranslated to a client on a different
-- profile language). Applied directly to production (sevenseeds.trainer,
-- xbfszzdyskwdctlqzztl); no staging environment exists for this project.
--
-- Keyed on (source_text, target_locale) so the same phrase — "Agachamento
-- Livre" translated to en — is translated once and reused across every
-- trainer and plan that uses it. Deliberately no RLS policies: only
-- api/translate-exercise-content.ts touches this table, via the service
-- role (bypasses RLS by design, same pattern as the auth helpers already
-- inlined in generate-smart-workout.ts). No client ever queries it directly.
--
-- Rollback: drop table public.exercise_content_translations;

create table public.exercise_content_translations (
  id              uuid primary key default gen_random_uuid(),
  source_text     text not null,
  target_locale   text not null,
  translated_text text not null,
  created_at      timestamptz not null default now(),
  unique (source_text, target_locale)
);

alter table public.exercise_content_translations enable row level security;
