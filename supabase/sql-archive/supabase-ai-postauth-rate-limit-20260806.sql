-- Phase 4 foundation. REVIEW/APPLY only with the disabled-by-default server
-- module and approved shadow rules; table contains HMAC actor keys only.
CREATE TABLE IF NOT EXISTS public.ai_rate_limit_buckets (
  actor_hash text NOT NULL CHECK (length(actor_hash) = 64),
  endpoint text NOT NULL CHECK (length(endpoint) <= 80),
  window_seconds integer NOT NULL CHECK (window_seconds BETWEEN 10 AND 3600),
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (actor_hash, endpoint, window_seconds, window_started_at)
);
ALTER TABLE public.ai_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_rate_limit_buckets FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS ai_rate_limit_buckets_expires_at_idx ON public.ai_rate_limit_buckets (expires_at);
CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit_bucket(p_actor_hash text, p_endpoint text, p_window_seconds integer, p_max_requests integer)
RETURNS TABLE(limited boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start timestamptz; v_count integer;
BEGIN
  IF length(p_actor_hash) <> 64 OR length(p_endpoint) > 80 OR p_window_seconds NOT BETWEEN 10 AND 3600 OR p_max_requests < 1 THEN RAISE EXCEPTION 'invalid AI rate-limit bucket'; END IF;
  v_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  DELETE FROM public.ai_rate_limit_buckets WHERE expires_at < now();
  INSERT INTO public.ai_rate_limit_buckets(actor_hash, endpoint, window_seconds, window_started_at, request_count, expires_at)
  VALUES (p_actor_hash, p_endpoint, p_window_seconds, v_start, 1, v_start + make_interval(secs => p_window_seconds * 2))
  ON CONFLICT (actor_hash, endpoint, window_seconds, window_started_at) DO UPDATE SET request_count = ai_rate_limit_buckets.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN QUERY SELECT v_count > p_max_requests;
END; $$;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit_bucket(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit_bucket(text, text, integer, integer) TO service_role;
COMMENT ON TABLE public.ai_rate_limit_buckets IS 'Short-lived HMAC actor buckets for approved post-auth AI rate limiting; no content or raw identifiers.';
