-- Migration: Add missing extended preferences columns
-- These columns are required by the Settings screen but were never declared in the canonical schema.
-- Run in Supabase SQL Editor.

alter table preferences
  add column if not exists default_location         text    default 'gym',
  add column if not exists default_duration_min     int     default 45,
  add column if not exists preferred_intensity      text    default 'moderate',
  add column if not exists plan_expiry_days         int     default 10,
  add column if not exists workout_ready_expiry_min int     default 30,
  add column if not exists light_palette            text    default 'arctic',
  add column if not exists ai_focus_strength        int     default 5,
  add column if not exists ai_focus_endurance       int     default 5,
  add column if not exists ai_focus_mobility        int     default 5,
  add column if not exists session_history_limit    int     default 50,
  add column if not exists trainer_dashboard_limit  int     default 10,
  add column if not exists language                 text    default 'en',
  add column if not exists white_label              boolean default false;
