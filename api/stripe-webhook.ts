import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Idempotency guard — skip events already processed.
async function alreadyProcessed(eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('stripe_processed_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();
  return !!data;
}

async function markProcessed(eventId: string, type: string) {
  await supabase.from('stripe_processed_events').insert({ stripe_event_id: eventId, event_type: type });
}

async function upsertSubscription(params: {
  userId:            string;
  stripeCustomerId:  string;
  stripeSubId:       string;
  planKey:           string;
  status:            string;
  currentPeriodEnd:  number;
}) {
  await supabase.from('subscriptions').upsert({
    user_id:             params.userId,
    stripe_customer_id:  params.stripeCustomerId,
    stripe_sub_id:       params.stripeSubId,
    plan_key:            params.planKey,
    status:              params.status,
    current_period_end:  new Date(params.currentPeriodEnd * 1000).toISOString(),
    updated_at:          new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    const raw = await buffer(req);
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (await alreadyProcessed(event.id)) return res.status(200).json({ skipped: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const userId = sub.metadata['supabase_user_id'] ?? session.metadata?.['supabase_user_id'];
        if (!userId) { console.error('[stripe-webhook] missing supabase_user_id in metadata'); break; }

        await upsertSubscription({
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubId:      sub.id,
          planKey:          sub.metadata['plan_key'] ?? 'free',
          status:           sub.status,
          currentPeriodEnd: (sub as any).current_period_end,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata['supabase_user_id'];
        if (!userId) break;

        await upsertSubscription({
          userId,
          stripeCustomerId: sub.customer as string,
          stripeSubId:      sub.id,
          planKey:          sub.metadata['plan_key'] ?? 'free',
          status:           sub.status,
          currentPeriodEnd: (sub as any).current_period_end,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata['supabase_user_id'];
        if (!userId) break;

        await supabase.from('subscriptions').update({
          plan_key:           'free',
          status:             'canceled',
          current_period_end: null,
          updated_at:         new Date().toISOString(),
        }).eq('user_id', userId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase.from('subscriptions').update({
          status:     'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId);
        break;
      }

      default:
        // Unhandled event type — ignore, still mark processed.
        break;
    }

    await markProcessed(event.id, event.type);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] handler error', event.type, err);
    // Do NOT mark processed — Stripe will retry.
    return res.status(500).json({ error: 'Internal error' });
  }
}
