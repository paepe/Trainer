// ─── Billing module public API ────────────────────────────────────────────────
// Single import point for the rest of the app.
// Provider is resolved once at module load from billing.config.json.
// To switch from mock → Stripe: change "provider" in billing.config.json + set env vars.

import type { BillingProvider, BillingConfig, CheckoutRequest, CheckoutResult, PortalRequest, PortalResult } from './types';
import { mockProvider }          from './providers/mock';
import { createStripeProvider }  from './providers/stripe';
import config                    from './billing.config.json';

const billingConfig = config as BillingConfig;

function resolveProvider(): BillingProvider {
  switch (billingConfig.provider) {
    case 'stripe': return createStripeProvider(billingConfig);
    case 'mock':   return mockProvider;
    default:       throw new Error(`Unknown billing provider: "${(billingConfig as any).provider}"`);
  }
}

const provider = resolveProvider();

export async function requestCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  return provider.requestCheckout(req);
}

export async function openPortal(req: PortalRequest): Promise<PortalResult> {
  return provider.openPortal(req);
}

export type { BillingCycle, CheckoutRequest, CheckoutResult, PortalRequest, PortalResult, BillingConfig } from './types';
