import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
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

  const { returnUrl } = req.body as { returnUrl?: string };
  // Identity comes exclusively from the verified JWT — body userId is ignored.
  const userId = caller.id;

  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    const customerId: string | undefined = (sub as any)?.stripe_customer_id;
    if (!customerId) return res.status(404).json({ error: 'No Stripe customer found for this user' });

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: returnUrl ?? process.env.APP_URL ?? 'https://trainer.app',
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[billing-portal]', err);
    return res.status(500).json({ error: 'Portal session creation failed' });
  }
}
