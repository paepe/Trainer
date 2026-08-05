-- AI Fair Use / Fase 2 — idempotency for retried, cost-bearing AI requests.
-- Extends the already-deployed HMAC claim table. The short-lived response is
-- service-role-only and lets a network retry receive the original outcome
-- without submitting the prompt to the provider again.

ALTER TABLE public.ai_operation_claims
  ADD COLUMN IF NOT EXISTS response_payload jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS ai_operation_claims_expires_at_idx
  ON public.ai_operation_claims (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_ai_request(
  p_operation_key text,
  p_operation_type text,
  p_lease_seconds integer DEFAULT 90
)
RETURNS TABLE(claimed boolean, status text, response_payload jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_response jsonb;
BEGIN
  IF p_operation_key IS NULL OR length(p_operation_key) <> 64
     OR p_operation_type IS NULL OR length(p_operation_type) > 80
     OR p_lease_seconds < 15 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'invalid AI request claim';
  END IF;

  INSERT INTO public.ai_operation_claims (
    operation_key, operation_type, status, locked_until, response_payload, expires_at
  ) VALUES (
    p_operation_key, p_operation_type, 'processing',
    now() + make_interval(secs => p_lease_seconds), NULL, NULL
  )
  ON CONFLICT (operation_key) DO UPDATE
    SET operation_type = EXCLUDED.operation_type,
        status = 'processing',
        locked_until = EXCLUDED.locked_until,
        completed_at = NULL,
        response_payload = NULL,
        expires_at = NULL
    WHERE (ai_operation_claims.status = 'processing' AND ai_operation_claims.locked_until < now())
       OR (ai_operation_claims.status = 'completed' AND ai_operation_claims.expires_at < now())
  RETURNING ai_operation_claims.status, ai_operation_claims.response_payload
  INTO v_status, v_response;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_status, v_response;
    RETURN;
  END IF;

  SELECT c.status, c.response_payload INTO v_status, v_response
  FROM public.ai_operation_claims c
  WHERE c.operation_key = p_operation_key;
  RETURN QUERY SELECT false, coalesce(v_status, 'processing'), v_response;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ai_request(
  p_operation_key text,
  p_response_payload jsonb,
  p_response_ttl_seconds integer DEFAULT 600
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed boolean;
BEGIN
  IF p_operation_key IS NULL OR length(p_operation_key) <> 64
     OR p_response_payload IS NULL
     OR p_response_ttl_seconds < 60 OR p_response_ttl_seconds > 900
     OR pg_column_size(p_response_payload) > 131072 THEN
    RAISE EXCEPTION 'invalid AI request completion';
  END IF;

  UPDATE public.ai_operation_claims
  SET status = 'completed',
      completed_at = now(),
      locked_until = now(),
      response_payload = p_response_payload,
      expires_at = now() + make_interval(secs => p_response_ttl_seconds)
  WHERE operation_key = p_operation_key AND status = 'processing'
  RETURNING true INTO v_completed;

  RETURN coalesce(v_completed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_request(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ai_request(text, jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_request(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ai_request(text, jsonb, integer) TO service_role;

COMMENT ON COLUMN public.ai_operation_claims.response_payload IS
  'Short-lived server response used only for retry idempotency; service_role-only, expires in at most 15 minutes.';
