// ── Shared Inbox Screen ────────────────────────────────────────────────────────
// Used by both TrainerAlertsScreen (isTrainer=true) and ClientInboxScreen.
// Handles: Realtime subscription, initial fetch, name resolution, card UI.
// Role-specific logic is limited to:
//   Trainer: Approve / Reject chips on workout_ready items
//   Client : "Start Workout" button on workout_approved items
import React          from 'react';
import { supabase }   from '../../supabase';
import { Icon }       from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { surfRaised, borderSubtle, textPri, textSec, textMute } from '../../theme';
import { notify }     from '../../lib/notify';
import type { NavFn } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InboxItem {
  id:           string;
  type:         string | null;
  title:        string;
  body:         string;
  from_user_id: string | null;
  created_at:   string;
  expires_at:   string | null;
  response:     string | null;
  response_at:  string | null;
  peer_name?:   string; // resolved name of the other party
}

function isExpired(item: InboxItem): boolean {
  if (!item.expires_at) return false;
  return new Date(item.expires_at).getTime() < Date.now();
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Props ─────────────────────────────────────────────────────────────────────

export interface InboxScreenProps {
  nav:       NavFn;
  userId:    string | null;
  userName:  string;
  isTrainer: boolean;
  t:         any;
  dark:      boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InboxScreen({ nav, userId, userName, isTrainer, t, dark }: InboxScreenProps) {
  const [items,    setItems]    = React.useState<InboxItem[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [busy,     setBusy]     = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  // ── Name resolution (cached) ───────────────────────────────────────────────

  const nameCache = React.useRef<Record<string, string>>({});
  const resolveName = React.useCallback(async (fromId: string | null): Promise<string | null> => {
    if (!fromId) return null;
    if (nameCache.current[fromId]) return nameCache.current[fromId];
    const { data } = await supabase.from('profiles').select('name').eq('id', fromId).maybeSingle();
    const name = (data as { name: string } | null)?.name ?? null;
    if (name) nameCache.current[fromId] = name;
    return name;
  }, []);

  const enrich = React.useCallback(async (raw: Omit<InboxItem, 'peer_name'>): Promise<InboxItem> => {
    const name = await resolveName(raw.from_user_id);
    return { ...raw, ...(name ? { peer_name: name } : {}) };
  }, [resolveName]);

  // ── Initial load + Realtime subscription ──────────────────────────────────

  React.useEffect(() => {
    if (!userId) return;
    setLoading(true);

    supabase
      .from('notification_log')
      .select('id, type, title, body, from_user_id, created_at, expires_at, response, response_at')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data, error }) => {
        if (error) console.error('[Inbox] load failed:', error.message);
        if (data) {
          const enriched = await Promise.all(data.map(d => enrich(d as Omit<InboxItem, 'peer_name'>)));
          setItems(enriched);
        }
        setLoading(false);
      });

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${userId}` },
        async (payload) => {
          const enriched = await enrich(payload.new as Omit<InboxItem, 'peer_name'>);
          setItems(prev => [enriched, ...prev]);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${userId}` },
        (payload) => {
          setItems(prev => prev.map(i =>
            i.id === (payload.new as InboxItem).id ? { ...i, ...(payload.new as Partial<InboxItem>) } : i
          ));
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [userId, enrich]);

  // ── Trainer: Approve / Reject ──────────────────────────────────────────────

  const respond = async (item: InboxItem, response: 'approved' | 'rejected') => {
    if (!item.from_user_id || !isTrainer) return;
    setBusy(item.id);

    await supabase
      .from('notification_log')
      .update({ response, response_at: new Date().toISOString() })
      .eq('id', item.id);

    const trainerFirst = userName?.split(' ')[0] ?? 'Your trainer';
    if (response === 'approved') {
      notify(item.from_user_id, `${trainerFirst} approved your workout!`,
        'Your trainer reviewed your readiness and gave the green light. Start your workout now.',
        undefined, { type: 'workout_approved', ...(userId ? { fromUserId: userId } : {}) });
    } else {
      notify(item.from_user_id, `${trainerFirst} suggested resting today`,
        "Your trainer reviewed your readiness and recommends skipping today's session.",
        undefined, { type: 'workout_rejected', ...(userId ? { fromUserId: userId } : {}) });
    }

    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, response, response_at: new Date().toISOString() } : i
    ));
    setBusy(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const pendingCount = items.filter(i => i.type === 'workout_ready' && !i.response && !isExpired(i)).length;
  const title        = isTrainer ? 'Alerts' : 'Inbox';

  return (
    <>
      <ScreenTitle dark={dark}>
        {title}{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
      </ScreenTitle>

      {loading && (
        <div style={{ padding: '40px 22px', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
          Loading…
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: '48px 22px', textAlign: 'center' }}>
          <Icon name="bell" size={32} color={textMute(dark)} />
          <div style={{ marginTop: 12, fontSize: 13, color: textMute(dark) }}>
            {isTrainer ? 'No alerts yet.' : 'No messages yet.'}
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ padding: '0 22px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => {
            const open    = expanded === item.id;
            const expired = isExpired(item);
            const isReady = item.type === 'workout_ready';
            const pending = isTrainer && isReady && !item.response && !expired;

            const borderColor =
              pending                           ? t.primary
              : item.type === 'workout_approved' ? '#4ade80'
              : item.response === 'approved'     ? '#4ade80'
              : item.type === 'workout_rejected' ? t.accent
              : item.response === 'rejected'     ? t.accent
              : expired                          ? borderSubtle(dark)
              : borderSubtle(dark);

            const iconName = isReady || item.type === 'workout_approved' || item.type === 'workout_rejected'
              ? 'sparkle' : 'bell';
            const iconColor = pending ? t.primary : expired ? textMute(dark) : borderColor;

            return (
              <div key={item.id} style={{
                borderRadius: 16, overflow: 'hidden',
                background: surfRaised(dark), border: `1.5px solid ${borderColor}`,
              }}>
                {/* Card header */}
                <button
                  onClick={() => setExpanded(open ? null : item.id)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: pending ? `${t.primary}22` : `${borderColor}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={iconName} size={16} color={iconColor} stroke={2.2} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textPri(dark), marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: textMute(dark) }}>
                      {item.peer_name && <span style={{ color: textSec(dark), fontWeight: 600 }}>{item.peer_name} · </span>}
                      {fmtDate(item.created_at)}
                    </div>
                  </div>

                  <StatusBadge item={item} expired={expired} isTrainer={isTrainer} t={t} dark={dark} />
                  <span style={{ fontSize: 10, color: textMute(dark), flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                </button>

                {/* Expanded body */}
                {open && (
                  <div style={{ padding: '0 16px 14px', background: dark ? '#0E1A2B' : '#f4f8fd' }}>
                    <p style={{ margin: '0 0 14px', fontSize: 12.5, color: textSec(dark), lineHeight: 1.6 }}>
                      {item.body}
                    </p>

                    {/* Expiry info */}
                    {isReady && !item.response && !expired && item.expires_at && (
                      <div style={{
                        marginBottom: 12, padding: '6px 10px', borderRadius: 8,
                        background: `${t.primary}14`, fontSize: 11, color: t.primary,
                      }}>
                        ⏱ Request expires {new Date(item.expires_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* TRAINER: Approve / Reject */}
                    {pending && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => respond(item, 'approved')} disabled={busy === item.id} style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                          background: '#4ade80', color: '#0E1A2B',
                          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                          cursor: busy === item.id ? 'default' : 'pointer',
                          opacity: busy === item.id ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                          <Icon name="check" size={13} color="#0E1A2B" stroke={2.8} /> Approve
                        </button>
                        <button onClick={() => respond(item, 'rejected')} disabled={busy === item.id} style={{
                          flex: 1, padding: '10px 0', borderRadius: 10,
                          background: 'transparent', color: t.accent, border: `1.5px solid ${t.accent}55`,
                          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                          cursor: busy === item.id ? 'default' : 'pointer', opacity: busy === item.id ? 0.6 : 1,
                        }}>
                          Reject
                        </button>
                      </div>
                    )}

                    {/* CLIENT: Start Workout on approved */}
                    {!isTrainer && item.type === 'workout_approved' && (
                      <button onClick={() => nav('workout')} style={{
                        width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                        background: '#4ade80', color: '#0E1A2B',
                        fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        <Icon name="play" size={13} color="#0E1A2B" stroke={2.5} /> Start Workout
                      </button>
                    )}

                    {/* Response record (trainer responded) */}
                    {item.response && item.response_at && (
                      <div style={{
                        padding: '8px 12px', borderRadius: 8, marginTop: pending ? 0 : 0,
                        background: item.response === 'approved' ? '#4ade8018' : `${t.accent}12`,
                        border: `1px solid ${item.response === 'approved' ? '#4ade8040' : `${t.accent}40`}`,
                        fontSize: 11.5, color: item.response === 'approved' ? '#4ade80' : t.accent, fontWeight: 600,
                      }}>
                        {item.response === 'approved' ? '✓ Approved' : '✗ Rejected'} · {fmtDate(item.response_at)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ item, expired, isTrainer, t, dark }: {
  item: InboxItem; expired: boolean; isTrainer: boolean; t: any; dark: boolean;
}) {
  const badge = (label: string, color: string) => (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 9px', flexShrink: 0,
      color, background: `${color}18`,
    }}>{label}</span>
  );

  if (item.response === 'approved' || item.type === 'workout_approved') return badge('Approved ✓', '#4ade80');
  if (item.response === 'rejected' || item.type === 'workout_rejected') return badge('Rejected ✗', t.accent);
  if (expired && item.type === 'workout_ready') return badge('Expired', textMute(dark));
  if (item.type === 'workout_ready' && isTrainer)                        return badge('Pending', t.primary);
  if (item.type === 'plan_sent')                                          return badge('New Plan', t.primary);
  if (item.type === 'plan_cancelled')                                     return badge('Cancelled', t.accent);
  if (item.type === 'plan_expired')                                       return badge('Expired', textMute(dark));
  if (item.type === 'checkin_alert' || item.type === 'safety_gate')      return badge('Alert', '#F5A623');
  if (item.type === 'workout_completed')                                  return badge('Done ✓', '#4ade80');
  return null;
}
