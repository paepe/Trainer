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
import { surfRaised, textPri, textSec, textMute } from '../../theme';
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
  read_at:      string | null;
  peer_name?:   string;
  template_key?: string | null;
  params?:       Record<string, unknown> | null;
  entity_id?:    string | null;
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
      .select('id, type, title, body, from_user_id, created_at, expires_at, response, response_at, read_at, template_key, params, entity_id')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async ({ data, error }) => {
        if (error) console.error('[Inbox] load failed:', error.message);
        if (data) {
          const rows = data as unknown as Omit<InboxItem, 'peer_name'>[];
          const enriched = await enrichBatch(rows);
          setItems(enriched);

          const unreadIds = rows.filter(d => d.read_at == null).map(d => d.id);
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
          const old = payload.old as InboxItem;
          const upd = payload.new as InboxItem;

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

  // ── Trainer: Approve / Reject (workout_ready) · Client: Grant / Deny (access_request) ──

  const respond = async (item: InboxItem, response: 'approved' | 'rejected') => {
    const isAccessRequest = item.type === 'access_request';
    if (!item.from_user_id || (!isTrainer && !isAccessRequest)) return;
    setBusy(item.id);

    await supabase
      .from('notification_log')
      .update({ response, response_at: new Date().toISOString() })
      .eq('id', item.id)
      .is('response', null);

    if (isAccessRequest) {
      if (item.entity_id) {
        await supabase
          .from('profile_access_grants')
          .update({ status: response === 'approved' ? 'granted' : 'denied', responded_at: new Date().toISOString() })
          .eq('id', item.entity_id);
      }
      const clientFirst = userName?.split(' ')[0] || tr('inbox.yourClientFallback');
      const category = item.params?.category;
      notify(item.from_user_id, '', '', undefined, {
        type: response === 'approved' ? 'access_granted' : 'access_denied',
        templateKey: response === 'approved' ? 'access_granted' : 'access_denied',
        params: { clientName: clientFirst, category },
        ...(userId ? { fromUserId: userId } : {}),
      });
    } else {
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
  const ACCESS_TYPES = ['access_request', 'access_granted', 'access_denied'];
  const templateParams = (item: InboxItem): Record<string, unknown> => {
    const params = item.params ?? {};
    if (params.category && ACCESS_TYPES.includes(item.type ?? '')) {
      return { ...params, category: tr(`wizard.step14.rows.${params.category as string}`) };
    }
    return params;
  };
  const renderTitle = (item: InboxItem) =>
    item.template_key ? tr(`inbox.templates.${item.template_key}`, templateParams(item)) : item.title;
  const renderBody = (item: InboxItem) =>
    item.template_key ? tr(`inbox.templates.${item.template_key}_body`, templateParams(item)) : item.body;

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
            const isAccessRequest = item.type === 'access_request';
            const pending = (isTrainer && isReady && !item.response && !expired)
              || (!isTrainer && isAccessRequest && !item.response && !expired);
            const isNewPlan = !isTrainer && item.type === 'plan_sent';

            const accentColor = getBadgeColor(item, expired, isTrainer, t, dark);

            return (
              <div key={item.id} style={{
                borderRadius: 14, overflow: 'hidden',
                background: surfRaised(dark),
                border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                display: 'flex',
              }}>
                {/* Colour accent stripe */}
                <div style={{ width: 4, flexShrink: 0, background: accentColor, borderRadius: '14px 0 0 14px' }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                {/* Card header */}
                <button
                  onClick={() => setExpanded(open ? null : item.id)}
                  style={{
                    width: '100%', padding: '12px 14px 12px 12px',
                    display: 'flex', alignItems: 'center', gap: 11,
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <SenderAvatar name={item.peer_name} color={accentColor} dark={dark} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {item.peer_name && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                        {item.peer_name}
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark), marginBottom: 2 }}>
                      {renderTitle(item)}
                    </div>
                    <div style={{ fontSize: 11, color: textMute(dark) }}>
                      {fmtDate(item.created_at, i18n.language)}
                    </div>
                  </div>

                  <StatusBadge item={item} expired={expired} isTrainer={isTrainer} t={t} dark={dark} />
                  <span style={{ fontSize: 10, color: textMute(dark), flexShrink: 0, marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
                </button>

                {/* Expanded body */}
                {open && (
                  <div style={{ padding: '0 14px 14px 12px', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
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

                    {/* CLIENT: View plan on new plan received */}
                    {isNewPlan && (
                      <button onClick={() => nav('workout')} style={{
                        width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                        background: t.primary, color: '#0E1A2B',
                        fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        <Icon name="play" size={14} color="#0E1A2B" stroke={2.5} /> {tr('inbox.actions.viewWorkoutPlan')}
                      </button>
                    )}

                    {/* TRAINER: View client's post-workout feedback */}
                    {isTrainer && item.type === 'workout_completed' && item.entity_id && (
                      <button
                        onClick={() => nav('workoutSummary', { sessionId: item.entity_id, durationMin: 0, completedCount: 0, total: 0, totalSets: 0, returnTo: 'alerts' })}
                        style={{
                          width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                          background: '#4ade80', color: '#0E1A2B',
                          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <Icon name="play" size={13} color="#0E1A2B" stroke={2.5} />
                        {tr('inbox.actions.viewClientFeedback')}
                      </button>
                    )}

                    {/* Response record (trainer / client responded) */}
                    {item.response && item.response_at && (
                      <div style={{
                        padding: '8px 12px', borderRadius: 8, marginTop: pending ? 0 : 0,
                        background: item.response === 'approved' ? '#4ade8018' : `${t.accent}12`,
                        border: `1px solid ${item.response === 'approved' ? '#4ade8040' : `${t.accent}40`}`,
                        fontSize: 11.5, color: item.response === 'approved' ? '#4ade80' : t.accent, fontWeight: 600,
                      }}>
                        {isAccessRequest
                          ? (item.response === 'approved' ? tr('inbox.responses.accessGranted') : tr('inbox.responses.accessDenied'))
                          : (item.response === 'approved' ? tr('inbox.responses.approved') : tr('inbox.responses.rejected'))
                        } · {fmtDate(item.response_at, i18n.language)}
                      </div>
                    )}
                  </div>
                )}
                </div>{/* flex:1 inner wrapper */}
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
  const badge = (label: string, color: string, muted = false) => (
    <span style={{
      fontSize: 10, fontWeight: 600, borderRadius: 999, padding: '3px 9px', flexShrink: 0,
      color: muted ? textMute(dark) : color,
      background: 'transparent',
      border: `1px solid ${muted ? textMute(dark) + '44' : color + '55'}`,
      letterSpacing: '0.03em',
    }}>{label}</span>
  );

  if (item.response === 'approved' || item.type === 'workout_approved' || item.type === 'access_granted') return badge(tr('inbox.badges.approved'), '#4ade80');
  if (item.response === 'rejected' || item.type === 'workout_rejected' || item.type === 'access_denied') return badge(tr('inbox.badges.rejected'), t.accent);
  if (expired && item.type === 'workout_ready') return badge(tr('inbox.badges.expired'), textMute(dark), true);
  if (item.type === 'workout_ready' && isTrainer)                        return badge(tr('inbox.badges.pending'), t.primary);
  if (item.type === 'access_request' && !isTrainer)                      return badge(tr('inbox.badges.pending'), t.primary);
  if (item.type === 'plan_sent')                                          return badge(tr('inbox.badges.newPlan'), t.primary);
  if (item.type === 'plan_cancelled')                                     return badge(tr('inbox.badges.cancelled'), t.accent);
  if (item.type === 'plan_postponed')                                     return badge(tr('inbox.badges.postponed'), '#F5B45A');
  if (item.type === 'plan_expired')                                       return badge(tr('inbox.badges.expired'), textMute(dark), true);
  if (item.type === 'checkin_alert' || item.type === 'safety_gate')      return badge(tr('inbox.badges.alert'), '#F5A623');
  if (item.type === 'low_readiness')                                      return badge(tr('inbox.badges.alert'), '#F5A623');
  if (item.type === 'high_pain')                                          return badge(tr('inbox.badges.alert'), '#F5A623');
  if (item.type === 'workout_completed')                                  return badge(tr('inbox.badges.done'), '#4ade80');
  return null;
}

// ── Badge color resolver (mirrors StatusBadge logic, returns the color string) ─

function getBadgeColor(item: InboxItem, expired: boolean, isTrainer: boolean, t: any, dark: boolean): string {
  if (item.response === 'approved' || item.type === 'workout_approved' || item.type === 'access_granted') return '#4ade80';
  if (item.response === 'rejected' || item.type === 'workout_rejected' || item.type === 'access_denied') return t.accent;
  if (expired && item.type === 'workout_ready') return textMute(dark);
  if (item.type === 'workout_ready' && isTrainer) return t.primary;
  if (item.type === 'access_request' && !isTrainer) return t.primary;
  if (item.type === 'plan_sent')       return t.primary;
  if (item.type === 'plan_cancelled')  return t.accent;
  if (item.type === 'plan_postponed')  return '#F5B45A';
  if (item.type === 'plan_expired')    return textMute(dark);
  if (item.type === 'checkin_alert' || item.type === 'safety_gate') return '#F5A623';
  if (item.type === 'low_readiness')   return '#F5A623';
  if (item.type === 'high_pain')       return '#F5A623';
  if (item.type === 'workout_completed') return '#4ade80';
  return textMute(dark);
}

// ── Sender avatar with initials ────────────────────────────────────────────────

function SenderAvatar({ name, color, dark }: { name?: string | undefined; color: string; dark: boolean }) {
  const initials = name
    ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
    : null;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color, letterSpacing: '0.03em',
    }}>
      {initials ?? <Icon name="sparkle" size={15} color={color} stroke={2.2} />}
    </div>
  );
}
