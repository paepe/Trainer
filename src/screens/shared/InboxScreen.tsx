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
import { SegmentedControl, HStack } from '../../ui';
import {
  canArchiveInboxItem,
  inboxCategoryFor,
  isInboxActionable,
  toggleAllOperationalSelection,
  toggleOperationalSelection,
  type InboxCategory,
  type OperationalListScope,
  type OperationalListSort,
} from '../../lib/operationalListManagement';
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
  archived_at?:  string | null;
  sort_sender_name?: string | null;
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
  const [scope, setScope] = React.useState<OperationalListScope>('active');
  const [category, setCategory] = React.useState<'all' | InboxCategory>('all');
  const [sort, setSort] = React.useState<OperationalListSort>('recent');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [operationNotice, setOperationNotice] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const declineInvitation = async (item: InboxItem) => {
    const token = item.params?.inviteToken;
    if (typeof token !== 'string' || !window.confirm(tr('inbox.actions.confirmDeclineTrainerInvitation'))) return;
    setBusy(item.id);
    const { error } = await supabase.rpc('decline_trainer_invitation', { p_token: token });
    if (!error) setItems(prev => prev.map(row => row.id === item.id ? { ...row, response: 'declined', response_at: new Date().toISOString() } : row));
    setBusy(null);
  };

  const requestNewInvitation = async (item: InboxItem) => {
    const token = item.params?.inviteToken;
    if (typeof token !== 'string' || !window.confirm(tr('inbox.actions.confirmRequestNewTrainerInvitation'))) return;
    setBusy(item.id);
    const { error } = await supabase.rpc('request_trainer_invitation_renewal', { p_token: token });
    if (!error) setItems(prev => prev.map(row => row.id === item.id ? { ...row, response: 'renewal_requested', response_at: new Date().toISOString() } : row));
    setBusy(null);
  };

  const respondToRenewal = async (item: InboxItem, resend: boolean) => {
    const requestId = item.params?.requestId;
    if (typeof requestId !== 'string') return;
    setBusy(item.id);
    const { error } = await supabase.rpc('respond_trainer_invitation_renewal', { p_request_id: requestId, p_resend: resend });
    if (!error) setItems(prev => prev.map(row => row.id === item.id ? { ...row, response: resend ? 'resent' : 'ignored', response_at: new Date().toISOString() } : row));
    setBusy(null);
  };

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(id);
  }, [search]);

  const loadInboxPage = React.useCallback(async (reset: boolean) => {
    if (!userId) return;
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const previous = reset ? [] : items;
    const last = previous.at(-1);
    const { data, error } = await supabase.rpc('list_inbox_notifications_v2', {
      p_scope: scope,
      p_search: debouncedSearch || null,
      p_category: category,
      p_sort: sort,
      p_cursor_created_at: last?.created_at ?? null,
      p_cursor_sender_name: last?.sort_sender_name ?? null,
      p_cursor_id: last?.id ?? null,
      p_limit: 25,
    });

    if (error) {
      console.error('[Inbox] load failed:', error.message);
      if (reset) setItems([]);
    } else {
      const rows = (data ?? []) as InboxItem[];
      setItems(reset ? rows : [...previous, ...rows.filter(row => !previous.some(item => item.id === row.id))]);
      setHasMore(rows.length === 25);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [userId, items, scope, debouncedSearch, category, sort]);

  const reloadInboxRef = React.useRef<() => void>(() => undefined);
  React.useEffect(() => {
    reloadInboxRef.current = () => { void loadInboxPage(true); };
  }, [loadInboxPage]);

  // ── Initial/filter load ───────────────────────────────────────────────────

  React.useEffect(() => {
    setSelectedIds(new Set());
    setExpanded(null);
    void loadInboxPage(true);
    // loadInboxPage intentionally changes as cursor items change; resets must
    // be driven only by the active server query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, scope, debouncedSearch, category, sort]);

  // ── Realtime subscription (only after initial load completes) ──────────────

  React.useEffect(() => {
    if (!userId || loading) return;

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${userId}` },
        () => reloadInboxRef.current()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_log', filter: `to_user_id=eq.${userId}` },
        () => reloadInboxRef.current()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_mailbox_states', filter: `recipient_id=eq.${userId}` },
        () => reloadInboxRef.current()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_mailbox_states', filter: `recipient_id=eq.${userId}` },
        () => reloadInboxRef.current()
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [userId, loading]);

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
      });
    } else {
      const trainerFirst = userName?.split(' ')[0] || tr('inbox.yourTrainerFallback');
      if (response === 'approved') {
        // Activate the most recent 'sent' manual plan for this client so it
        // appears immediately in StartWorkoutScreen when they tap "Start Workout".
        if (item.from_user_id) {
          const { data: sentPlans } = await supabase
            .from('workout_plans')
            .select('id')
            .eq('assigned_to', item.from_user_id)
            .eq('source', 'manual')
            .eq('status', 'sent')
            .order('created_at', { ascending: false })
            .limit(1);
          if (sentPlans && sentPlans.length > 0) {
            const planId = sentPlans[0]?.id;
            if (planId) {
              await supabase
                .from('workout_plans')
                .update({ status: 'active' })
                .eq('id', planId);
            }
          }
        }
        notify(item.from_user_id, '', '',
          undefined, { type: 'workout_approved', templateKey: 'workout_approved', params: { trainerName: trainerFirst } });
      } else {
        notify(item.from_user_id, '', '',
          undefined, { type: 'workout_rejected', templateKey: 'workout_rejected', params: { trainerName: trainerFirst } });
      }
    }

    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, response, response_at: new Date().toISOString() } : i
    ));
    setBusy(null);
  };

  const markRead = async (ids: readonly string[]) => {
    const unreadIds = ids.filter(id => items.find(item => item.id === id)?.read_at == null);
    if (unreadIds.length === 0) return;
    setBusy('mark-read');
    const { data, error } = await supabase.rpc('mark_inbox_notifications_read', { p_notification_ids: unreadIds });
    if (!error && data) {
      const now = new Date().toISOString();
      const successful = new Set(data.filter(row => row.outcome === 'read').map(row => row.id));
      setItems(previous => previous.map(item => successful.has(item.id) ? { ...item, read_at: now } : item));
      if (successful.size !== unreadIds.length) setOperationNotice(tr('inbox.management.partialResult'));
    } else {
      setOperationNotice(tr('inbox.management.partialResult'));
    }
    setBusy(null);
  };

  const updateArchiveState = async (archive: boolean) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBusy('archive');
    const { data, error } = await supabase.rpc('archive_inbox_notifications', {
      p_notification_ids: ids,
      p_archive: archive,
    });
    if (!error && data) {
      const successful = new Set(data.filter(row => row.outcome === (archive ? 'archived' : 'restored')).map(row => row.id));
      if (successful.size > 0) {
        setSelectedIds(new Set());
        setItems(previous => previous.filter(item => !successful.has(item.id)));
      }
      if (successful.size !== ids.length) setOperationNotice(tr('inbox.management.partialResult'));
    } else {
      setOperationNotice(tr('inbox.management.partialResult'));
    }
    setBusy(null);
  };

  const toggleItemSelection = (id: string) => setSelectedIds(previous => toggleOperationalSelection(previous, id));
  const toggleAllVisible = () => setSelectedIds(previous => toggleAllOperationalSelection(previous, items.map(item => item.id)));

  // ── Trainer: auto-notify client when workout_ready expires without response ──
  // Runs once after items load. For each expired workout_ready with no response,
  // sends a workout_timeout notification to the client so they see the fallback
  // button in their own inbox. Fire-and-forget — never blocks the UI.
  const notifiedTimeoutsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!isTrainer || items.length === 0) return;
    const expired = items.filter(
      i => i.type === 'workout_ready' && isExpired(i) && !i.response && i.from_user_id,
    );
    for (const item of expired) {
      if (notifiedTimeoutsRef.current.has(item.id)) continue;
      // Mark in ref immediately to prevent duplicate calls within the same session.
      // DB query below provides cross-session deduplication.
      notifiedTimeoutsRef.current.add(item.id);
      void (async () => {
        // DB check: has a workout_timeout already been sent for this workout_ready?
        const { data } = await supabase
          .from('notification_log')
          .select('id')
          .eq('to_user_id', item.from_user_id!)
          .eq('type', 'workout_timeout')
          .eq('from_user_id', userId ?? '')
          .gte('created_at', item.created_at)
          .limit(1);
        if (data && data.length > 0) return; // already sent — cross-session guard
        void notify(
          item.from_user_id!,
          tr('inbox.workout_timeout.title'),
          tr('inbox.workout_timeout.body'),
          undefined,
          { type: 'workout_timeout', templateKey: 'workout_timeout',
            params: {} },
        );
      })();
    }
  }, [items, isTrainer, userId, tr]);

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
  // gender param drives i18next context (_male/_female/_other suffix)
  const resolveGenderContext = (item: InboxItem) => {
    const g = item.params?.gender as string | undefined;
    if (g === 'female') return 'female';
    if (g === 'male')   return 'male';
    return undefined; // no context → default (gender-neutral)
  };
  const renderTitle = (item: InboxItem) => {
    const ctx = resolveGenderContext(item);
    const params = { ...templateParams(item), ...(ctx ? { context: ctx } : {}) };
    return item.template_key ? tr(`inbox.templates.${item.template_key}`, params) : item.title;
  };
  const renderBody = (item: InboxItem) => {
    const ctx = resolveGenderContext(item);
    const params = { ...templateParams(item), ...(ctx ? { context: ctx } : {}) };
    return item.template_key ? tr(`inbox.templates.${item.template_key}_body`, params) : item.body;
  };

  const responseLabel = (item: InboxItem) => {
    if (item.response === 'accepted') return tr('inbox.responses.invitationAccepted');
    if (item.response === 'declined') return tr('inbox.responses.invitationDeclined');
    if (item.response === 'revoked') return tr('inbox.responses.invitationRevoked');
    if (item.response === 'renewal_requested') return tr('inbox.responses.renewalRequested');
    if (item.response === 'resent') return tr('inbox.responses.resent');
    if (item.response === 'ignored') return tr('inbox.responses.ignored');
    if (item.type === 'access_request') return item.response === 'approved' ? tr('inbox.responses.accessGranted') : tr('inbox.responses.accessDenied');
    return item.response === 'approved' ? tr('inbox.responses.approved') : tr('inbox.responses.rejected');
  };

  const categoryOptions: Array<'all' | InboxCategory> = ['all', 'actionRequired', 'invitations', 'plansAndWorkouts', 'accessAndPrivacy', 'alerts', 'informational'];
  const actionableItems = scope === 'active' && category === 'all'
    ? items.filter(item => isInboxActionable(item))
    : [];
  const historyItems = actionableItems.length > 0 ? items.filter(item => !isInboxActionable(item)) : items;
  const selectedItems = items.filter(item => selectedIds.has(item.id));
  const selectedCanArchive = selectedItems.length > 0 && selectedItems.every(item => canArchiveInboxItem(item));
  const selectedHasUnread = selectedItems.some(item => item.read_at == null);

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

      {/*
       * Keep the controls mounted while a filtered page is loading.  The search
       * is deliberately server-backed and debounced; conditionally rendering
       * this block on `loading` used to unmount the input after a partial match
       * (for example "be"), which made the browser drop its focus and caret.
       */}
      <div aria-busy={loading} style={{ padding: '0 22px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SegmentedControl
            value={scope}
            color={t.primary}
            activeStyle={{ background: `${t.primary}14`, border: `1px solid ${t.primary}88` }}
            options={[
              { value: 'active', label: tr('inbox.management.scope.active') },
              { value: 'archived', label: tr('inbox.management.scope.archived') },
            ]}
            onChange={(value) => setScope(value as OperationalListScope)}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tr('inbox.management.search')}
            aria-label={tr('inbox.management.search')}
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 11, border: `1px solid ${dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'}`, background: surfRaised(dark), color: textPri(dark), fontSize: 12.5, fontFamily: 'inherit' }}
          />
          <HStack gap={6} style={{ flexWrap: 'wrap' }}>
            {categoryOptions.map(value => (
              <button key={value} onClick={() => setCategory(value)} aria-pressed={category === value} style={{ padding: '5px 8px', borderRadius: 999, border: `1px solid ${category === value ? `${t.primary}88` : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)')}`, background: category === value ? `${t.primary}14` : 'transparent', color: category === value ? t.primary : textMute(dark), fontFamily: 'inherit', fontSize: 10.5, fontWeight: 650, cursor: 'pointer' }}>
                {value === 'all' ? tr('inbox.management.all') : tr(`inbox.management.category.${value}`)}
              </button>
            ))}
            <button onClick={() => setSort(value => value === 'recent' ? 'oldest' : value === 'oldest' ? 'nameAsc' : value === 'nameAsc' ? 'nameDesc' : 'recent')} style={{ padding: '5px 8px', borderRadius: 999, border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, background: 'transparent', color: textSec(dark), fontFamily: 'inherit', fontSize: 10.5, fontWeight: 650, cursor: 'pointer' }}>
              <span aria-hidden="true">↕ </span>{tr(`inbox.management.sort.${sort}`)}
            </button>
          </HStack>
          {items.length > 0 && (
            <>
              <button onClick={toggleAllVisible} style={{ alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 999, border: `1px solid ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)'}`, background: 'transparent', color: textSec(dark), fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                {tr('inbox.management.selectAll')}
              </button>
              {selectedItems.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '9px 10px', borderRadius: 11, background: `${t.primary}12`, border: `1px solid ${t.primary}55` }}>
                  <span style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: textPri(dark) }}>{tr('inbox.management.selected', { count: selectedItems.length })}</span>
                  <button onClick={() => setSelectedIds(new Set())} disabled={busy !== null} style={{ padding: '6px 8px', border: 'none', background: 'transparent', color: textSec(dark), fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>{tr('inbox.management.clearSelection')}</button>
                  {selectedHasUnread && <button onClick={() => void markRead([...selectedIds])} disabled={busy !== null} style={{ padding: '6px 8px', borderRadius: 8, border: `1px solid ${t.primary}66`, background: 'transparent', color: t.primary, fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{tr('inbox.management.markRead')}</button>}
                  <button onClick={() => void updateArchiveState(scope === 'active')} disabled={busy !== null || (scope === 'active' && !selectedCanArchive)} style={{ padding: '6px 8px', borderRadius: 8, border: 'none', background: t.primary, color: '#0E1A2B', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: busy !== null || (scope === 'active' && !selectedCanArchive) ? .45 : 1 }}>
                    {scope === 'active' ? tr('inbox.management.archive') : tr('inbox.management.restore')}
                  </button>
                </div>
              )}
            </>
          )}
          {operationNotice && (
            <div role="status" style={{ padding: '8px 10px', borderRadius: 9, background: `${t.amber ?? '#F5A623'}14`, border: `1px solid ${t.amber ?? '#F5A623'}55`, color: t.amber ?? '#F5A623', fontSize: 11.5 }}>
              {operationNotice}
            </div>
          )}
      </div>

      {!loading && items.length === 0 && (
        <div style={{ padding: '48px 22px', textAlign: 'center' }}>
          <Icon name="bell" size={32} color={textMute(dark)} />
          <div style={{ marginTop: 12, fontSize: 13, color: textMute(dark) }}>
            {search || category !== 'all' || scope === 'archived'
              ? tr('inbox.management.noResults')
              : (isTrainer ? tr('inbox.noAlerts') : tr('inbox.noMessages'))}
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ padding: '0 22px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {actionableItems.length > 0 && (
            <div style={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '.06em', textTransform: 'uppercase', color: t.primary, marginBottom: -2 }}>{tr('inbox.management.category.actionRequired')}</div>
          )}
          {[...actionableItems, ...historyItems].map(item => {
            const open    = expanded === item.id;
            const expired = isExpired(item);
            const isReady = item.type === 'workout_ready';
            const isAccessRequest = item.type === 'access_request';
            const pending = (isTrainer && isReady && !item.response && !expired)
              || (!isTrainer && isAccessRequest && !item.response && !expired);
            const isNewPlan = !isTrainer && item.type === 'plan_sent';

            const accentColor = getBadgeColor(item, expired, isTrainer, t, dark);
            const unread = item.read_at == null;

            return (
              <div key={item.id} style={{
                borderRadius: 14, overflow: 'hidden',
                background: surfRaised(dark),
                border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                display: 'flex',
                opacity: unread ? 1 : 0.7,
              }}>
                {/* Colour accent stripe — only shown for unread cards */}
                <div style={{ width: 4, flexShrink: 0, background: unread ? accentColor : 'transparent', borderRadius: '14px 0 0 14px' }} />
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleItemSelection(item.id)} aria-label={tr('inbox.management.selected', { count: 1 })} style={{ accentColor: t.primary, flexShrink: 0, alignSelf: 'flex-start', margin: '20px 0 0 10px' }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                {/* Card header */}
                <button
                  onClick={() => {
                    setExpanded(open ? null : item.id);
                    if (!open && item.read_at == null) void markRead([item.id]);
                  }}
                  style={{
                    width: '100%', padding: '12px 14px 12px 12px',
                    display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) 14px',
                    columnGap: 11, rowGap: 7, alignItems: 'center',
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <div style={{ gridRow: '1 / span 2' }}>
                    <SenderAvatar name={item.peer_name} color={accentColor} dark={dark} />
                  </div>

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

                  <span style={{ gridColumn: 3, gridRow: 1, fontSize: 10, color: textMute(dark), justifySelf: 'end' }}>{open ? '▲' : '▼'}</span>
                  <div style={{ gridColumn: '2 / 4', minWidth: 0 }}>
                    <StatusBadge item={item} expired={expired} isTrainer={isTrainer} t={t} dark={dark} />
                  </div>
                </button>

                {/* Expanded body */}
                {open && (
                  <div style={{ padding: '0 14px 14px 12px', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                    <p style={{ margin: '0 0 14px', fontSize: 12.5, color: textSec(dark), lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {renderBody(item)}
                    </p>

                    {/* Expiry countdown — client sees minutes remaining */}
                    {isReady && !item.response && !expired && item.expires_at && (
                      <CountdownBanner expiresAt={item.expires_at} primary={t.primary} tr={tr} />
                    )}

                    {/* CLIENT: fallback after trainer timeout — arrives as workout_timeout notification */}
                    {!isTrainer && item.type === 'workout_timeout' && !item.response && (
                      <div style={{ marginBottom: 12 }}>
                        <button
                          onClick={() => nav('workout', { source: 'trainer_timeout', timeoutNotificationId: item.id })}
                          style={{
                            width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                            background: t.amber ?? '#F5A623', color: '#0E1A2B',
                            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          <Icon name="play" size={13} color="#0E1A2B" stroke={2.5} />
                          {tr('inbox.actions.startWorkoutTimeout')}
                        </button>
                      </div>
                    )}

                    {!isTrainer && item.type === 'workout_timeout' && item.response === 'started_autonomously' && (
                      <div style={{ marginBottom: 12, fontSize: 11.5, color: textSec(dark), lineHeight: 1.5 }}>
                        {tr('inbox.actions.timeoutWorkoutStarted')}
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

                    {!isTrainer && item.type === 'trainer_invitation' && !expired && !item.response && typeof item.params?.inviteToken === 'string' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => nav('acceptInvitation', { token: item.params!.inviteToken as string })} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: t.primary, color: '#0E1A2B', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{tr('inbox.actions.acceptTrainerInvitation')}</button>
                        <button onClick={() => void declineInvitation(item)} disabled={busy === item.id} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: `1px solid ${t.accent}66`, background: 'transparent', color: t.accent, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{tr('inbox.actions.declineTrainerInvitation')}</button>
                      </div>
                    )}

                    {!isTrainer && item.type === 'trainer_invitation' && expired && !item.response && typeof item.params?.inviteToken === 'string' && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 9, fontSize: 11.5, color: textMute(dark), lineHeight: 1.45 }}>{tr('invite.expired')}</div>
                        <button onClick={() => void requestNewInvitation(item)} disabled={busy === item.id} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: `1px solid ${t.primary}66`, background: 'transparent', color: t.primary, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: busy === item.id ? 'default' : 'pointer' }}>{tr('inbox.actions.requestNewTrainerInvitation')}</button>
                      </div>
                    )}

                    {isTrainer && item.type === 'trainer_invitation_renewal_request' && !item.response && typeof item.params?.requestId === 'string' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => void respondToRenewal(item, true)} disabled={busy === item.id} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: t.primary, color: '#0E1A2B', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: busy === item.id ? 'default' : 'pointer' }}>{tr('inbox.actions.resendTrainerInvitation')}</button>
                        <button onClick={() => void respondToRenewal(item, false)} disabled={busy === item.id} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: `1px solid ${t.accent}66`, background: 'transparent', color: t.accent, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: busy === item.id ? 'default' : 'pointer' }}>{tr('inbox.actions.ignoreRenewalRequest')}</button>
                      </div>
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
                    {/* TRAINER: Client trained autonomously after timeout */}
                    {isTrainer && item.type === 'trainer_timeout_workout' && (
                      <div style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: `${t.amber ?? '#F5A623'}14`,
                        border: `1px solid ${t.amber ?? '#F5A623'}44`,
                        fontSize: 11.5, color: t.amber ?? '#F5A623', lineHeight: 1.5, marginBottom: 8,
                      }}>
                        {tr('inbox.trainer_timeout_workout.note')}
                      </div>
                    )}

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
                        {responseLabel(item)} · {fmtDate(item.response_at, i18n.language)}
                      </div>
                    )}
                  </div>
                )}
                </div>{/* flex:1 inner wrapper */}
              </div>
            );
          })}
          {hasMore && (
            <button onClick={() => void loadInboxPage(false)} disabled={loadingMore} style={{ padding: '10px 0', borderRadius: 10, border: `1px solid ${t.primary}66`, background: 'transparent', color: t.primary, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? .6 : 1 }}>
              {loadingMore ? tr('inbox.loading') : tr('inbox.management.loadMore')}
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ── Countdown banner — shows minutes remaining for trainer to respond ──────────

function CountdownBanner({ expiresAt, primary, tr }: {
  expiresAt: string;
  primary:   string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tr:        (key: string, opts?: any) => string;
}) {
  const calcMin = () => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60000));
  const [minsLeft, setMinsLeft] = React.useState(calcMin);

  React.useEffect(() => {
    if (minsLeft <= 0) return;
    const id = setInterval(() => setMinsLeft(calcMin()), 30000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return (
    <div style={{
      marginBottom: 12, padding: '6px 10px', borderRadius: 8,
      background: `${primary}14`, fontSize: 11, color: primary, lineHeight: 1.5,
    }}>
      {minsLeft > 0
        ? tr('inbox.workout_ready.countdown', { min: minsLeft })
        : tr('inbox.workout_ready.expired_no_response')}
    </div>
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
  if (item.response === 'renewal_requested') return badge(tr('inbox.badges.renewalRequested'), '#4ade80');
  if (item.response === 'resent') return badge(tr('inbox.badges.resent'), '#4ade80');
  if (item.response === 'ignored') return badge(tr('inbox.badges.ignored'), textMute(dark), true);
  if (item.response === 'rejected' || item.type === 'workout_rejected' || item.type === 'access_denied') return badge(tr('inbox.badges.rejected'), t.accent);
  if (expired && item.type === 'workout_ready') return badge(tr('inbox.badges.expired'), textMute(dark), true);
  if (item.type === 'workout_ready' && isTrainer)                        return badge(tr('inbox.badges.pending'), t.primary);
  if (item.type === 'access_request' && !isTrainer)                      return badge(tr('inbox.badges.pending'), t.primary);
  if (item.type === 'plan_sent')                                          return badge(tr('inbox.badges.newPlan'), t.primary);
  if (item.type === 'trainer_timeout_workout')                             return badge(tr('inbox.badges.trainedAutonomously'), t.amber ?? '#F5A623');
  if (item.type === 'workout_timeout')                                     return badge(tr('inbox.badges.trainerTimeout'), t.amber ?? '#F5A623');
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
  if (item.response === 'renewal_requested' || item.response === 'resent') return '#4ade80';
  if (item.response === 'ignored') return textMute(dark);
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
