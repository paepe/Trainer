// POST /api/send-invitation
// Trainer invites a candidate (with or without a TrAIner account) by email.
// 1. Validates exclusivity (candidate must not be actively linked to any trainer)
// 2. Creates a trainer_invitations row (service role — bypasses RLS, generates token)
// 3. Sends a transactional email via Resend with the accept-invite deep link
// Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
//           EMAIL_FROM, VITE_API_URL in env.
// See: policies/references/Trainer 2.0/trainer-invitation-flow-plan-20260607.md

import { randomUUID } from 'crypto';
// Auth + entitlements now come from shared api/_lib modules — Fase 0/2 of
// docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md. This handler used
// to be the one place in the codebase with the correct pattern (resolve the
// caller's real plan server-side, never trust the client) — written inline
// here and never reused elsewhere. It's now a consumer of the same
// resolver every other handler uses, not the lone exemplar.
import { verifyRequestUser, isTrainerRole, authSupabaseUrl, authServiceHeaders } from './_lib/auth.js';
import { resolveUserEntitlements } from './_lib/entitlements.js';

const INVITE_TTL_DAYS = 7;

async function recordLimitBlock(supabaseUrl: string, headers: Record<string, string>) {
  // Best-effort aggregate telemetry: never retain trainer, candidate, e-mail,
  // search term or health/training data in this operational signal.
  try {
    await fetch(`${supabaseUrl}/rest/v1/trainer_invitation_operation_events`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ event_type: 'blocked_limit', source: 'email' }),
    });
  } catch {
    // Observability must not change the authoritative authorization response.
  }
}

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

  const supabaseUrl = authSupabaseUrl();
  const appUrl       = process.env.VITE_API_URL || '';
  const restHeaders  = { 'Content-Type': 'application/json', ...authServiceHeaders() };
  if (!authServiceHeaders().apikey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' });

  try {
    // ── 0. Plan limit guard — resolve trainer's real entitlements from DB
    // (never trust client). resolveUserEntitlements handles window elevation
    // (trial→pro, free→ai_fitness) the same way client-side code does — one
    // implementation now, not two (Fase 1/2 of
    // docs/LICENSING_AUTHORITY_AND_COMMERCIAL_MODEL_PLAN.md).
    const [entitlements, countRes] = await Promise.all([
      resolveUserEntitlements(trainerId),
      fetch(
        `${supabaseUrl}/rest/v1/trainer_clients?select=id&trainer_id=eq.${encodeURIComponent(trainerId)}&status=eq.active`,
        { headers: restHeaders },
      ),
    ]);

    const clientsLimit = entitlements['clients.limit'];
    if (clientsLimit.allowed && clientsLimit.limitValue !== null && countRes.ok) {
      const activeRows = await countRes.json() as { id: string }[];
      if (activeRows.length >= clientsLimit.limitValue) {
        await recordLimitBlock(supabaseUrl, restHeaders);
        return res.status(403).json({ error: 'client_limit_reached', limit: clientsLimit.limitValue });
      }
    }

    // ── 1. Exclusivity guard — active clients cannot receive another invitation ─
    // This includes a duplicate invitation from the same TRAINER. A new invitation
    // is only valid after the existing relationship has been explicitly ended.
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,role,trainer_clients(trainer_id,status)&email=eq.${encodeURIComponent(invitedEmail)}`,
      { headers: restHeaders },
    );
    if (existingRes.ok) {
      const rows = (await existingRes.json()) as { id: string; role: string | null; trainer_clients: { trainer_id: string; status: string }[] }[];
      // A registered account is eligible only when it is a CLIENT. Unknown
      // e-mail addresses remain eligible so a prospective client can sign up.
      if (rows.some(row => row.role !== 'client')) {
        return res.status(409).json({ error: 'recipient_not_client' });
      }
      const hasActiveTrainer = rows.some(r => r.trainer_clients.some(tc => tc.status === 'active'));
      if (hasActiveTrainer) {
        return res.status(409).json({ error: 'already_linked' });
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
