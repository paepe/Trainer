import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';

// Authenticated pre-release regression of the authoritative invitation RPCs.
// It creates one isolated CLIENT account, exercises the terminal states, and
// removes all test data in finally. SUPABASE_SERVICE_ROLE_KEY is deliberately
// required: this suite must never run against a developer's personal account.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = 'TrAIner2026!';
const TRAINER_EMAIL = 'carlos.silva@trainer.test';

type Session = { token: string; userId: string };
type Invitation = { id: string; token: string; status: string; archived_at: string | null };

async function loginAs(email: string): Promise<Session> {
  const context = await playwrightRequest.newContext();
  const response = await context.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password: PASSWORD },
  });
  expect(response.ok(), `login failed for ${email}: ${await response.text()}`).toBeTruthy();
  const body = await response.json();
  await context.dispose();
  return { token: body.access_token, userId: body.user.id };
}

async function rpc(context: APIRequestContext, token: string, name: string, data: Record<string, unknown>) {
  const response = await context.post(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  expect(response.ok(), `${name}: ${await response.text()}`).toBeTruthy();
  return response.json();
}

function adminHeaders() {
  return { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY!}`, 'Content-Type': 'application/json' };
}

test.describe.configure({ mode: 'serial' });

test('trainer invitation lifecycle preserves terminal states and activates a client only on acceptance', async () => {
  test.skip(!SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY for isolated pre-release data');

  const admin = await playwrightRequest.newContext();
  const email = `e2e.lifecycle.${Date.now()}@client.test`;
  const externalEmail = `e2e.email.${Date.now()}@example.test`;
  const app = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' });
  let clientId: string | undefined;

  try {
    const created = await admin.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: adminHeaders(),
      data: { email, password: PASSWORD, email_confirm: true, user_metadata: { name: 'E2E Lifecycle Client' } },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    clientId = (await created.json()).id;

    // The auth trigger creates the profile; normalize the test fixture to a
    // discoverable CLIENT without exposing any health or training data.
    const profile = await admin.patch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${clientId}`, {
      headers: { ...adminHeaders(), Prefer: 'return=minimal' },
      data: { role: 'client', name: 'E2E Lifecycle Client' },
    });
    expect(profile.ok(), await profile.text()).toBeTruthy();
    const preference = await admin.post(`${SUPABASE_URL}/rest/v1/trainer_discovery_preferences`, {
      headers: { ...adminHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      data: { user_id: clientId, discoverable: true, share_avatar: false },
    });
    expect(preference.ok(), await preference.text()).toBeTruthy();

    const [trainer, client] = await Promise.all([loginAs(TRAINER_EMAIL), loginAs(email)]);
    expect(client.userId).toBe(clientId);
    const subscriptionsBefore = await admin.get(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${clientId}&select=plan_key`, { headers: adminHeaders() });
    expect(subscriptionsBefore.ok(), await subscriptionsBefore.text()).toBeTruthy();
    const entitlementBefore = await subscriptionsBefore.json();

    // Discovery is an opt-in-only, minimal projection: no e-mail, health or
    // training-history fields travel to the trainer's search result.
    const discovery = await rpc(admin, trainer.token, 'search_discoverable_free_clients', {
      p_query: 'E2E Lifecycle Client', p_plan_keys: null, p_limit: 20, p_offset: 0,
    });
    const candidate = discovery.find((row: { id: string }) => row.id === clientId);
    expect(candidate).toBeTruthy();
    expect(candidate).toMatchObject({ id: clientId, display_name: 'E2E Lifecycle Client' });
    expect(candidate).not.toHaveProperty('email');
    expect(candidate).not.toHaveProperty('health_data');

    // The authenticated e-mail route creates the same authoritative invitation
    // record even when no recipient account exists. Delivery itself is left to
    // the configured transactional provider and is deliberately not faked here.
    const emailInvite = await app.post('/api/send-invitation', {
      headers: { Authorization: `Bearer ${trainer.token}` },
      data: { trainerName: 'Carlos Silva', invitedEmail: externalEmail, invitedName: 'E2E Email Prospect' },
    });
    expect(emailInvite.status(), await emailInvite.text()).toBe(200);
    expect((await emailInvite.json()).ok).toBe(true);
    const persistedEmailInvite = await admin.get(`${SUPABASE_URL}/rest/v1/trainer_invitations?invited_email=eq.${encodeURIComponent(externalEmail)}&select=id,status,expires_at`, { headers: adminHeaders() });
    expect(persistedEmailInvite.ok(), await persistedEmailInvite.text()).toBeTruthy();
    expect(await persistedEmailInvite.json()).toHaveLength(1);

    const createInvitation = async (): Promise<Invitation> => {
      const rows = await rpc(admin, trainer.token, 'create_trainer_in_app_invitation', { p_client_id: clientId });
      expect(rows).toHaveLength(1);
      const invitationId = rows[0].id as string;
      const read = await admin.get(`${SUPABASE_URL}/rest/v1/trainer_invitations?id=eq.${invitationId}&select=id,token,status,archived_at`, {
        headers: adminHeaders(),
      });
      expect(read.ok(), await read.text()).toBeTruthy();
      const invitations = await read.json() as Invitation[];
      expect(invitations).toHaveLength(1);
      return invitations[0]!;
    };

    // A voluntary decline is terminal, idempotent, and archivable/restorable.
    const declined = await createInvitation();
    const decline = await rpc(admin, client.token, 'decline_trainer_invitation', { p_token: declined.token });
    expect(decline[0]).toMatchObject({ id: declined.id, status: 'declined' });
    const repeatDecline = await rpc(admin, client.token, 'decline_trainer_invitation', { p_token: declined.token });
    expect(repeatDecline[0]).toMatchObject({ id: declined.id, status: 'declined' });
    const archived = await rpc(admin, trainer.token, 'archive_trainer_invitations', { p_invitation_ids: [declined.id], p_archive: true });
    expect(archived[0].id).toBe(declined.id);
    expect(archived[0].archived_at).toBeTruthy();
    const restored = await rpc(admin, trainer.token, 'archive_trainer_invitations', { p_invitation_ids: [declined.id], p_archive: false });
    expect(restored[0]).toMatchObject({ id: declined.id, archived_at: null });

    // Acceptance is the sole transition that creates an active trainer-client link.
    const accepted = await createInvitation();
    const acceptance = await rpc(admin, client.token, 'accept_trainer_invitation', { p_token: accepted.token, p_user_id: clientId });
    expect(acceptance[0].result).toBe('accepted');
    const activeLink = await admin.get(`${SUPABASE_URL}/rest/v1/trainer_clients?client_id=eq.${clientId}&status=eq.active&select=id,status`, { headers: adminHeaders() });
    expect(activeLink.ok(), await activeLink.text()).toBeTruthy();
    expect(await activeLink.json()).toHaveLength(1);
    const subscriptionsAfter = await admin.get(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${clientId}&select=plan_key`, { headers: adminHeaders() });
    expect(subscriptionsAfter.ok(), await subscriptionsAfter.text()).toBeTruthy();
    expect(await subscriptionsAfter.json()).toEqual(entitlementBefore);
    const repeatedAcceptance = await rpc(admin, client.token, 'accept_trainer_invitation', { p_token: accepted.token, p_user_id: clientId });
    expect(repeatedAcceptance[0].result).toBe('already_accepted');

    // The client can end a link without erasing the relationship audit trail.
    const ended = await rpc(admin, client.token, 'end_my_trainer_link', { p_reason: 'e2e lifecycle validation' });
    expect(ended[0].status).toBe('ended');
    const hiddenAfterEnd = await rpc(admin, trainer.token, 'search_discoverable_free_clients', {
      p_query: 'E2E Lifecycle Client', p_plan_keys: null, p_limit: 20, p_offset: 0,
    });
    expect(hiddenAfterEnd.some((row: { id: string }) => row.id === clientId)).toBe(false);

    // A revoked invitation can never be accepted.
    // Ending a relationship intentionally disables discovery; re-enable the
    // isolated fixture to validate the next independent invitation state.
    const rediscoverable = await admin.post(`${SUPABASE_URL}/rest/v1/trainer_discovery_preferences`, {
      headers: { ...adminHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      data: { user_id: clientId, discoverable: true, share_avatar: false },
    });
    expect(rediscoverable.ok(), await rediscoverable.text()).toBeTruthy();
    const revoked = await createInvitation();
    const revocation = await rpc(admin, trainer.token, 'revoke_trainer_invitation', { p_invitation_id: revoked.id });
    expect(revocation[0]).toMatchObject({ id: revoked.id, status: 'revoked' });
    const revokedAcceptance = await rpc(admin, client.token, 'accept_trainer_invitation', { p_token: revoked.token, p_user_id: clientId });
    expect(revokedAcceptance[0].result).toBe('revoked');

    // Expiration and simultaneous acceptance must remain deterministic.
    const expiring = await createInvitation();
    const partialArchive = await rpc(admin, trainer.token, 'archive_trainer_invitations', {
      p_invitation_ids: [revoked.id, expiring.id], p_archive: true,
    });
    expect(partialArchive).toHaveLength(1);
    expect(partialArchive[0].id).toBe(revoked.id);
    const expiredAt = await admin.patch(`${SUPABASE_URL}/rest/v1/trainer_invitations?id=eq.${expiring.id}`, {
      headers: { ...adminHeaders(), Prefer: 'return=minimal' },
      data: { expires_at: new Date(Date.now() - 60_000).toISOString() },
    });
    expect(expiredAt.ok(), await expiredAt.text()).toBeTruthy();
    const expiredAcceptance = await rpc(admin, client.token, 'accept_trainer_invitation', { p_token: expiring.token, p_user_id: clientId });
    expect(expiredAcceptance[0].result).toBe('expired');
    const expiredArchive = await rpc(admin, trainer.token, 'archive_trainer_invitations', { p_invitation_ids: [expiring.id], p_archive: true });
    expect(expiredArchive[0].archived_at).toBeTruthy();

    const concurrent = await createInvitation();
    const simultaneous = await Promise.all([
      rpc(admin, client.token, 'accept_trainer_invitation', { p_token: concurrent.token, p_user_id: clientId }),
      rpc(admin, client.token, 'accept_trainer_invitation', { p_token: concurrent.token, p_user_id: clientId }),
    ]);
    expect(simultaneous.map(rows => rows[0].result).sort()).toEqual(['accepted', 'already_accepted']);
  } finally {
    if (clientId) {
      // Remove dependent audit records before the ephemeral Auth account.
      await admin.delete(`${SUPABASE_URL}/rest/v1/trainer_client_link_events?client_id=eq.${clientId}`, { headers: adminHeaders() });
      await admin.delete(`${SUPABASE_URL}/rest/v1/trainer_clients?client_id=eq.${clientId}`, { headers: adminHeaders() });
      await admin.delete(`${SUPABASE_URL}/rest/v1/notification_log?to_user_id=eq.${clientId}`, { headers: adminHeaders() });
      await admin.delete(`${SUPABASE_URL}/rest/v1/trainer_invitations?invited_email=eq.${encodeURIComponent(externalEmail)}`, { headers: adminHeaders() });
      await admin.delete(`${SUPABASE_URL}/auth/v1/admin/users/${clientId}`, { headers: adminHeaders() });
    }
    await admin.dispose();
    await app.dispose();
  }
});
