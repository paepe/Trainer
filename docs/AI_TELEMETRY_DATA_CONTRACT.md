# AI Telemetry Data Contract

**Status:** Fase 2 activated in production on 2026-08-05; observation-only, with no automatic enforcement

## Purpose

Measure AI cost and anomalous operational use without storing prompts, transcripts, model responses, health data, raw user identifiers, IP addresses, or payment details.

## Event schema

One event is emitted after an authenticated request reaches a terminal outcome. This covers provider-backed success/failure and post-auth, pre-provider rejection. Anonymous attempts do not create persistent per-attempt events.

| Field | Meaning | Privacy rule |
|---|---|---|
| `request_id` | Server-generated UUID for one event | No client-provided identifier accepted |
| `actor_hash` | HMAC-SHA-256 of the authenticated actor | No raw user ID |
| `operation_key` | Optional HMAC idempotency key derived from actor + client retry UUID | The retry UUID is never persisted; no raw user ID |
| `endpoint`, `outcome`, `http_status`, `rejection_code` | Operational result | Enumerated values only |
| `plan_key`, `provider`, `model` | Commercial/provider dimension | No billing identifier |
| `input_tokens`, `output_tokens`, `total_tokens` | Provider usage, when supplied | Numeric only |
| `cost_amount_micros`, `cost_currency`, `cost_method` | Measured or estimated cost | Explicit quality/method required |

## Explicit exclusions

The event table and all fallbacks must never contain: request/response body, prompt, transcript, exercise note, trainer philosophy, health or cycle information, email, name, raw UUID, IP address, device token, or error body.

Body Rhythm may be used by the workout-generation provider when the student has activated it, but it remains excluded from telemetry, diagnostics and operational events.

The idempotency claim store is not telemetry. It may retain the completed API response for at most 10 minutes, under RLS and `service_role` only, solely to return the same response to a transport retry without repeating a paid provider call. It is never used for analytics, alerts or support investigation.

## Retention and access proposal

- Retain raw events for **90 days**; `expires_at` is set at creation.
- Retain only aggregate daily views beyond that period, subject to a later business-retention decision.
- RLS is enabled with no client policies. Server-side service role writes events; administrative read access is not granted by this migration.
- Cleanup is an explicit service-role operation; it is not called on the user request path.

## Failure behavior

Telemetry is best-effort and never retries the AI call. A telemetry write failure may be logged only as a fixed event name and HTTP status; it must not include the event payload or source data.

## Cost method

`provider_usage` means the provider supplied token counts. `unavailable` means token/cost data was not supplied. The versioned production price catalogue calculates a conservative `estimated_cache_miss` cost for `deepseek-chat` when cache-token separation is unavailable; this quality is stated explicitly and is not represented as an exact charge.
