// ── Shared Inbox Screen ────────────────────────────────────────────────────────
// Used by both TrainerAlertsScreen (isTrainer=true) and ClientInboxScreen.
// Handles: Realtime subscription, initial fetch, name resolution, card UI.
// Role-specific logic is limited to:
//   Trainer: Approve / Reject chips on workout_ready items
//   Client : "Start Workout" button on workout_approved items
import React          from 'react';
import { useTranslation } from 'react-i18next';
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
  peer_name?:   string;
  template_key?: string | null;
  params?:       Record<string, unknown> | null;
}

function isExpired(item: InboxItem): boolean {
  if (!item.expires_at) return false;
  return new Date(item.expires_at).getTime() < Date.now();
}

const fmtDate = (iso: string, lng: string) => {
  const localeMap: Record<string, string> = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
    de: 'de-DE'
  };
  return new Date(iso).toLocaleDateString(localeMap[lng] || 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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
  const { t: tr, i18n } = useTranslation();
  const [items,    setItems]    = React.useState<InboxItem[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [busy,     setBusy]     = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  // ── Batch name resolution (1 query instead of N) ──────────────────────────
  // Caches resolved names in a ref so Realtime INSERTs reuse them.

  const nameCache = React.useRef<Record<string, string>>({});

  const enrichBatch = React.useCallback(async (rawList: Omit<InboxItem, 'peer_name'>[]): Promise<InboxItem[]> => {
    // collect unique unresolved from_user_ids
    const unresolved = [...new Set(
      rawList.map(d => d.from_user_id).filter(Boolean) as string[],
    )].filter(id => !nameCache.current[id]);

    if (unresolved.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', unresolved);
      if (data) {
        for (const p of data as { id: string; name: string }[]) {
          nameCache.current[p.id] = p.name;
        }
      }
      // mark unresolved ones as null so we don't re-query them
      for (const id of unresolved) {
        if (!nameCache.current[id]) nameCache.current[id] = '';
      }
    }

    return rawList.map(d => ({
      ...d,
      ...(d.from_user_id && nameCache.current[d.from_user_id]
        ? { peer_name: nameCache.current[d.from_user_id] } : {}),
    }));
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!userId) return;
    setLoading(true);

    supabase
      .from('notification_log')
      .select('id, type, title, body, from_user_id, created_at, expires_at, response, response_at, read_at, template_key, params')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data, error }) => {
        if (error) console.error('[Inbox] load failed:', error.message);
        if (data) {
          const enriched = await enrichBatch(data as unknown as Omit<InboxItem, 'peer_name'>[]);
          setItems(enriched);

          const rawItems = data as unknown as Array<{ id: string; read_at?: string | null }>;
          const unreadIds = rawItems.filter(d => d.read_at == null).map(d => d.id);
          if (unreadIds.length) {
            supabase.from('notification_log')
              .update({ read_at: new Date().toISOString() })
              .in('id', unreadIds)
              .then(({ error: uErr }) => { if (uErr) console.error('[Inbox] mark-read failed:', uErr.message); });
          }
        }
        setLoading(false);
      });
  }, [userId, enrichBatch]);

  // ── Realtime subscription (only after initial load completes) ──────────────

  React.useEffect(() => {
    if (!userId || loading) return;

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${userId}` },
        async (payload) => {
          const [enriched] = await enrichBatch([payload.new as Omit<InboxItem, 'peer_name'>]);
          if (!enriched?.id) return;
          setItems(prev => {
            if (prev.some(i => i.id === enriched.id)) return prev; // dedup
            return [enriched, ...prev];
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${userId}` },
        (payload) => {
          const old = payload.old as InboxItem & { read_at?: string | null };
          const upd = payload.new as InboxItem & { read_at?: string | null };

          // skip self-triggered mark-as-read updates (only read_at changed)
          const onlyReadAtChanged =
            old.read_at !== upd.read_at &&
            old.response === upd.response &&
            old.response_at === upd.response_at &&
            old.title === upd.title &&
            old.body === upd.body;

          if (onlyReadAtChanged) return;

          setItems(prev => prev.map(i =>
            i.id === upd.id ? { ...i, ...(upd as Partial<InboxItem>) } : i
          ));
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [userId, loading, enrichBatch]);

  // ── Trainer: Approve / Reject ──────────────────────────────────────────────

  const respond = async (item: InboxItem, response: 'approved' | 'rejected') => {
    if (!item.from_user_id || !isTrainer) return;
    setBusy(item.id);

    await supabase
      .from('notification_log')
      .update({ response, response_at: new Date().toISOString() })
      .eq('id', item.id)
      .is('response', null);

    const trainerFirst = userName?.split(' ')[0] || tr('inbox.yourTrainerFallback');
    if (response === 'approved') {
      notify(item.from_user_id, 'Workout approved',
        'Your trainer reviewed your readiness and gave the green light.',
        undefined, { type: 'workout_approved', templateKey: 'workout_approved', params: { trainerName: trainerFirst }, ...(userId ? { fromUserId: userId } : {}) });
    } else {
      notify(item.from_user_id, 'Workout request returned',
        'Your trainer reviewed your readiness and recommends skipping today\'s session.',
        undefined, { type: 'workout_rejected', templateKey: 'workout_rejected', params: { trainerName: trainerFirst }, ...(userId ? { fromUserId: userId } : {}) });
    }

    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, response, response_at: new Date().toISOString() } : i
    ));
    setBusy(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const pendingCount = items.filter(i => i.type === 'workout_ready' && !i.response && !isExpired(i)).length;
  const title        = tr('inbox.title');
  const titleSuffix  = pendingCount > 0 ? tr('inbox.pending_count', { count: pendingCount }) : '';

  // Render notification text: template keys are resolved in the RECIPIENT's locale.
  // Legacy rows without template_key fall back to stored title/body.
  const renderTitle = (item: InboxItem) =>
    item.template_key ? tr(`inbox.templates.${item.template_key}`, item.params ?? {}) : item.title;
  const renderBody = (item: InboxItem) =>
    item.template_key ? tr(`inbox.templates.${item.template_key}_body`, item.params ?? {}) : item.body;

  return (
    <>
      <ScreenTitle dark={dark}>
        {title}{titleSuffix}
      </ScreenTitle>

      {loading && (
        <div style={{ padding: '40px 22px', textAlign: 'center', color: textMute(dark), fontSize: 13 }}>
          {tr('inbox.loading')}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: '48px 22px', textAlign: 'center' }}>
          <Icon name="bell" size={32} color={textMute(dark)} />
          <div style={{ marginTop: 12, fontSize: 13, color: textMute(dark) }}>
            {isTrainer ? tr('inbox.noAlerts') : tr('inbox.noMessages')}
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
                        {renderTitle(item)}
                      </div>
                      <div style={{ fontSize: 11, color: textMute(dark) }}>
                        {item.peer_name && <span style={{ color: textSec(dark), fontWeight: 600 }}>{item.peer_name} · </span>}
                        {fmtDate(item.created_at, i18n.language)}
                      </div>
                    </div>

                  <StatusBadge item={item} expired={expired} isTrainer={isTrainer} t={t} dark={dark} />
                  <span style={{ fontSize: 10, color: textMute(dark), flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                </button>

                {/* Expanded body */}
                {open && (
                  <div style={{ padding: '0 16px 14px', background: 'var(--sunken)' }}>
                    <p style={{ margin: '0 0 14px', fontSize: 12.5, color: textSec(dark), lineHeight: 1.6 }}>
                      {renderBody(item)}
                    </p>

                    {/* Expiry info */}
                    {isReady && !item.response && !expired && item.expires_at && (
                      <div style={{
                        marginBottom: 12, padding: '6px 10px', borderRadius: 8,
                        background: `${t.primary}14`, fontSize: 11, color: t.primary,
                      }}>
                        {tr('inbox.requestExpires', {
                          time: new Date(item.expires_at).toLocaleTimeString(
                            i18n.language === 'pt' ? 'pt-BR' : i18n.language === 'es' ? 'es-ES' : i18n.language === 'de' ? 'de-DE' : 'en-US',
                            { hour: '2-digit', minute: '2-digit' }
                          )
                        })}
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
                          <Icon name="check" size={13} color="#0E1A2B" stroke={2.8} /> {tr('inbox.actions.approve')}
                        </button>
                        <button onClick={() => respond(item, 'rejected')} disabled={busy === item.id} style={{
                          flex: 1, padding: '10px 0', borderRadius: 10,
                          background: 'transparent', color: t.accent, border: `1.5px solid ${t.accent}55`,
                          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                          cursor: busy === item.id ? 'default' : 'pointer', opacity: busy === item.id ? 0.6 : 1,
                        }}>
                          {tr('inbox.actions.reject')}
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
                        <Icon name="play" size={13} color="#0E1A2B" stroke={2.5} /> {tr('inbox.actions.startWorkout')}
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
                        {item.response === 'approved' ? tr('inbox.responses.approved') : tr('inbox.responses.rejected')} · {fmtDate(item.response_at, i18n.language)}
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
  const { t: tr } = useTranslation();
  const badge = (label: string, color: string) => (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '3px 9px', flexShrink: 0,
      color, background: `${color}18`,
    }}>{label}</span>
  );

  if (item.response === 'approved' || item.type === 'workout_approved') return badge(tr('inbox.badges.approved'), '#4ade80');
  if (item.response === 'rejected' || item.type === 'workout_rejected') return badge(tr('inbox.badges.rejected'), t.accent);
  if (expired && item.type === 'workout_ready') return badge(tr('inbox.badges.expired'), textMute(dark));
  if (item.type === 'workout_ready' && isTrainer)                        return badge(tr('inbox.badges.pending'), t.primary);
  if (item.type === 'plan_sent')                                          return badge(tr('inbox.badges.newPlan'), t.primary);
  if (item.type === 'plan_cancelled')                                     return badge(tr('inbox.badges.cancelled'), t.accent);
  if (item.type === 'plan_postponed')                                     return badge(tr('inbox.badges.postponed'), '#F5B45A');
  if (item.type === 'plan_expired')                                       return badge(tr('inbox.badges.expired'), textMute(dark));
  if (item.type === 'checkin_alert' || item.type === 'safety_gate')      return badge(tr('inbox.badges.alert'), '#F5A623');
  if (item.type === 'workout_completed')                                  return badge(tr('inbox.badges.done'), '#4ade80');
  return null;
}
