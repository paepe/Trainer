-- AI Fair Use / Fase 1 — atomic idempotency claims for paid AI operations.
-- REVIEW ONLY: do not apply to production until explicitly approved together
-- with AI_OPERATION_IDEMPOTENCY_HMAC_SECRET and the feature flag rollout.

CREATE TABLE IF NOT EXISTS public.ai_operation_claims (
  operation_key  text PRIMARY KEY,
  operation_type text NOT NULL,
  status         text NOT NULL CHECK (status IN ('processing', 'completed')),
  locked_until   timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);

ALTER TABLE public.ai_operation_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_operation_claims FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_ai_operation(
  p_operation_key text,
  p_operation_type text,
  p_lease_seconds integer DEFAULT 90
)
RETURNS TABLE(claimed boolean, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF p_operation_key IS NULL OR length(p_operation_key) <> 64
     OR p_operation_type IS NULL OR length(p_operation_type) > 80
     OR p_lease_seconds < 15 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'invalid AI operation claim';
  END IF;

  INSERT INTO public.ai_operation_claims (
    operation_key, operation_type, status, locked_until
  ) VALUES (
    p_operation_key, p_operation_type, 'processing', now() + make_interval(secs => p_lease_seconds)
  )
  ON CONFLICT (operation_key) DO UPDATE
    SET status = 'processing',
        locked_until = now() + make_interval(secs => p_lease_seconds),
        completed_at = NULL
    WHERE ai_operation_claims.status = 'processing'
      AND ai_operation_claims.locked_until < now()
  RETURNING ai_operation_claims.status INTO v_status;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_status;
    RETURN;
  END IF;

  SELECT c.status INTO v_status
  FROM public.ai_operation_claims c
  WHERE c.operation_key = p_operation_key;
  RETURN QUERY SELECT false, coalesce(v_status, 'processing');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ai_operation(p_operation_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_operation_claims
  SET status = 'completed', completed_at = now(), locked_until = now()
  WHERE operation_key = p_operation_key AND status = 'processing'
  RETURNING true;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_operation(p_operation_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.ai_operation_claims
  WHERE operation_key = p_operation_key AND status = 'processing'
  RETURNING true;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_operation(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_ai_operation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_ai_operation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_ai_operation(text, text, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ai_operation(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ai_operation(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_operation(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ai_operation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_operation(text) TO service_role;

COMMENT ON TABLE public.ai_operation_claims IS
  'HMAC-keyed idempotency claims for expensive AI operations; contains no prompt, transcript, health data, or raw user identifier.';
