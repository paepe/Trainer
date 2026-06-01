// Fire-and-forget push notification trigger — calls /api/send-notification.
// Also persists every notification to notification_log for audit trail.
import { supabase } from '../supabase';

const isNative =
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
const API_BASE = isNative ? (import.meta.env.VITE_API_URL ?? '') : '';

interface NotifyOptions {
  type?:         string; // workout_ready | plan_sent | plan_cancelled | plan_postponed | plan_expired | workout_completed | checkin_alert | safety_gate | custom
  entityType?:   string; // workout_plan | workout_session | checkin
  entityId?:     string;
  fromUserId?:   string;
  expiresInMin?: number; // if set, sets expires_at = now + N minutes (Model A approval window)
}

export function notify(
  userId:  string,
  title:   string,
  body:    string,
  url?:    string,
  opts:    NotifyOptions = {}
) {
  const expiresAt = opts.expiresInMin
    ? new Date(Date.now() + opts.expiresInMin * 60_000).toISOString()
    : null;

  // 1 — Persist to DB
  void supabase.from('notification_log').insert({
    to_user_id:   userId,
    from_user_id: opts.fromUserId ?? null,
    title,
    body,
    type:         opts.type       ?? null,
    entity_type:  opts.entityType ?? null,
    entity_id:    opts.entityId   ?? null,
    ...(expiresAt ? { expires_at: expiresAt } : {}),
  });

  // 2 — FCM push
  console.log('[notify] sending push to', userId, title);
  fetch(`${API_BASE}/api/send-notification`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ userId, title, body, url }),
  })
    .then(r => r.json())
    .then(data => console.log('[notify] push response:', data))
    .catch((err) => { console.warn('[notify] push failed:', err); });
}
