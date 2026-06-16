import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, returnUrl } = req.body as { userId: string; returnUrl?: string };
  if (!userId) return res.status(400).json({ error: 'userId is required' });

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
