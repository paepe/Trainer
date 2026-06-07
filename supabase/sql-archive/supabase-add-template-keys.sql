-- Migration: Add template_key and params columns to notification_log
-- Purpose: Store semantic template identifiers instead of raw localized text.
--   English (en) is the canonical storage language for analytics integrity.
--   Translation happens on the recipient's device via i18n.t(template_key, params).

ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_notification_log_template_key ON notification_log(template_key) WHERE template_key IS NOT NULL;

COMMENT ON COLUMN notification_log.template_key IS 'i18n template key (e.g., workout_approved, high_pain_alert). Used with params to render localized content on the recipient device.';
COMMENT ON COLUMN notification_log.params IS 'Template interpolation parameters (JSONB). e.g., {"trainerName": "Klaus", "score": 72}';
