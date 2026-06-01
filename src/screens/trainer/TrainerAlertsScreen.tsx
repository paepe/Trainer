import React from 'react';
import { supabase }      from '../../supabase';
import { Icon }          from '../../components/Icon';
import { ScreenTitle }   from '../../components/ScreenTitle';
import { surfRaised, borderSubtle, textPri, textSec, textMute } from '../../theme';
import { useTrainerTheme } from '../../hooks/useTrainerTheme';
import { notify }         from '../../lib/notify';
import type { NavFn }     from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InboxItem {
  id:           string;
  type:         string | null;
  title:        string;
  body:         string;
  from_user_id: string | null;
  created_at:   string;
  expires_at:   string | null;
  response:     string | null;     // 'approved' | 'rejected' | null
  response_at:  string | null;
  // resolved from from_user_id → profiles join
  client_name?: string;
}

const EXPIRE_MS = 30 * 60 * 1000;

function isExpired(item: InboxItem): boolean {
  if (!item.expires_at) return false;
  return new Date(item.expires_at).getTime() < Date.now();
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function TrainerAlertsScreen({ nav, user }: { nav: NavFn; user: { id: string | null; name: string } }) {
  const { t, dark } = useTrainerTheme();
  const [items,    setItems]    = React.useState<InboxItem[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [busy,     setBusy]     = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  // Resolve a profile name by id (cached in closure)
  const nameCache = React.useRef<Record<string, string>>({});
  const resolveName = React.useCallback(async (fromId: string | null): Promise<string | null> => {
    if (!fromId) return null;
    if (nameCache.current[fromId]) return nameCache.current[fromId];
    const { data } = await supabase.from('profiles').select('name').eq('id', fromId).maybeSingle();
    const name = (data as { name: string } | null)?.name ?? null;
    if (name) nameCache.current[fromId] = name;
    return name;
  }, []);

  const enrichItem = React.useCallback(async (raw: Omit<InboxItem, 'client_name'>): Promise<InboxItem> => {
    const name = await resolveName(raw.from_user_id);
    return { ...raw, ...(name ? { client_name: name } : {}) };
  }, [resolveName]);

  // ── Initial load + Realtime subscription ─────────────────────────────────

  React.useEffect(() => {
    if (!user?.id) return;

    // 1 — Initial fetch
    setLoading(true);
    supabase
      .from('notification_log')
      .select('id, type, title, body, from_user_id, created_at, expires_at, response, response_at')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data, error }) => {
        if (error) console.error('[TrainerAlerts] initial load failed:', error.message);
        if (data) {
          const enriched = await Promise.all(data.map(d => enrichItem(d as Omit<InboxItem, 'client_name'>)));
          setItems(enriched);
        }
        setLoading(false);
      });

    // 2 — Realtime: new notification arrives (INSERT) → prepend to list
    //             trainer responds or expiry recorded (UPDATE) → update in place
    const channel = supabase
      .channel(`alerts:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${user.id}` },
        async (payload) => {
          const enriched = await enrichItem(payload.new as Omit<InboxItem, 'client_name'>);
          setItems(prev => [enriched, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${user.id}` },
        (payload) => {
          setItems(prev => prev.map(i =>
            i.id === (payload.new as InboxItem).id ? { ...i, ...(payload.new as Partial<InboxItem>) } : i
          ));
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, enrichItem]);

  // ── Approve / Reject ───────────────────────────────────────────────────────

  const respond = async (item: InboxItem, response: 'approved' | 'rejected') => {
    if (!item.from_user_id) return;
    setBusy(item.id);

    await supabase
      .from('notification_log')
      .update({ response, response_at: new Date().toISOString() })
      .eq('id', item.id);

    const clientName = item.client_name?.split(' ')[0] ?? 'your client';
    const trainerName = user.name?.split(' ')[0] ?? 'Your trainer';

    if (response === 'approved') {
      notify(
        item.from_user_id,
        `${trainerName} approved your workout!`,
        'Your trainer reviewed your readiness and gave the green light. Start your workout now.',
        undefined,
        { type: 'workout_approved', ...(user.id ? { fromUserId: user.id } : {}) }
      );
    } else {
      notify(
        item.from_user_id,
        `${trainerName} suggested resting today`,
        'Your trainer reviewed your readiness and recommends skipping today\'s session.',
        undefined,
        { type: 'workout_rejected', ...(user.id ? { fromUserId: user.id } : {}) }
      );
    }

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, response, response_at: new Date().toISOString() } : i));
    setBusy(null);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const pendingCount = items.filter(i => i.type === 'workout_ready' && !i.response && !isExpired(i)).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <ScreenTitle dark={dark}>
        Alerts{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
      </ScreenTitle>

      {loading && (
        <div style={{ padding: '40px 22px', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
          Loading…
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: '48px 22px', textAlign: 'center' }}>
          <Icon name="bell" size={32} color={textMute(dark)} />
          <div style={{ marginTop: 12, fontSize: 13, color: textMute(dark) }}>No alerts yet.</div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ padding: '0 22px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => {
            const open    = expanded === item.id;
            const expired = isExpired(item);
            const isReady = item.type === 'workout_ready';
            const pending = isReady && !item.response && !expired;

            // Card border accent
            const borderColor = pending ? t.primary
              : item.response === 'approved' ? '#4ade80'
              : item.response === 'rejected' ? t.accent
              : expired ? borderSubtle(dark)
              : borderSubtle(dark);

            return (
              <div key={item.id} style={{
                borderRadius: 16, overflow: 'hidden',
                background: surfRaised(dark),
                border: `1.5px solid ${borderColor}`,
              }}>
                {/* Card header — always visible */}
                <button
                  onClick={() => setExpanded(open ? null : item.id)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: pending ? `${t.primary}22` : `${borderColor}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon
                      name={isReady ? 'sparkle' : 'bell'}
                      size={16}
                      color={pending ? t.primary : expired ? textMute(dark) : borderColor}
                      stroke={2.2}
                    />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textPri(dark), marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: textMute(dark) }}>
                      {item.client_name && <span style={{ color: textSec(dark), fontWeight: 600 }}>{item.client_name} · </span>}
                      {fmtDate(item.created_at)}
                    </div>
                  </div>

                  {/* Status badge */}
                  <StatusBadge item={item} expired={expired} t={t} dark={dark} />
                  <span style={{ fontSize: 10, color: textMute(dark), flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                </button>

                {/* Expanded body */}
                {open && (
                  <div style={{ padding: '0 16px 14px', background: dark ? '#0E1A2B' : '#f4f8fd' }}>

                    {/* Body text */}
                    <p style={{ margin: '0 0 14px', fontSize: 12.5, color: textSec(dark), lineHeight: 1.6 }}>
                      {item.body}
                    </p>

                    {/* Expiry info for pending items */}
                    {isReady && !item.response && !expired && item.expires_at && (
                      <div style={{
                        marginBottom: 12, padding: '6px 10px', borderRadius: 8,
                        background: `${t.primary}14`, fontSize: 11, color: t.primary,
                      }}>
                        ⏱ Request expires {new Date(item.expires_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* Approve / Reject chips — only for pending workout_ready */}
                    {pending && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => respond(item, 'approved')}
                          disabled={busy === item.id}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                            background: '#4ade80', color: '#0E1A2B',
                            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                            cursor: busy === item.id ? 'default' : 'pointer',
                            opacity: busy === item.id ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          <Icon name="check" size={13} color="#0E1A2B" stroke={2.8}/>
                          Approve
                        </button>
                        <button
                          onClick={() => respond(item, 'rejected')}
                          disabled={busy === item.id}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 10,
                            background: 'transparent', color: t.accent,
                            border: `1.5px solid ${t.accent}55`,
                            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                            cursor: busy === item.id ? 'default' : 'pointer',
                            opacity: busy === item.id ? 0.6 : 1,
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Response record */}
                    {item.response && item.response_at && (
                      <div style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: item.response === 'approved' ? '#4ade8018' : `${t.accent}12`,
                        border: `1px solid ${item.response === 'approved' ? '#4ade8040' : `${t.accent}40`}`,
                        fontSize: 11.5, color: item.response === 'approved' ? '#4ade80' : t.accent,
                        fontWeight: 600,
                      }}>
                        {item.response === 'approved' ? '✓ Approved' : '✗ Rejected'} ·{' '}
                        {fmtDate(item.response_at)}
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

// ── Status badge sub-component ────────────────────────────────────────────────

function StatusBadge({ item, expired, t, dark }: {
  item: InboxItem; expired: boolean; t: any; dark: boolean;
}) {
  if (item.response === 'approved') return (
    <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', background: '#4ade8018', borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
      Approved ✓
    </span>
  );
  if (item.response === 'rejected') return (
    <span style={{ fontSize: 10, fontWeight: 700, color: t.accent, background: `${t.accent}18`, borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
      Rejected ✗
    </span>
  );
  if (expired && item.type === 'workout_ready') return (
    <span style={{ fontSize: 10, fontWeight: 700, color: textMute(dark), background: `${textMute(dark)}18`, borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
      Expired
    </span>
  );
  if (item.type === 'workout_ready') return (
    <span style={{ fontSize: 10, fontWeight: 700, color: t.primary, background: `${t.primary}18`, borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>
      Pending
    </span>
  );
  return null;
}
