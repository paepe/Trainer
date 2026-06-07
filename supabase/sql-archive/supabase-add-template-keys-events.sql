-- Migration: Add template_key and params columns to trainer_alerts and operational_tasks
-- Purpose: Extend the multilingual architecture to the events/alert pipeline.
--   Trainer alerts and operational tasks are system messages that must
--   follow the same template-key pattern as notification_log for
--   render-on-consume and analytics integrity.

ALTER TABLE trainer_alerts
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb;

ALTER TABLE operational_tasks
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN trainer_alerts.template_key IS 'i18n template key (e.g., high_pain_alert). Used with params to render localized content on the trainer device.';
COMMENT ON COLUMN trainer_alerts.params IS 'Template interpolation parameters (JSONB). e.g., {"region": "lower_back", "intensity": 8}';
COMMENT ON COLUMN operational_tasks.template_key IS 'i18n template key (e.g., review_pain). Used with params to render localized content on the trainer device.';
COMMENT ON COLUMN operational_tasks.params IS 'Template interpolation parameters (JSONB). e.g., {"region": "lower_back", "intensity": 8}';
