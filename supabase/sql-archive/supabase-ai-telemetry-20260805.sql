-- AI Fair Use / Fase 2 — privacy-minimized AI usage telemetry.
-- REVIEW ONLY: do not apply to production until the data contract, 90-day
-- retention, and production secret/feature-flag rollout are approved.

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          uuid NOT NULL UNIQUE,
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  actor_hash          text NOT NULL CHECK (length(actor_hash) = 64),
  operation_key       text CHECK (operation_key IS NULL OR length(operation_key) = 64),
  endpoint            text NOT NULL CHECK (endpoint IN (
    'generate-smart-workout', 'generate-workout', 'translate-exercise-content',
    'parse-voice', 'cleanup-voice-note', 'generate-amplified',
    'classify-exercises', 'send-welcome-message'
  )),
  outcome             text NOT NULL CHECK (outcome IN ('succeeded', 'provider_failed', 'rejected', 'degraded')),
  http_status         smallint NOT NULL CHECK (http_status BETWEEN 100 AND 599),
  rejection_code      text,
  plan_key            text,
  provider            text,
  model               text,
  input_tokens        integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens       integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  total_tokens        integer CHECK (total_tokens IS NULL OR total_tokens >= 0),
  cost_amount_micros  bigint CHECK (cost_amount_micros IS NULL OR cost_amount_micros >= 0),
  cost_currency       char(3),
  cost_method         text NOT NULL DEFAULT 'unavailable' CHECK (cost_method IN ('provider_usage', 'estimated', 'unavailable'))
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_occurred_endpoint
  ON public.ai_usage_events (occurred_at DESC, endpoint);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_actor_occurred
  ON public.ai_usage_events (actor_hash, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_expires_at
  ON public.ai_usage_events (expires_at);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_usage_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.ai_usage_daily AS
SELECT
  date_trunc('day', occurred_at)::date AS usage_date,
  endpoint,
  plan_key,
  outcome,
  count(*) AS request_count,
  coalesce(sum(input_tokens), 0) AS input_tokens,
  coalesce(sum(output_tokens), 0) AS output_tokens,
  coalesce(sum(total_tokens), 0) AS total_tokens,
  coalesce(sum(cost_amount_micros), 0) AS cost_amount_micros
FROM public.ai_usage_events
GROUP BY 1, 2, 3, 4;

REVOKE ALL ON TABLE public.ai_usage_daily FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_expired_ai_usage_events()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted bigint;
BEGIN
  DELETE FROM public.ai_usage_events WHERE expires_at <= now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expired_ai_usage_events() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_expired_ai_usage_events() TO service_role;

COMMENT ON TABLE public.ai_usage_events IS
  'Minimized AI usage events. Never stores prompts, responses, transcripts, health data, raw IDs, IPs, or device identifiers.';
