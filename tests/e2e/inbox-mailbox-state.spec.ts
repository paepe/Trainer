import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Exercises the recipient-owned state model against a real Supabase instance.
// The suite creates synthetic users and notifications only, then removes them.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = 'TrAIner2026!';

type Session = { token: string; userId: string };

function adminHeaders() {
  return { apikey: SERVICE_ROLE_KEY!, Authorization: `Bearer ${SERVICE_ROLE_KEY!}`, 'Content-Type': 'application/json' };
}

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

async function createUser(admin: APIRequestContext, email: string, name: string): Promise<string> {
  const response = await admin.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: adminHeaders(),
    data: { email, password: PASSWORD, email_confirm: true, user_metadata: { name } },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).id as string;
}

async function observeTableChange(
  token: string,
  event: 'INSERT' | 'UPDATE',
  table: string,
  filter: string,
  trigger: () => Promise<unknown>,
  expectedId?: string,
) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  await client.realtime.setAuth(token);
  const change = new Promise<any>((resolve, reject) => {
    const statuses: string[] = [];
    const timeout = setTimeout(() => reject(new Error(`${table} Realtime event timed out (${statuses.join(', ') || 'no channel status'})`)), 8_000);
    const channel = client
      .channel(`e2e-${table}-${Date.now()}`)
      .on('postgres_changes', {
        event, schema: 'public', table, filter,
      }, async payload => {
        if (expectedId && payload.new.id !== expectedId && payload.new.notification_id !== expectedId) return;
        clearTimeout(timeout);
        await client.removeChannel(channel);
        resolve(payload);
      })
      .subscribe(async status => {
        statuses.push(status);
        if (status === 'SUBSCRIBED') {
          try { await trigger(); } catch (error) { clearTimeout(timeout); await client.removeChannel(channel); reject(error); }
        }
      });
  });
  return change;
}

test.describe.configure({ mode: 'serial' });

test('recipient mailbox archive/read state is isolated, reversible and preserves notification lifecycle', async () => {
  test.skip(!SERVICE_ROLE_KEY, 'requires SUPABASE_SERVICE_ROLE_KEY for isolated fixtures');

  const admin = await playwrightRequest.newContext();
  const stamp = Date.now();
  const recipientEmail = `e2e.inbox.recipient.${stamp}@client.test`;
  const otherEmail = `e2e.inbox.other.${stamp}@client.test`;
  let recipientId: string | undefined;
  let otherId: string | undefined;

  try {
    recipientId = await createUser(admin, recipientEmail, 'E2E Inbox Recipient');
    otherId = await createUser(admin, otherEmail, 'E2E Inbox Other');
    const [recipient, other] = await Promise.all([loginAs(recipientEmail), loginAs(otherEmail)]);

    const createNotification = async (data: Record<string, unknown>) => {
      const response = await admin.post(`${SUPABASE_URL}/rest/v1/notification_log`, {
        headers: { ...adminHeaders(), Prefer: 'return=representation' },
        data: { to_user_id: recipientId, from_user_id: otherId, title: 'Café workout update', body: 'Café details remain private.', ...data },
      });
      expect(response.ok(), await response.text()).toBeTruthy();
      return (await response.json())[0] as { id: string };
    };

    const completed = await createNotification({ type: 'workout_completed' });

    // Canonical server search is accent-insensitive and scoped to the recipient.
    const searched = await rpc(admin, recipient.token, 'list_inbox_notifications', {
      p_scope: 'active', p_search: 'cafe', p_limit: 25,
    });
    expect(searched.map((row: { id: string }) => row.id)).toContain(completed.id);
    const categorised = await rpc(admin, recipient.token, 'list_inbox_notifications_v2', {
      p_scope: 'active', p_search: 'cafe', p_category: 'plansAndWorkouts', p_sort: 'nameAsc', p_limit: 25,
    });
    expect(categorised.map((row: { id: string }) => row.id)).toContain(completed.id);
    const otherList = await rpc(admin, other.token, 'list_inbox_notifications', {
      p_scope: 'active', p_search: 'cafe', p_limit: 25,
    });
    expect(otherList.map((row: { id: string }) => row.id)).not.toContain(completed.id);

    // A new Inbox event and its response transition are both delivered to a
    // second authenticated session; the client can safely refresh from source.
    const liveNotificationId = crypto.randomUUID();
    let liveNotification: { id: string } | undefined;
    const inserted = await observeTableChange(recipient.token, 'INSERT', 'notification_log', `to_user_id=eq.${recipientId}`, async () => {
      liveNotification = await createNotification({ id: liveNotificationId, type: 'workout_ready', title: 'Live workout approval', body: 'Awaiting your response.' });
    }, liveNotificationId);
    expect(inserted.new).toMatchObject({ id: liveNotification!.id, to_user_id: recipientId });
    const updated = await observeTableChange(recipient.token, 'UPDATE', 'notification_log', `to_user_id=eq.${recipientId}`, async () => {
      const response = await admin.patch(`${SUPABASE_URL}/rest/v1/notification_log?id=eq.${liveNotification!.id}`, {
        headers: { ...adminHeaders(), Prefer: 'return=representation' },
        data: { response: 'approved', response_at: new Date().toISOString() },
      });
      expect(response.ok(), await response.text()).toBeTruthy();
    }, liveNotificationId);
    expect(updated.new).toMatchObject({ id: liveNotification!.id, response: 'approved' });

    // Unread history cannot be archived; explicit read makes it eligible.
    const unreadArchive = await rpc(admin, recipient.token, 'archive_inbox_notifications', {
      p_notification_ids: [completed.id], p_archive: true,
    });
    expect(unreadArchive[0]).toMatchObject({ id: completed.id, outcome: 'not_read', archived_at: null });
    const markedRead = await rpc(admin, recipient.token, 'mark_inbox_notifications_read', {
      p_notification_ids: [completed.id],
    });
    expect(markedRead[0]).toMatchObject({ id: completed.id, outcome: 'read' });
    expect(markedRead[0].read_at).toBeTruthy();

    let archived: any;
    const realtime = await observeTableChange(recipient.token, 'UPDATE', 'notification_mailbox_states', `recipient_id=eq.${recipientId}`, async () => {
      archived = await rpc(admin, recipient.token, 'archive_inbox_notifications', {
        p_notification_ids: [completed.id], p_archive: true,
      });
    }, completed.id);
    expect(archived[0]).toMatchObject({ id: completed.id, outcome: 'archived' });
    expect(archived[0].archived_at).toBeTruthy();
    expect(realtime.new).toMatchObject({ notification_id: completed.id, recipient_id: recipientId });
    const activeAfterArchive = await rpc(admin, recipient.token, 'list_inbox_notifications', {
      p_scope: 'active', p_search: 'cafe', p_limit: 25,
    });
    expect(activeAfterArchive.map((row: { id: string }) => row.id)).not.toContain(completed.id);
    const archivedList = await rpc(admin, recipient.token, 'list_inbox_notifications', {
      p_scope: 'archived', p_search: 'cafe', p_limit: 25,
    });
    expect(archivedList.map((row: { id: string }) => row.id)).toContain(completed.id);

    const restored = await rpc(admin, recipient.token, 'archive_inbox_notifications', {
      p_notification_ids: [completed.id], p_archive: false,
    });
    expect(restored[0]).toMatchObject({ id: completed.id, outcome: 'restored', archived_at: null });

    // A read but still-actionable notification remains operationally visible.
    const pending = await createNotification({
      type: 'trainer_invitation',
      expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
    });
    await rpc(admin, recipient.token, 'mark_inbox_notifications_read', { p_notification_ids: [pending.id] });
    const pendingArchive = await rpc(admin, recipient.token, 'archive_inbox_notifications', {
      p_notification_ids: [pending.id], p_archive: true,
    });
    expect(pendingArchive[0]).toMatchObject({ id: pending.id, outcome: 'action_required', archived_at: null });

    const partialArchive = await rpc(admin, recipient.token, 'archive_inbox_notifications', {
      p_notification_ids: [completed.id, pending.id], p_archive: true,
    });
    expect(partialArchive).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: completed.id, outcome: 'archived' }),
      expect.objectContaining({ id: pending.id, outcome: 'action_required', archived_at: null }),
    ]));
    await rpc(admin, recipient.token, 'archive_inbox_notifications', {
      p_notification_ids: [completed.id], p_archive: false,
    });

    // Another authenticated recipient receives no information or mutation power.
    const crossUserMark = await rpc(admin, other.token, 'mark_inbox_notifications_read', {
      p_notification_ids: [completed.id],
    });
    expect(crossUserMark[0]).toMatchObject({ id: completed.id, outcome: 'not_found_or_not_owned', read_at: null });
    const crossUserArchive = await rpc(admin, other.token, 'archive_inbox_notifications', {
      p_notification_ids: [completed.id], p_archive: true,
    });
    expect(crossUserArchive[0]).toMatchObject({ id: completed.id, outcome: 'not_found_or_not_owned', archived_at: null });

    // Mailbox state never mutates the notification's operational fields.
    const source = await admin.get(`${SUPABASE_URL}/rest/v1/notification_log?id=eq.${completed.id}&select=response,response_at,read_at`, {
      headers: adminHeaders(),
    });
    expect(source.ok(), await source.text()).toBeTruthy();
    expect((await source.json())[0]).toEqual({ response: null, response_at: null, read_at: null });

    // Invitation management is trainer-scoped and reconciles independently
    // from mailbox state when the prospect acts in another session.
    const invitationResponse = await admin.post(`${SUPABASE_URL}/rest/v1/trainer_invitations`, {
      headers: { ...adminHeaders(), Prefer: 'return=representation' },
      data: {
        trainer_id: recipientId,
        invited_email: `prospect.${stamp}@client.test`,
        invited_name: 'Realtime Prospect',
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
        source: 'email',
      },
    });
    expect(invitationResponse.ok(), await invitationResponse.text()).toBeTruthy();
    const invitation = (await invitationResponse.json())[0] as { id: string };
    const invitationUpdate = await observeTableChange(recipient.token, 'UPDATE', 'trainer_invitations', `trainer_id=eq.${recipientId}`, async () => {
      const response = await admin.patch(`${SUPABASE_URL}/rest/v1/trainer_invitations?id=eq.${invitation.id}`, {
        headers: { ...adminHeaders(), Prefer: 'return=representation' },
        data: { status: 'declined', declined_at: new Date().toISOString() },
      });
      expect(response.ok(), await response.text()).toBeTruthy();
    }, invitation.id);
    expect(invitationUpdate.new).toMatchObject({ id: invitation.id, trainer_id: recipientId, status: 'declined' });
  } finally {
    if (recipientId) {
      await admin.delete(`${SUPABASE_URL}/rest/v1/trainer_invitations?trainer_id=eq.${recipientId}`, { headers: adminHeaders() });
      await admin.delete(`${SUPABASE_URL}/rest/v1/notification_log?to_user_id=eq.${recipientId}`, { headers: adminHeaders() });
      await admin.delete(`${SUPABASE_URL}/auth/v1/admin/users/${recipientId}`, { headers: adminHeaders() });
    }
    if (otherId) await admin.delete(`${SUPABASE_URL}/auth/v1/admin/users/${otherId}`, { headers: adminHeaders() });
    await admin.dispose();
  }
});
