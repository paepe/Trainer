// POST /api/send-invitation
// Trainer invites a candidate (with or without a TrAIner account) by email.
// 1. Validates exclusivity (candidate must not be actively linked to another trainer)
// 2. Creates a trainer_invitations row (service role — bypasses RLS, generates token)
// 3. Sends a transactional email via Resend with the accept-invite deep link
// Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
//           EMAIL_FROM, VITE_API_URL in env.
// See: policies/references/Trainer 2.0/trainer-invitation-flow-plan-20260607.md

import { randomUUID } from 'crypto';

const INVITE_TTL_DAYS = 7;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { trainerId, trainerName, invitedEmail, invitedName, planKey } = req.body || {};
  if (!trainerId || !invitedEmail || !invitedName) {
    return res.status(400).json({ error: 'trainerId, invitedEmail, invitedName required' });
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
    // ── 0. Plan limit guard — check feature_permissions for clients.limit ──────
    const [permRes, countRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/feature_permissions?select=allowed,limit_value&feature_key=eq.clients.limit&plan_key=eq.${encodeURIComponent(planKey ?? 'trial')}`,
        { headers: restHeaders },
      ),
      fetch(
        `${supabaseUrl}/rest/v1/trainer_clients?select=id&trainer_id=eq.${encodeURIComponent(trainerId)}&status=eq.active`,
        { headers: restHeaders },
      ),
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
