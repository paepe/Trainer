// ─── Billing module public types ──────────────────────────────────────────────
// All provider implementations must satisfy these contracts.
// The rest of the app imports only from here — never from a specific provider.

export type BillingCycle = 'monthly' | 'annual';

export type BillingProviderName = 'stripe' | 'mock';

// ── Config (shape of billing.config.json) ────────────────────────────────────

export interface PlanPricing {
  monthly: string;   // provider-specific price/product ID (e.g. Stripe price_*)
  annual:  string;
}

export interface BillingConfig {
  provider:  BillingProviderName;
  currency:  string;                          // ISO 4217 (e.g. "EUR")
  plans:     Record<string, PlanPricing>;     // keyed by plan_key
}

// ── Checkout ─────────────────────────────────────────────────────────────────

export interface CheckoutRequest {
  userId:       string;
  planKey:      string;
  billingCycle: BillingCycle;
  email?:       string;             // pre-fills the checkout form
  successUrl?:  string;             // defaults to window.location.origin
  cancelUrl?:   string;
}

export type CheckoutResult =
  | { ok: true;  url: string }      // redirect to this URL (hosted checkout)
  | { ok: false; error: string };

// ── Portal (manage / cancel subscription) ────────────────────────────────────

export interface PortalRequest {
  userId:     string;
  returnUrl?: string;
}

export type PortalResult =
  | { ok: true;  url: string }
  | { ok: false; error: string };

// ── Provider interface ────────────────────────────────────────────────────────

export interface BillingProvider {
  requestCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  openPortal(req: PortalRequest):        Promise<PortalResult>;
}
