// Privacy-minimized AI usage telemetry. Disabled by default until endpoint
// instrumentation and the production HMAC secret are fully rolled out.

import { createHmac, randomUUID } from 'node:crypto';
import { authServiceHeaders, authSupabaseUrl } from './auth.js';

export type AIEndpoint =
  | 'generate-smart-workout' | 'generate-workout' | 'translate-exercise-content'
  | 'parse-voice' | 'cleanup-voice-note' | 'generate-amplified'
  | 'classify-exercises' | 'send-welcome-message';

export interface AIUsageEvent {
  actorId: string;
  endpoint: AIEndpoint;
  outcome: 'succeeded' | 'provider_failed' | 'rejected' | 'degraded';
  httpStatus: number;
  rejectionCode?: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

function telemetryEnabled(): boolean {
  return process.env.AI_USAGE_TELEMETRY_ENABLED === 'true';
}

function hashActor(actorId: string): string | null {
  const secret = process.env.AI_USAGE_TELEMETRY_HMAC_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(actorId).digest('hex');
}

/** Best effort only: it never retries or changes the request outcome. */
export async function emitAIUsageEvent(event: AIUsageEvent): Promise<void> {
  if (!telemetryEnabled()) return;
  const actorHash = hashActor(event.actorId);
  if (!actorHash) {
    console.error('[ai-telemetry] unavailable');
    return;
  }

  const inputTokens = event.inputTokens;
  const outputTokens = event.outputTokens;
  try {
    const response = await fetch(`${authSupabaseUrl()}/rest/v1/ai_usage_events`, {
      method: 'POST',
      headers: { ...authServiceHeaders(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        request_id: randomUUID(),
        actor_hash: actorHash,
        endpoint: event.endpoint,
        outcome: event.outcome,
        http_status: event.httpStatus,
        rejection_code: event.rejectionCode ?? null,
        provider: event.provider ?? null,
        model: event.model ?? null,
        input_tokens: inputTokens ?? null,
        output_tokens: outputTokens ?? null,
        total_tokens: inputTokens != null || outputTokens != null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null,
        cost_method: inputTokens != null || outputTokens != null ? 'provider_usage' : 'unavailable',
      }),
    });
    if (!response.ok) console.error('[ai-telemetry] write failed:', response.status);
  } catch {
    console.error('[ai-telemetry] write unavailable');
  }
}
