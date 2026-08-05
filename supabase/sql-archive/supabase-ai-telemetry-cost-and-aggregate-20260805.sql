-- AI Fair Use / Fase 2 — versioned price catalogue and privacy-minimized
-- daily aggregates. REVIEW ONLY: do not apply to production without explicit
-- approval. No prompt, transcript, response, raw user ID or IP is stored.

CREATE TABLE IF NOT EXISTS public.ai_model_price_catalog (
  id                                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                                text NOT NULL,
  model_alias                             text NOT NULL,
  billing_model                           text NOT NULL,
  effective_from                          timestamptz NOT NULL,
  effective_until                         timestamptz,
  currency                                char(3) NOT NULL DEFAULT 'USD',
  input_cache_hit_micros_per_million      bigint NOT NULL CHECK (input_cache_hit_micros_per_million >= 0),
  input_cache_miss_micros_per_million     bigint NOT NULL CHECK (input_cache_miss_micros_per_million >= 0),
  output_micros_per_million               bigint NOT NULL CHECK (output_micros_per_million >= 0),
  source_url                              text NOT NULL,
  source_checked_at                       timestamptz NOT NULL,
  created_at                              timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_until IS NULL OR effective_until > effective_from),
  UNIQUE (provider, model_alias, effective_from)
);

ALTER TABLE public.ai_model_price_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_model_price_catalog FROM PUBLIC, anon, authenticated;

-- `deepseek-chat` is the compatibility alias for DeepSeek-V4-Flash at the
-- provider's current published prices. Usage events do not currently expose
-- cache-hit split, so the aggregate deliberately prices all input as cache
-- miss. This is an upper-bound estimate, not a fabricated measured cost.
INSERT INTO public.ai_model_price_catalog (
  provider, model_alias, billing_model, effective_from, currency,
  input_cache_hit_micros_per_million, input_cache_miss_micros_per_million,
  output_micros_per_million, source_url, source_checked_at
) VALUES (
  'deepseek', 'deepseek-chat', 'deepseek-v4-flash', '2026-07-24 16:00:00+00', 'USD',
  2800, 140000, 280000,
  'https://api-docs.deepseek.com/quick_start/pricing', '2026-08-05 00:00:00+00'
)
ON CONFLICT (provider, model_alias, effective_from) DO NOTHING;

CREATE OR REPLACE VIEW public.ai_usage_daily_by_actor AS
SELECT
  date_trunc('day', occurred_at)::date AS usage_date,
  actor_hash,
  endpoint,
  plan_key,
  outcome,
  count(*) AS request_count,
  coalesce(sum(input_tokens), 0) AS input_tokens,
  coalesce(sum(output_tokens), 0) AS output_tokens,
  coalesce(sum(total_tokens), 0) AS total_tokens,
  coalesce(sum(cost_amount_micros), 0) AS recorded_cost_amount_micros
FROM public.ai_usage_events
GROUP BY 1, 2, 3, 4, 5;

REVOKE ALL ON TABLE public.ai_usage_daily_by_actor FROM PUBLIC, anon, authenticated;

-- Existing raw values remain authoritative when a future collector records a
-- provider-measured amount. Otherwise this computes a conservative cache-miss
-- estimate from the price version effective at the event timestamp.
CREATE OR REPLACE VIEW public.ai_usage_daily AS
WITH priced_events AS (
  SELECT
    event.*,
    price.currency AS catalog_currency,
    CASE
      WHEN event.cost_amount_micros IS NOT NULL THEN event.cost_amount_micros
      WHEN price.id IS NOT NULL AND (event.input_tokens IS NOT NULL OR event.output_tokens IS NOT NULL)
        THEN round((
          coalesce(event.input_tokens, 0)::numeric * price.input_cache_miss_micros_per_million
          + coalesce(event.output_tokens, 0)::numeric * price.output_micros_per_million
        ) / 1000000)::bigint
      ELSE NULL
    END AS resolved_cost_amount_micros,
    CASE
      WHEN event.cost_amount_micros IS NOT NULL THEN event.cost_method
      WHEN price.id IS NOT NULL AND (event.input_tokens IS NOT NULL OR event.output_tokens IS NOT NULL)
        THEN 'estimated_cache_miss'
      ELSE 'unavailable'
    END AS cost_quality
  FROM public.ai_usage_events AS event
  LEFT JOIN LATERAL (
    SELECT *
    FROM public.ai_model_price_catalog AS candidate
    WHERE candidate.provider = event.provider
      AND candidate.model_alias = event.model
      AND candidate.effective_from <= event.occurred_at
      AND (candidate.effective_until IS NULL OR candidate.effective_until > event.occurred_at)
    ORDER BY candidate.effective_from DESC
    LIMIT 1
  ) AS price ON true
)
SELECT
  date_trunc('day', occurred_at)::date AS usage_date,
  endpoint,
  plan_key,
  outcome,
  count(*) AS request_count,
  coalesce(sum(input_tokens), 0) AS input_tokens,
  coalesce(sum(output_tokens), 0) AS output_tokens,
  coalesce(sum(total_tokens), 0) AS total_tokens,
  coalesce(sum(resolved_cost_amount_micros), 0) AS cost_amount_micros,
  max(catalog_currency) AS cost_currency,
  CASE WHEN bool_or(cost_quality = 'estimated_cache_miss') THEN 'estimated_cache_miss'
       WHEN bool_or(cost_quality = 'provider_usage') THEN 'provider_usage'
       ELSE 'unavailable'
  END AS cost_quality
FROM priced_events
GROUP BY 1, 2, 3, 4;

REVOKE ALL ON TABLE public.ai_usage_daily FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.ai_model_price_catalog IS
  'Versioned provider pricing for AI-cost aggregates. Raw event content and raw user identifiers are prohibited.';
COMMENT ON VIEW public.ai_usage_daily_by_actor IS
  'Administrative-only pseudonymous daily aggregate by actor HMAC, endpoint, plan and outcome.';
