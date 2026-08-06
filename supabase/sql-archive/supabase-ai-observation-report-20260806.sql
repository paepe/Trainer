-- Phase 2 operational report: aggregates only, never actor hashes/content.
CREATE OR REPLACE FUNCTION public.ai_usage_observation_report()
RETURNS TABLE(day date, endpoint text, plan_key text, outcome text, requests bigint, unique_actors bigint, total_tokens bigint, total_cost_micros bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT occurred_at::date, endpoint, coalesce(plan_key, 'unknown'), outcome,
    count(*)::bigint, count(DISTINCT actor_hash)::bigint,
    coalesce(sum(total_tokens), 0)::bigint, coalesce(sum(cost_amount_micros), 0)::bigint
  FROM public.ai_usage_events
  WHERE occurred_at >= now() - interval '30 days'
  GROUP BY 1,2,3,4 ORDER BY 1 DESC, 2, 3, 4;
$$;
REVOKE ALL ON FUNCTION public.ai_usage_observation_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_usage_observation_report() TO service_role;
