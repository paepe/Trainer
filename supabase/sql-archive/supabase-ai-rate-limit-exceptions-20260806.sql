CREATE TABLE IF NOT EXISTS public.ai_rate_limit_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_hash text NOT NULL CHECK (length(actor_hash) = 64),
  endpoint text NULL CHECK (endpoint IS NULL OR length(endpoint) <= 80),
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
  approved_by text NOT NULL CHECK (length(approved_by) BETWEEN 3 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '7 days')
);
ALTER TABLE public.ai_rate_limit_exceptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_rate_limit_exceptions FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS ai_rate_limit_exceptions_active_idx ON public.ai_rate_limit_exceptions(actor_hash, endpoint, expires_at) WHERE revoked_at IS NULL;
CREATE OR REPLACE FUNCTION public.has_active_ai_rate_limit_exception(p_actor_hash text, p_endpoint text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT exists (SELECT 1 FROM public.ai_rate_limit_exceptions WHERE actor_hash = p_actor_hash AND (endpoint IS NULL OR endpoint = p_endpoint) AND revoked_at IS NULL AND expires_at > now());
$$;
REVOKE ALL ON FUNCTION public.has_active_ai_rate_limit_exception(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_ai_rate_limit_exception(text,text) TO service_role;
