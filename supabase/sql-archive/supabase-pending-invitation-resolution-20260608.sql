-- ─────────────────────────────────────────────────────────────────────────────
-- Server-side resolution of pending trainer invitations after login.
--
-- Replaces the sessionStorage-based `trainer_pending_invite_token` mechanism,
-- which loses its reference whenever the user's flow crosses a tab/window
-- boundary (e.g. clicking a password-recovery link from their e-mail client,
-- which commonly opens in a new tab — sessionStorage is per-tab and the new
-- tab starts empty). See: policies/references/post-invite-onboarding-qa-20260608.md
-- (Fase 0 — ACHADO-CHAVE) for the root-cause investigation.
--
-- This RPC resolves a pending invitation purely from the authenticated user's
-- own session (auth.uid() → e-mail → matching `sent` invitation), so the app
-- can route to AcceptInvitationScreen after ANY successful login, regardless
-- of which tab/window/device completed it.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function get_pending_invitation_for_user()
returns table (token text)
language sql
security definer
set search_path = public
as $$
  select ti.token
  from trainer_invitations ti
  join auth.users u on u.id = auth.uid()
  where lower(ti.invited_email) = lower(u.email)
    and ti.status = 'sent'
    and ti.expires_at >= now()
  order by ti.created_at desc
  limit 1;
$$;

grant execute on function get_pending_invitation_for_user() to authenticated;
