import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
// Auth helpers moved to api/_lib/auth — Fase 2 of
// docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md (isTrainerRole and
// hasActiveLink were defined here but never called — dropped, not migrated,
// per the same discipline applied to billing-portal.ts in Fase 0).
import { verifyRequestUser } from './_lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-06-24.dahlia' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await verifyRequestUser(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });

  const { priceId, planKey, billingCycle, email, successUrl, cancelUrl } = req.body as {
    priceId:      string;
    planKey:      string;
    billingCycle: 'monthly' | 'annual';
    email?:       string;
    successUrl?:  string;
    cancelUrl?:   string;
  };

  // Identity comes exclusively from the verified JWT — body userId is ignored.
  const userId = caller.id;

  if (!priceId || !planKey) {
    return res.status(400).json({ error: 'priceId and planKey are required' });
  }

  try {
    // Look up or create Stripe customer keyed to userId
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let customerId: string | undefined = (sub as any)?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode:        'subscription',
      customer:    customerId,
      line_items:  [{ price: priceId, quantity: 1 }],
      success_url: `${successUrl}?plan=${planKey}&cycle=${billingCycle}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancelUrl,
      metadata:    { supabase_user_id: userId, plan_key: planKey, billing_cycle: billingCycle },
      subscription_data: { metadata: { supabase_user_id: userId, plan_key: planKey } },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout-session]', err);
    return res.status(500).json({ error: 'Checkout session creation failed' });
  }
}
