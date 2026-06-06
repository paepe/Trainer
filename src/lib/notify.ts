// Fire-and-forget push notification + DB persistence.
// The /api/send-notification endpoint handles BOTH:
//   1. INSERT into notification_log (service role key — no RLS risk)
//   2. FCM push to all device tokens for userId
//
// Multilingual: template + params are stored in canonical English.
// The recipient's device renders the template in their own locale via i18n.t().

const isNative =
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
const API_BASE = isNative ? (import.meta.env.VITE_API_URL ?? '') : '';

interface NotifyOptions {
  type?:         string;
  entityType?:   string;
  entityId?:     string;
  fromUserId?:   string;
  expiresInMin?: number;
  /** i18n template key (canonical EN). Rendered on recipient device in their locale. */
  templateKey?:  string;
  /** Template interpolation params. e.g. {trainerName: "Klaus", score: 72} */
  params?:       Record<string, unknown>;
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
    : undefined;

  const payload: Record<string, unknown> = { userId, title, body };
  if (url)                     payload.url         = url;
  if (opts.type)               payload.type        = opts.type;
  if (opts.entityType)         payload.entityType  = opts.entityType;
  if (opts.entityId)           payload.entityId    = opts.entityId;
  if (opts.fromUserId)         payload.fromUserId  = opts.fromUserId;
  if (expiresAt)               payload.expiresAt   = expiresAt;
  if (opts.templateKey)        payload.templateKey = opts.templateKey;
  if (opts.params)             payload.params      = opts.params;

  fetch(`${API_BASE}/api/send-notification`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
    .then(r => r.json())
    .catch(err => console.error('[notify] failed:', err));
}
