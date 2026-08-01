-- Fase 0 — docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md
-- Additive schema for the exercise-name language preference. Both tables are
-- append-only changes; exercise_content_translations has 0 rows at the time
-- of this migration, so widening its unique constraint is free here.

alter table public.preferences
  add column keep_exercise_names_in_english boolean not null default true;

alter table public.exercise_content_translations
  add column source_locale text,
  add column curated boolean not null default false;

alter table public.exercise_content_translations
  drop constraint exercise_content_translations_source_text_target_locale_key;

alter table public.exercise_content_translations
  add constraint exercise_content_translations_text_locales_key
  unique (source_text, source_locale, target_locale);
