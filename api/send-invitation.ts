// POST /api/send-invitation
// Trainer invites a candidate (with or without a TrAIner account) by email.
// 1. Validates exclusivity (candidate must not be actively linked to another trainer)
// 2. Creates a trainer_invitations row (service role — bypasses RLS, generates token)
// 3. Sends a transactional email via Resend with the accept-invite deep link
// Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
//           EMAIL_FROM, VITE_API_URL in env.
// See: policies/references/Trainer 2.0/trainer-invitation-flow-plan-20260607.md

import { randomUUID } from 'crypto';
import { verifyRequestUser, isTrainerRole } from '../lib/api-auth';

const INVITE_TTL_DAYS = 7;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await verifyRequestUser(req);
  if (!caller) return res.status(401).json({ error: 'Unauthorized' });

  const { trainerName, invitedEmail, invitedName } = req.body || {};
  if (!invitedEmail || !invitedName) {
    return res.status(400).json({ error: 'invitedEmail, invitedName required' });
  }

  // Inviter identity comes from the verified JWT; only trainer roles may invite.
  const trainerId = caller.id;
  if (!(await isTrainerRole(trainerId))) {
    return res.status(403).json({ error: 'Only trainers can send invitations' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL         || '';
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const appUrl      = process.env.VITE_API_URL              || '';
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });

  const restHeaders = {
    'Content-Type': 'application/json',
    apikey:         serviceKey,
    Authorization:  `Bearer ${serviceKey}`,
  };

  try {
    // ── 0. Plan limit guard — resolve trainer's real plan_key from DB (never trust client) ──
    // During trial window the effectivePlanKey is 'pro' (50 clients). After expiry it reverts
    // to 'trial' (3 clients). We resolve this server-side by checking current_period_end.
    const [subRes, permCountData] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/subscriptions?select=plan_key,current_period_end&user_id=eq.${encodeURIComponent(trainerId)}&limit=1`,
        { headers: restHeaders },
      ),
      fetch(
        `${supabaseUrl}/rest/v1/trainer_clients?select=id&trainer_id=eq.${encodeURIComponent(trainerId)}&status=eq.active`,
        { headers: restHeaders },
      ),
    ]);

    // Resolve effective plan key server-side (mirrors useEffectivePlanKey logic)
    let resolvedPlanKey = 'trial';
    if (subRes.ok) {
      const subRows = await subRes.json() as { plan_key: string; current_period_end: string | null }[];
      const sub = subRows[0];
      if (sub) {
        const isInWindow = sub.current_period_end && new Date(sub.current_period_end) > new Date();
        if (sub.plan_key === 'trial' && isInWindow) {
          resolvedPlanKey = 'pro';   // trial window active → PRO limits
        } else if (sub.plan_key === 'free' && isInWindow) {
          resolvedPlanKey = 'ai_fitness'; // welcome window active → ai_fitness limits
        } else {
          resolvedPlanKey = sub.plan_key;
        }
      }
    }

    const [permRes, countRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/feature_permissions?select=allowed,limit_value&feature_key=eq.clients.limit&plan_key=eq.${encodeURIComponent(resolvedPlanKey)}`,
        { headers: restHeaders },
      ),
      Promise.resolve(permCountData),
    ]);

    if (permRes.ok && countRes.ok) {
      const [permRows, activeRows] = await Promise.all([permRes.json(), countRes.json()]) as [
        { allowed: boolean; limit_value: number | null }[],
        { id: string }[],
      ];
      const perm = permRows[0];
      if (perm && perm.allowed && perm.limit_value !== null) {
        if (activeRows.length >= perm.limit_value) {
          return res.status(403).json({ error: 'client_limit_reached', limit: perm.limit_value });
        }
      }
    }

    // ── 1. Exclusivity guard — candidate may only have ONE active trainer ──────
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,trainer_clients!inner(trainer_id,status)&email=eq.${encodeURIComponent(invitedEmail)}&trainer_clients.status=eq.active`,
      { headers: restHeaders },
    );
    if (existingRes.ok) {
      const rows = (await existingRes.json()) as { id: string; trainer_clients: { trainer_id: string; status: string }[] }[];
      const linkedToOther = rows.some(r => r.trainer_clients.some(tc => tc.trainer_id !== trainerId && tc.status === 'active'));
      if (linkedToOther) {
        return res.status(409).json({ error: 'already_linked_elsewhere' });
      }
    }

    // ── 2. Create invitation row ────────────────────────────────────────────────
    const token     = randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const inviteRow = {
      trainer_id:    trainerId,
      invited_email: invitedEmail,
      invited_name:  invitedName,
      token,
      status:        'sent',
      expires_at:    expiresAt,
    };
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/trainer_invitations`, {
      method:  'POST',
      headers: { ...restHeaders, Prefer: 'return=minimal' },
      body:    JSON.stringify(inviteRow),
    });
    if (!insertRes.ok) {
      const err = await insertRes.text().catch(() => '');
      console.error('[send-invitation] trainer_invitations insert failed:', insertRes.status, err);
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    // ── 3. Send transactional email via Resend ─────────────────────────────────
    const inviteUrl  = `${appUrl}/invite/${token}`;
    const resendKey  = process.env.RESEND_API_KEY    || '';
    const fromEmail  = process.env.EMAIL_FROM || '';

    if (!resendKey || !fromEmail) {
      console.warn('[send-invitation] RESEND_API_KEY/EMAIL_FROM not set — invitation created but email NOT sent');
      return res.status(200).json({ ok: true, emailSent: false, token });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from:    fromEmail,
        to:      invitedEmail,
        subject: `${trainerName ?? 'Seu personal trainer'} convidou você para o TrAIner`,
        html: `
          <p>Olá, ${invitedName}!</p>
          <p><strong>${trainerName ?? 'Um personal trainer'}</strong> convidou você para treinar com ele(a) no TrAIner.</p>
          <p><a href="${inviteUrl}">Clique aqui para aceitar o convite</a></p>
          <p>Se você ainda não tem conta, será possível criar uma diretamente por esse link.</p>
          <p>Este convite expira em ${INVITE_TTL_DAYS} dias.</p>
        `,
      }),
    });
    if (!emailRes.ok) {
      const err = await emailRes.text().catch(() => '');
      console.error('[send-invitation] Resend send failed:', emailRes.status, err);
      return res.status(200).json({ ok: true, emailSent: false, token, error: 'email_send_failed' });
    }

    return res.status(200).json({ ok: true, emailSent: true, token });
  } catch (err: any) {
    console.error('[send-invitation] error:', err?.message);
    res.status(500).json({ error: err?.message || 'Failed' });
  }
}
