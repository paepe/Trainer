import type { BillingProvider, CheckoutRequest, CheckoutResult, PortalRequest, PortalResult } from '../types';

// Mock provider — no external calls, no credentials required.
// Simulates a successful checkout/portal redirect for dev and test environments.
// Switch billing.config.json provider to "stripe" for production.
export const mockProvider: BillingProvider = {
  async requestCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const successUrl = req.successUrl ?? window.location.origin;
    // Simulate async latency so UI loading states are exercised.
    await new Promise(r => setTimeout(r, 600));
    // In mock mode we skip the actual payment and redirect to success directly.
    return { ok: true, url: `${successUrl}?billing_mock=1&plan=${req.planKey}&cycle=${req.billingCycle}` };
  },

  async openPortal(req: PortalRequest): Promise<PortalResult> {
    await new Promise(r => setTimeout(r, 400));
    return { ok: true, url: req.returnUrl ?? window.location.origin };
  },
};
