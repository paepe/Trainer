import type {
  BillingProvider, BillingConfig,
  CheckoutRequest, CheckoutResult,
  PortalRequest, PortalResult,
} from '../types';

function resolveApiBase(): string {
  if (typeof window === 'undefined') return import.meta.env.VITE_API_URL ?? '';
  return (
    import.meta.env.VITE_API_URL
    || (window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : window.location.origin)
  );
}

export function createStripeProvider(config: BillingConfig): BillingProvider {
  const base = resolveApiBase();

  return {
    async requestCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
      const planPricing = config.plans[req.planKey];
      if (!planPricing) {
        return { ok: false, error: `No pricing configured for plan "${req.planKey}"` };
      }

      const priceId = req.billingCycle === 'annual' ? planPricing.annual : planPricing.monthly;
      if (!priceId) {
        return { ok: false, error: `Price ID not set for ${req.planKey}/${req.billingCycle} — populate billing.config.json` };
      }

      try {
        const res = await fetch(`${base}/api/create-checkout-session`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId:       req.userId,
            priceId,
            planKey:      req.planKey,
            billingCycle: req.billingCycle,
            email:        req.email,
            successUrl:   req.successUrl ?? window.location.origin,
            cancelUrl:    req.cancelUrl  ?? window.location.href,
          }),
        });

        const json = await res.json().catch(() => ({})) as { url?: string; error?: string };
        if (!res.ok || !json.url) return { ok: false, error: json.error ?? 'Checkout session creation failed' };
        return { ok: true, url: json.url };
      } catch (err) {
        return { ok: false, error: (err as Error).message ?? 'Network error' };
      }
    },

    async openPortal(req: PortalRequest): Promise<PortalResult> {
      try {
        const res = await fetch(`${base}/api/billing-portal`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId:    req.userId,
            returnUrl: req.returnUrl ?? window.location.origin,
          }),
        });

        const json = await res.json().catch(() => ({})) as { url?: string; error?: string };
        if (!res.ok || !json.url) return { ok: false, error: json.error ?? 'Portal session creation failed' };
        return { ok: true, url: json.url };
      } catch (err) {
        return { ok: false, error: (err as Error).message ?? 'Network error' };
      }
    },
  };
}
