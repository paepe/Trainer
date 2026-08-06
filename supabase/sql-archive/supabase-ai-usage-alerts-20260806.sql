-- Phase 5: administrative, minimised alert trail. No prompt, response, IP,
-- health data or raw actor identifier may be written here.
CREATE TABLE IF NOT EXISTS public.ai_usage_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days',
  actor_hash text NULL CHECK (actor_hash IS NULL OR length(actor_hash) = 64),
  endpoint text NULL CHECK (endpoint IS NULL OR length(endpoint) <= 80),
  plan_key text NULL CHECK (plan_key IS NULL OR length(plan_key) <= 80),
  alert_kind text NOT NULL CHECK (alert_kind IN ('volume_anomaly','cost_anomaly','error_rate_anomaly','automation_suspected','limiter_unavailable')),
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','false_positive')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(evidence) <= 4096)
);
ALTER TABLE public.ai_usage_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_usage_alerts FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS ai_usage_alerts_open_idx ON public.ai_usage_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_alerts_expires_idx ON public.ai_usage_alerts(expires_at);
CREATE OR REPLACE FUNCTION public.create_ai_usage_alert(p_actor_hash text, p_endpoint text, p_plan_key text, p_alert_kind text, p_severity text, p_evidence jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_actor_hash IS NOT NULL AND length(p_actor_hash) <> 64 OR length(p_endpoint) > 80 OR length(p_plan_key) > 80 OR p_alert_kind NOT IN ('volume_anomaly','cost_anomaly','error_rate_anomaly','automation_suspected','limiter_unavailable') OR p_severity NOT IN ('info','warning','critical') OR pg_column_size(coalesce(p_evidence, '{}'::jsonb)) > 4096 THEN RAISE EXCEPTION 'invalid AI usage alert'; END IF;
  INSERT INTO public.ai_usage_alerts(actor_hash, endpoint, plan_key, alert_kind, severity, evidence) VALUES (p_actor_hash, p_endpoint, p_plan_key, p_alert_kind, p_severity, coalesce(p_evidence, '{}'::jsonb)) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_ai_usage_alert(text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ai_usage_alert(text,text,text,text,text,jsonb) TO service_role;
