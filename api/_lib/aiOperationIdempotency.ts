// Atomic operation claims for expensive AI flows. The feature is deliberately
// disabled until the reviewed SQL migration and HMAC secret are installed.

import { createHmac } from 'node:crypto';
import { authServiceHeaders, authSupabaseUrl } from './auth.js';

type ClaimState = 'claimed' | 'duplicate' | 'unavailable' | 'disabled';

export interface AIOperationClaim {
  state: ClaimState;
  key?: string;
}

export type AIRequestClaimState = 'claimed' | 'in_progress' | 'completed' | 'unavailable' | 'disabled';

export interface AIRequestClaim {
  state: AIRequestClaimState;
  key?: string;
  /** Cached server response, held only for the short retry lease. */
  response?: unknown;
}

function isEnabled(): boolean {
  return process.env.AI_OPERATION_IDEMPOTENCY_ENABLED === 'true';
}

function deriveKey(operationType: string, subjects: readonly string[]): string | null {
  const secret = process.env.AI_OPERATION_IDEMPOTENCY_HMAC_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret)
    .update([operationType, ...subjects].join(':'))
    .digest('hex');
}

export async function claimAIOperation(
  operationType: string,
  subjects: readonly string[],
  leaseSeconds = 90,
): Promise<AIOperationClaim> {
  if (!isEnabled()) return { state: 'disabled' };
  const key = deriveKey(operationType, subjects);
  if (!key) return { state: 'unavailable' };

  try {
    const response = await fetch(`${authSupabaseUrl()}/rest/v1/rpc/claim_ai_operation`, {
      method: 'POST',
      headers: { ...authServiceHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_operation_key: key,
        p_operation_type: operationType,
        p_lease_seconds: leaseSeconds,
      }),
    });
    if (!response.ok) return { state: 'unavailable' };
    const rows = await response.json() as { claimed?: boolean }[];
    return rows[0]?.claimed ? { state: 'claimed', key } : { state: 'duplicate' };
  } catch {
    return { state: 'unavailable' };
  }
}

/**
 * Claims one client retry token for a cost-bearing request. The supplied token
 * is never stored: it is HMAC-bound to the authenticated actor before it
 * reaches the database. A completed request returns its short-lived response
 * rather than calling the provider again.
 */
export async function claimAIRequest(
  operationType: string,
  actorId: string,
  retryToken: string | undefined,
  leaseSeconds = 90,
): Promise<AIRequestClaim> {
  if (!isEnabled() || !retryToken) return { state: 'disabled' };
  const key = deriveKey(operationType, [actorId, retryToken]);
  if (!key) return { state: 'unavailable' };

  try {
    const response = await fetch(`${authSupabaseUrl()}/rest/v1/rpc/claim_ai_request`, {
      method: 'POST',
      headers: { ...authServiceHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_operation_key: key,
        p_operation_type: operationType,
        p_lease_seconds: leaseSeconds,
      }),
    });
    if (!response.ok) return { state: 'unavailable' };
    const rows = await response.json() as { claimed?: boolean; status?: string; response_payload?: unknown }[];
    const row = rows[0];
    if (row?.claimed) return { state: 'claimed', key };
    if (row?.status === 'completed' && row.response_payload != null) {
      return { state: 'completed', key, response: row.response_payload };
    }
    return { state: 'in_progress', key };
  } catch {
    return { state: 'unavailable' };
  }
}

/** Completes the claim with a response retained only for a bounded retry window. */
export async function completeAIRequest(key: string | undefined, responsePayload: unknown): Promise<boolean> {
  if (!key) return false;
  try {
    const response = await fetch(`${authSupabaseUrl()}/rest/v1/rpc/complete_ai_request`, {
      method: 'POST',
      headers: { ...authServiceHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_operation_key: key, p_response_payload: responsePayload }),
    });
    if (!response.ok) return false;
    const rows = await response.json() as boolean[];
    return rows[0] === true;
  } catch {
    return false;
  }
}

export async function completeAIOperation(key: string | undefined): Promise<void> {
  if (!key) return;
  try {
    await fetch(`${authSupabaseUrl()}/rest/v1/rpc/complete_ai_operation`, {
      method: 'POST',
      headers: { ...authServiceHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_operation_key: key }),
    });
  } catch {
    // The notification itself is already persisted. The next retry checks it
    // before claiming again, so a completion-write failure cannot duplicate it.
  }
}

export async function releaseAIOperation(key: string | undefined): Promise<void> {
  if (!key) return;
  try {
    await fetch(`${authSupabaseUrl()}/rest/v1/rpc/release_ai_operation`, {
      method: 'POST',
      headers: { ...authServiceHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_operation_key: key }),
    });
  } catch {
    // The short lease is the safe recovery path if the release cannot persist.
  }
}
