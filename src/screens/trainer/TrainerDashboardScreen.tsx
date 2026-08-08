import React from 'react';
import { effectiveInvitationStatus, toggleAllManagedSelection, toggleManagedSelection, visibleTrainerInvitations } from '../../lib/trainerInvitationManagement';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { SegmentedControl, TextInput, VStack, HStack } from '@/ui';
import { supabase } from '../../supabase';
import { useAlerts } from '../../hooks/useAlerts';
import { Icon } from '../../components/Icon';
import { AvatarImage } from '../../components/Avatar';
import { ScreenTitle } from '../../components/ScreenTitle';
import { surfRaised, borderSubtle, textPri, textSec, textMute, ghostBtn } from '../../theme';
import type { NavFn, Subscription } from '../../types';
import type { TrainerAlert, OperationalTask } from '../../types/workout';
import { useFeatureAccess, useEffectivePlanKey } from '../../hooks/useFeatureAccess';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTrainerTheme } from '../../hooks/useTrainerTheme';
import { friendlyError } from '../../lib/friendlyError';

interface ClientProfile {
  id:         string;
  name:       string;
  email:      string;
  avatar_url: string | null;
}

interface TrainerClient {
  id:         string;
  status:     string;
  created_at: string;
  client:     (ClientProfile & { role?: string }) | null;
}

interface SafetyGateEvent {
  id:                string;
  user_id:           string;
  status:            string;
  readiness_score:   number | null;
  triggered_signals: string[] | null;
  created_at:        string | null;
}

interface ActiveSession {
  id:          string;
  user_id:     string;
  status:      string | null;
  started_at:  string | null;
}

interface TrainerInvitation {
  id:            string;
  invited_email: string;
  invited_name:  string;
  status:        string;
  created_at:    string | null;
  expires_at:    string;
  archived_at?:  string | null;
}

interface DiscoverableClient {
  id: string;
  display_name: string;
  avatar_url: string | null;
  plan_key: string;
}

interface TrainerDashboardUser {
  id:           string;
  name?:        string;
  email?:       string;
  plan_key?:    string;
  subscription?: Subscription | null;
}

const invitationsTable = () => supabase.from('trainer_invitations');

interface TrainerDashboardScreenProps {
  nav:          NavFn;
  user:         TrainerDashboardUser | null;
  selectClient?: (client: ClientProfile) => void;
  startFreeSession?: () => void | Promise<void>;
}

export function TrainerDashboardScreen({
  nav: _nav,
  user,
  selectClient,
  startFreeSession,
}: TrainerDashboardScreenProps) {
  const { t, dark } = useTrainerTheme();
  const { t: tr } = useTranslation();
  const { alerts, tasks, acknowledgeAlert, resolveAlert, completeTask } = useAlerts(user?.id);

  const effectivePlanKey  = useEffectivePlanKey(user?.subscription ?? null);
  const clientLimitAccess = useFeatureAccess(effectivePlanKey, 'clients.limit');

  const [clients, setClients]           = React.useState<TrainerClient[]>([]);
  const [loading, setLoading]           = React.useState(true);
  const [showInvite, setShowInvite]     = React.useState(false);
  const [inviteName, setInviteName]     = React.useState('');
  const [inviteEmail, setInviteEmail]   = React.useState('');
  const [inviteMode, setInviteMode]     = React.useState<'email' | 'inApp'>('email');
  const [candidateSearch, setCandidateSearch] = React.useState('');
  const [candidatePlan, setCandidatePlan] = React.useState<'all' | 'free' | 'ai_fitness' | 'ai_performance'>('all');
  const [candidates, setCandidates] = React.useState<DiscoverableClient[]>([]);
  const [searchingCandidates, setSearchingCandidates] = React.useState(false);
  const [invitingCandidateId, setInvitingCandidateId] = React.useState<string | null>(null);
  const [inviteErr, setInviteErr]       = React.useState('');
  const [inviteOk, setInviteOk]         = React.useState('');
  const [inviting, setInviting]         = React.useState(false);
  const [pendingReviews, setPendingReviews] = React.useState<SafetyGateEvent[]>([]);
  const [reviewingId, setReviewingId]   = React.useState<string | null>(null);
  const [activeSessions, setActiveSessions] = React.useState<ActiveSession[]>([]);
  const [invitations, setInvitations]   = React.useState<TrainerInvitation[]>([]);
  const [invitationBusyId, setInvitationBusyId] = React.useState<string | null>(null);
  const [manageInvites, setManageInvites] = React.useState(false);
  const [inviteSearch, setInviteSearch] = React.useState('');
  const [inviteFilter, setInviteFilter] = React.useState<'all' | 'sent' | 'accepted' | 'declined' | 'expired' | 'revoked'>('all');
  const [inviteArchiveScope, setInviteArchiveScope] = React.useState<'active' | 'archived'>('active');
  const [inviteSort, setInviteSort] = React.useState<'recent' | 'oldest' | 'nameAsc' | 'nameDesc' | 'status'>('recent');
  const [selectedInvitationIds, setSelectedInvitationIds] = React.useState<Set<string>>(new Set());
  const [manageClients, setManageClients] = React.useState(false);
  const [selectedClientIds, setSelectedClientIds] = React.useState<Set<string>>(new Set());
  const [startingFree, setStartingFree] = React.useState(false);

  const fetchSafetyGate = React.useCallback((clientIds: string[]) => {
    if (clientIds.length === 0) { setPendingReviews([]); return; }
    supabase
      .from('safety_gate_events')
      .select('id,user_id,status,readiness_score,triggered_signals,created_at')
      .in('user_id', clientIds)
      .eq('human_review_required', true)
      .is('human_reviewed_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPendingReviews((data || []) as SafetyGateEvent[]));
  }, []);

  // Realtime subscription for check-in submissions — re-fetch safety gate queue
  React.useEffect(() => {
    if (!user?.id || clients.length === 0) return;
    const clientIds = clients.filter(c => c.status === 'active' && c.client?.id).map(c => c.client!.id);
    if (clientIds.length === 0) return;

    const channel = supabase
      .channel('trainer-checkins')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'checkin_prontidao' },
        () => { fetchSafetyGate(clientIds); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, clients, fetchSafetyGate]);

  const fetchClients = React.useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('trainer_clients')
      .select('id, status, created_at, client:profiles!trainer_clients_client_id_fkey(id, name, email, role, avatar_url)')
      .eq('trainer_id', user.id)
      // The Clients screen is a relationship surface, not an invitation queue.
      // A prospect only becomes visible here after explicitly accepting an invite.
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Free-session synthetic subjects carry an active link (required by RLS) but
    // must never surface in MyClients. Exclude them defensively, client-side.
    const clientsList = ((data || []) as unknown as TrainerClient[])
      .filter(c => c.client?.role !== 'free_session_subject');
    setClients(clientsList);

    const ids: string[] = [];
    for (const c of clientsList) {
      if (c.status === 'active' && c.client?.id) ids.push(c.client.id);
    }
    fetchSafetyGate(ids);

    if (ids.length > 0) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      void supabase.from('workout_sessions')
        .update({ status: 'abandoned' })
        .in('user_id', ids)
        .eq('status', 'active')
        .lt('started_at', dayAgo);

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, user_id, status, started_at')
        .in('user_id', ids)
        .eq('status', 'active')
        .order('started_at', { ascending: false });
      setActiveSessions(sessions as ActiveSession[]);
    }

    setLoading(false);
  }, [user?.id, fetchSafetyGate]);

  React.useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    void fetchClients();
  }, [user?.id, fetchClients]);

  // Realtime subscription for active sessions
  React.useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('trainer-active-sessions')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'workout_sessions' },
        () => {
          const clientIds = clients.filter(c => c.status === 'active' && c.client?.id).map(c => c.client!.id);
          if (clientIds.length === 0) { setActiveSessions([]); return; }
          supabase
            .from('workout_sessions')
            .select('id, user_id, status, started_at')
            .in('user_id', clientIds)
            .eq('status', 'active')
            .order('started_at', { ascending: false })
            .then(({ data }) => setActiveSessions((data ?? []) as ActiveSession[]));
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, clients]);

  async function markReviewed(eventId: string) {
    if (!user?.id) return;
    setReviewingId(eventId);
    await supabase
      .from('safety_gate_events')
      .update({ human_reviewed_at: new Date().toISOString(), human_reviewed_by: user.id })
      .eq('id', eventId);
    setPendingReviews(prev => prev.filter(e => e.id !== eventId));
    setReviewingId(null);
  }

  async function fetchInvitations() {
    if (!user?.id) return;
    const { data } = await invitationsTable()
      .select('id, invited_email, invited_name, status, created_at, expires_at, archived_at')
      .eq('trainer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setInvitations(data ?? []);
  }

  async function sendInvite(email: string, name: string): Promise<{ ok: boolean; emailSent?: boolean; error?: string; limit?: number }> {
    if (!user?.id) return { ok: false };
    const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
    const apiBase  = isNative ? (import.meta.env.VITE_API_URL ?? '') : '';
    const { authHeaders } = await import('../../lib/authHeaders');
    const res = await fetch(`${apiBase}/api/send-invitation`, {
      method:  'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        trainerName:  user.name ?? '',
        invitedEmail: email,
        invitedName:  name,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error };
    return { ok: true, emailSent: !!json?.emailSent };
  }

  async function invite() {
    if (!inviteEmail || !inviteName || !user?.id) return;
    setInviting(true);
    setInviteErr('');
    setInviteOk('');
    try {
      const result = await sendInvite(inviteEmail, inviteName);
      if (!result.ok) {
        setInviteErr(
          (result.error === 'already_linked_elsewhere' || result.error === 'already_linked') ? tr('trainer.dashboard.errAlreadyLinked')
          : result.error === 'recipient_not_client'  ? tr('trainer.dashboard.errInviteRecipientNotClient')
          : result.error === 'client_limit_reached'   ? tr('trainer.dashboard.clientLimitReached')
          : tr('trainer.dashboard.errInviteFailed')
        );
        setInviting(false);
        return;
      }
      setInviteOk(result.emailSent
        ? tr('trainer.dashboard.inviteSent')
        : tr('trainer.dashboard.inviteCreatedNoEmail'));
      setInviteName('');
      setInviteEmail('');
      setInviting(false);
      fetchInvitations();
    } catch (err) {
      setInviteErr(friendlyError(err, tr));
      setInviting(false);
    }
  }

  async function findCandidates() {
    setSearchingCandidates(true);
    setInviteErr('');
    const { data, error } = await supabase.rpc('search_discoverable_free_clients', {
      p_query: candidateSearch,
      p_plan_keys: candidatePlan === 'all' ? null : [candidatePlan],
      p_limit: 20,
      p_offset: 0,
    });
    if (error) setInviteErr(tr('trainer.dashboard.errCandidateSearch'));
    else setCandidates((data ?? []) as DiscoverableClient[]);
    setSearchingCandidates(false);
  }

  async function inviteInApp(candidate: DiscoverableClient) {
    setInvitingCandidateId(candidate.id);
    setInviteErr('');
    const { error } = await supabase.rpc('create_trainer_in_app_invitation', { p_client_id: candidate.id });
    if (error) setInviteErr(tr('trainer.dashboard.errInviteFailed'));
    else {
      setInviteOk(tr('trainer.dashboard.inAppInviteSent', { name: candidate.display_name }));
      setCandidates(prev => prev.filter(item => item.id !== candidate.id));
      void fetchInvitations();
    }
    setInvitingCandidateId(null);
  }

  async function revokeInvitation(inv: TrainerInvitation) {
    setInvitationBusyId(inv.id);
    await supabase.rpc('revoke_trainer_invitation', { p_invitation_id: inv.id });
    await fetchInvitations();
    setInvitationBusyId(null);
  }

  async function revokeAndArchiveInvitation(inv: TrainerInvitation) {
    if (!window.confirm(tr('trainer.dashboard.confirmRevokeAndArchive', { name: inv.invited_name }))) return;
    setInvitationBusyId(inv.id);
    const { error: revokeError } = await supabase.rpc('revoke_trainer_invitation', { p_invitation_id: inv.id });
    if (revokeError) {
      setInviteErr(tr('trainer.dashboard.errInvitationOperation'));
      setInvitationBusyId(null);
      return;
    }
    const { error: archiveError } = await supabase.rpc('archive_trainer_invitations', {
      p_invitation_ids: [inv.id],
      p_archive: true,
    });
    if (archiveError) setInviteErr(tr('trainer.dashboard.errInvitationOperation'));
    await fetchInvitations();
    setInvitationBusyId(null);
  }

  async function resendInvitation(inv: TrainerInvitation) {
    setInvitationBusyId(inv.id);
    if (inv.status === 'sent') {
      await supabase.rpc('revoke_trainer_invitation', { p_invitation_id: inv.id });
    }
    await sendInvite(inv.invited_email, inv.invited_name);
    await fetchInvitations();
    setInvitationBusyId(null);
  }

  async function setSelectedInvitationArchiveState(archive: boolean) {
    const ids = [...selectedInvitationIds];
    if (ids.length === 0) return;
    if (archive && !window.confirm(tr('trainer.dashboard.confirmArchiveSelected', { count: ids.length }))) return;
    setInvitationBusyId('bulk');
    const { error } = await supabase.rpc('archive_trainer_invitations', {
      p_invitation_ids: ids,
      p_archive: archive,
    });
    if (!error) { setSelectedInvitationIds(new Set()); await fetchInvitations(); }
    else setInviteErr(tr('trainer.dashboard.errInvitationOperation'));
    setInvitationBusyId(null);
  }

  async function endSelectedClientLinks() {
    const ids = [...selectedClientIds];
    if (ids.length === 0) return;
    if (!window.confirm(tr('trainer.dashboard.confirmEndClients', { count: ids.length }))) return;
    setInvitationBusyId('end-clients');
    const { error } = await supabase.rpc('end_trainer_client_links', { p_link_ids: ids, p_reason: null });
    if (error) setInviteErr(tr('trainer.dashboard.errClientOperation'));
    else { setSelectedClientIds(new Set()); await fetchClients(); }
    setInvitationBusyId(null);
  }

  const toggleClient = (id: string) => setSelectedClientIds(prev => {
    return toggleManagedSelection(prev, id);
  });
  const toggleAllActiveClients = () => setSelectedClientIds(prev => {
    return toggleAllManagedSelection(prev, activeClients.map(c => c.id));
  });

  const visibleInvitations = React.useMemo(() => {
    return visibleTrainerInvitations(invitations, inviteArchiveScope, inviteFilter, inviteSearch, inviteSort);
  }, [invitations, inviteArchiveScope, inviteFilter, inviteSearch, inviteSort]);

  const toggleInvitation = (id: string) => setSelectedInvitationIds(prev => {
    return toggleManagedSelection(prev, id);
  });
  const selectableInvitationIds = visibleInvitations
    .filter(inv => effectiveInvitationStatus(inv) !== 'sent')
    .map(inv => inv.id);
  const toggleAllVisible = () => setSelectedInvitationIds(prev => {
    return toggleAllManagedSelection(prev, selectableInvitationIds);
  });

  const activeClients  = clients.filter(c => c.status === 'active');

  const atClientLimit = (
    !clientLimitAccess.loading &&
    clientLimitAccess.allowed &&
    clientLimitAccess.limitValue !== null &&
    activeClients.length >= clientLimitAccess.limitValue
  );

  const clientNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const tc of clients) {
      if (tc.client?.id) map[tc.client.id] = tc.client.name;
    }
    return map;
  }, [clients]);

  // Derive per-client session status
  const sessionStatusMap = React.useMemo(() => {
    const map: Record<string, 'active' | 'abandoned'> = {};
    for (const s of activeSessions) {
      map[s.user_id] = s.status as 'active' | 'abandoned';
    }
    return map;
  }, [activeSessions]);

  return (
    <>
      <ScreenTitle dark={dark} sub={tr('trainer.dashboard.subActive', { active: activeClients.length })}>
        {tr('trainer.dashboard.title')}
      </ScreenTitle>

      <VStack padding="0 22px 32px" gap={12}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: textMute(dark), fontSize: 13 }}>
            {tr('trainer.dashboard.loading')}
          </div>
        )}

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
        `}</style>

        {/* Safety Gate review queue */}
        {!loading && pendingReviews.length > 0 && (
          <div style={{
            padding: '14px 16px', borderRadius: 16,
            background: `${t.accent}0D`, border: `1.5px solid ${t.accent}33`,
          }}>
            <HStack gap={8} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.accent }}>
                {tr('trainer.dashboard.safetyGatePending')}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: t.accent, color: '#fff',
              }}>
                {pendingReviews.length}
              </div>
            </HStack>

            {pendingReviews.map((ev, i) => (
              <div key={ev.id} style={{
                padding: '10px 0',
                borderBottom: i < pendingReviews.length - 1 ? `1px solid ${SEVERITY_COLOR.critical}22` : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>
                    {clientNameMap[ev.user_id] || tr('trainer.dashboard.clientFallback')}
                  </div>
                  <HStack gap={6} flexWrap="wrap" style={{ marginTop: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: ev.status === 'blocked' ? SEVERITY_COLOR.critical : SEVERITY_COLOR.high,
                    }}>
                      {ev.status.toUpperCase()}{ev.readiness_score != null ? ` · ${ev.readiness_score}pts` : ''}
                    </span>
                    {(ev.triggered_signals ?? []).slice(0, 2).map(s => (
                      <span key={s} style={{ fontSize: 10, color: textMute(dark) }}>· {s}</span>
                    ))}
                  </HStack>
                  {ev.created_at && (
                    <div style={{ fontSize: 10, color: textMute(dark), marginTop: 2 }}>
                      {new Date(ev.created_at).toLocaleDateString(i18n.language || 'en-US')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => markReviewed(ev.id)}
                  disabled={reviewingId === ev.id}
                  style={{
                    padding: '8px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: `${SEVERITY_COLOR.low}18`, color: SEVERITY_COLOR.low,
                    border: `1px solid ${SEVERITY_COLOR.low}40`, fontFamily: 'inherit', cursor: 'pointer',
                    opacity: reviewingId === ev.id ? 0.5 : 1, flexShrink: 0,
                    transition: 'opacity .15s',
                  }}
                >
                  {reviewingId === ev.id ? '…' : `✓ ${tr('trainer.dashboard.resolve')}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Open alerts */}
        {alerts.length > 0 && (
          <AlertsSection
            alerts={alerts}
            dark={dark}
            t={t}
            clientNameMap={clientNameMap}
            onAcknowledge={acknowledgeAlert}
            onResolve={resolveAlert}
          />
        )}

        {/* Pending tasks */}
        {tasks.length > 0 && (
          <TasksSection
            tasks={tasks}
            dark={dark}
            t={t}
            clientNameMap={clientNameMap}
            onComplete={completeTask}
          />
        )}

        {!loading && clients.length === 0 && (
          <div style={{
            padding: 32, borderRadius: 18,
            background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
            textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
              background: `${t.primary}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="user" size={24} color={t.primary} stroke={2} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: textPri(dark), marginBottom: 6 }}>
              {tr('trainer.dashboard.noClients')}
            </div>
            <div style={{ fontSize: 13, color: textSec(dark) }}>
              {tr('trainer.dashboard.noClientsNote')}
            </div>
          </div>
        )}

        {clients.map(tc => (
          <div key={tc.id} style={{
            padding: '14px 16px', borderRadius: 16,
            background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {manageClients && tc.status === 'active' && <input type="checkbox" checked={selectedClientIds.has(tc.id)} onChange={() => toggleClient(tc.id)} aria-label={tr('trainer.dashboard.selectClient', { name: tc.client?.name || '' })} />}
            <AvatarImage url={tc.client?.avatar_url} label={tc.client?.name || '?'} w={42} h={42} radius={14} dark={dark}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>
                {tc.client?.name || tr('trainer.dashboard.unknown')}
              </div>
              <div style={{
                fontSize: 12, color: textSec(dark), marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {tc.client?.email}
              </div>
            </div>
            {tc.status === 'pending' ? (
              <div style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                background: `${t.accent}22`, color: t.accent, letterSpacing: '.05em', textTransform: 'uppercase',
                flexShrink: 0,
              }}>
                {tr('trainer.dashboard.pending')}
              </div>
            ) : (
              <HStack gap={8} style={{ flexShrink: 0 }}>
                {tc.client?.id && sessionStatusMap[tc.client.id] === 'active' && (
                  <div style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: `${t.liveAction}22`, color: t.liveAction, letterSpacing: '.05em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.liveAction, animation: 'pulse 1.5s ease-in-out infinite' }}/>
                    {tr('trainer.dashboard.training')}
                  </div>
                )}
                <button
                  onClick={() => tc.client && selectClient && selectClient(tc.client)}
                  style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: `${t.accent}22`, color: t.accent,
                    border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  {tr('trainer.dashboard.view')}
                </button>
              </HStack>
            )}
          </div>
        ))}

        {clients.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setManageClients(v => !v); setSelectedClientIds(new Set()); }} style={{ ...ghostBtn(dark), padding: '7px 11px', borderRadius: 999, fontSize: 11 }}>
            {manageClients ? tr('trainer.dashboard.finishManagingClients') : tr('trainer.dashboard.manageClients')}
          </button>
          {manageClients && <>
            <button onClick={toggleAllActiveClients} style={{ ...ghostBtn(dark), padding: '7px 11px', borderRadius: 999, fontSize: 11 }}>{tr('trainer.dashboard.selectAll')}</button>
            <button onClick={() => void endSelectedClientLinks()} disabled={!selectedClientIds.size || invitationBusyId === 'end-clients'} style={{ ...ghostBtn(dark), padding: '7px 11px', borderRadius: 999, fontSize: 11, opacity: selectedClientIds.size ? 1 : .5 }}>{tr('trainer.dashboard.endSelectedClients', { count: selectedClientIds.size })}</button>
          </>}
        </div>}

        {/* Invite form */}
        {showInvite ? (
          <div style={{
            padding: 18, borderRadius: 16,
            background: surfRaised(dark), border: `1.5px solid ${t.primary}`,
          }}>
            <HStack gap={8} style={{ marginBottom: 10 }}>
              <button onClick={() => setInviteMode('email')} style={{ ...ghostBtn(dark), padding: '7px 10px', borderRadius: 999, fontSize: 11, opacity: inviteMode === 'email' ? 1 : .6 }}>{tr('trainer.dashboard.inviteByEmail')}</button>
              <button onClick={() => { setInviteMode('inApp'); void findCandidates(); }} style={{ ...ghostBtn(dark), padding: '7px 10px', borderRadius: 999, fontSize: 11, opacity: inviteMode === 'inApp' ? 1 : .6 }}>{tr('trainer.dashboard.findInTrainer')}</button>
            </HStack>
            {inviteMode === 'email' ? <>
              <TextInput icon="user" placeholder={tr('trainer.dashboard.inviteNamePlaceholder')} value={inviteName} onChange={setInviteName} />
              <div style={{ marginTop: 8 }}><TextInput icon="mail" placeholder="client@email.com" type="email" value={inviteEmail} onChange={setInviteEmail} /></div>
            </> : <>
              <div style={{ fontSize: 12, color: textSec(dark), marginBottom: 8 }}>{tr('trainer.dashboard.findInTrainerHint')}</div>
              <TextInput icon="user" placeholder={tr('trainer.dashboard.searchCandidates')} value={candidateSearch} onChange={setCandidateSearch} />
              <HStack gap={6} style={{ marginTop: 8, flexWrap: 'wrap' }}>
                {(['all', 'free', 'ai_fitness', 'ai_performance'] as const).map(plan => <button key={plan} onClick={() => { setCandidatePlan(plan); }} style={{ ...ghostBtn(dark), padding: '5px 8px', borderRadius: 999, fontSize: 10, opacity: candidatePlan === plan ? 1 : .65 }}>{tr(`trainer.dashboard.candidatePlan.${plan}`)}</button>)}
                <button onClick={() => void findCandidates()} disabled={searchingCandidates} style={{ ...ghostBtn(dark), padding: '5px 8px', borderRadius: 999, fontSize: 10 }}>{searchingCandidates ? tr('common.loading') : tr('common.search')}</button>
              </HStack>
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {candidates.map(candidate => <div key={candidate.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${borderSubtle(dark)}` }}>
                  <AvatarImage url={candidate.avatar_url} label={candidate.display_name} w={30} h={30} radius={10} dark={dark}/>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, color: textPri(dark) }}>{candidate.display_name}</div><div style={{ fontSize: 10, color: textMute(dark) }}>{candidate.plan_key}</div></div>
                  <button onClick={() => void inviteInApp(candidate)} disabled={invitingCandidateId === candidate.id} style={{ ...ghostBtn(dark), padding: '6px 10px', borderRadius: 999, fontSize: 11 }}>{tr('trainer.dashboard.send')}</button>
                </div>)}
                {!searchingCandidates && candidates.length === 0 && <div style={{ fontSize: 11, color: textMute(dark) }}>{tr('trainer.dashboard.noCandidates')}</div>}
              </div>
            </>}
            {inviteErr && (
              <div style={{ color: t.accent, fontSize: 11, marginTop: 8 }}>
                {inviteErr}
              </div>
            )}
            {inviteOk && (
              <div style={{ color: t.primary, fontSize: 11, marginTop: 8 }}>
                {inviteOk}
              </div>
            )}
            <HStack gap={8} style={{ marginTop: 12 }}>
              {inviteMode === 'email' && <button
                onClick={() => { setShowInvite(false); setInviteName(''); setInviteEmail(''); setInviteErr(''); setInviteOk(''); }}
                style={{
                  ...ghostBtn(dark),
                  flex: 1,
                  padding: '12px 0',
                  textAlign: 'center',
                  borderRadius: 12,
                }}
              >
                {tr('trainer.dashboard.cancel')}
              </button>}
              <button
                onClick={invite}
                disabled={inviting || !inviteName || !inviteEmail}
                style={{
                  flex: 2, padding: '13px 0', border: 'none', borderRadius: 999,
                  background: t.accent, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                  fontFamily: '"Plus Jakarta Sans",sans-serif', cursor: 'pointer',
                  opacity: (inviting || !inviteName || !inviteEmail) ? 0.7 : 1,
                }}
              >
                {inviting ? tr('trainer.dashboard.sending') : tr('trainer.dashboard.send')}
              </button>
            </HStack>

            {invitations.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${borderSubtle(dark)}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
                  {tr('trainer.dashboard.inviteHistoryTitle')}
                </div>
                <button onClick={() => { setManageInvites(v => !v); setSelectedInvitationIds(new Set()); }} style={{ ...ghostBtn(dark), padding: '6px 10px', borderRadius: 999, fontSize: 11, marginBottom: 8 }}>
                  {manageInvites ? tr('trainer.dashboard.finishManagingInvites') : tr('trainer.dashboard.manageInvites')}
                </button>
                {manageInvites && <>
                  <TextInput value={inviteSearch} onChange={setInviteSearch} placeholder={tr('trainer.dashboard.searchInvites')} />
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
                      {tr('trainer.dashboard.invitationScopeLabel')}
                    </div>
                    <SegmentedControl
                      value={inviteArchiveScope}
                      color={t.primarySoft}
                      activeStyle={{
                        background: `${t.primarySoft}14`,
                        border: `1px solid ${t.primarySoft}99`,
                      }}
                      options={[
                        { value: 'active', label: tr('trainer.dashboard.invitationScope.active') },
                        { value: 'archived', label: tr('trainer.dashboard.invitationScope.archived') },
                      ]}
                      onChange={(scope) => {
                        setInviteArchiveScope(scope as 'active' | 'archived');
                        setSelectedInvitationIds(new Set());
                      }}
                    />
                  </div>
                  <HStack gap={6} style={{ margin: '8px 0', flexWrap: 'wrap' }}>
                    {(['all', 'sent', 'accepted', 'declined', 'expired', 'revoked'] as const).map(filter => (
                      <button key={filter} onClick={() => { setInviteFilter(filter); setSelectedInvitationIds(new Set()); }} aria-pressed={inviteFilter === filter} style={{ ...ghostBtn(dark), padding: '5px 8px', borderRadius: 999, fontSize: 10, opacity: inviteFilter === filter ? 1 : .65 }}>
                        {tr(`trainer.dashboard.inviteFilter.${filter}`)}
                      </button>
                    ))}
                    <button onClick={() => setInviteSort(s => s === 'recent' ? 'oldest' : s === 'oldest' ? 'nameAsc' : s === 'nameAsc' ? 'nameDesc' : s === 'nameDesc' ? 'status' : 'recent')} style={{ ...ghostBtn(dark), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 999, fontSize: 10 }}>
                      <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1 }}>↕</span>
                      {tr(`trainer.dashboard.inviteSort.${inviteSort}`)}
                    </button>
                  </HStack>
                  <HStack gap={8} style={{ marginBottom: selectedInvitationIds.size ? 10 : 8 }}>
                    <button onClick={toggleAllVisible} disabled={selectableInvitationIds.length === 0} style={{ ...ghostBtn(dark), padding: '6px 10px', borderRadius: 999, fontSize: 11, opacity: selectableInvitationIds.length ? 1 : .5 }}>{tr('trainer.dashboard.selectAll')}</button>
                  </HStack>
                  {selectedInvitationIds.size > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      flexWrap: 'wrap', padding: '10px 12px', marginBottom: 10, borderRadius: 12,
                      background: `${t.accent}14`, border: `1px solid ${t.accent}66`,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: textPri(dark) }}>
                        {tr('trainer.dashboard.selectedInvitations', { count: selectedInvitationIds.size })}
                      </div>
                      <HStack gap={8} style={{ flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setSelectedInvitationIds(new Set())}
                          disabled={invitationBusyId === 'bulk'}
                          style={{ ...ghostBtn(dark), padding: '7px 10px', borderRadius: 9, fontSize: 11 }}
                        >
                          {tr('trainer.dashboard.clearSelection')}
                        </button>
                        <button
                          onClick={() => void setSelectedInvitationArchiveState(inviteArchiveScope !== 'archived')}
                          disabled={invitationBusyId === 'bulk'}
                          style={{
                            padding: '8px 12px', borderRadius: 9, border: 'none',
                            background: t.accent, color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                            fontFamily: '"Plus Jakarta Sans",sans-serif', cursor: 'pointer',
                            opacity: invitationBusyId === 'bulk' ? .65 : 1,
                          }}
                        >
                          {inviteArchiveScope === 'archived'
                            ? tr('trainer.dashboard.restoreSelected', { count: selectedInvitationIds.size })
                            : tr('trainer.dashboard.archiveSelected', { count: selectedInvitationIds.size })}
                        </button>
                      </HStack>
                    </div>
                  )}
                </>}
                {manageInvites && visibleInvitations.length === 0 && (
                  <div style={{ fontSize: 12, color: textMute(dark), padding: '10px 0' }}>{tr('trainer.dashboard.noInvitationsFound')}</div>
                )}
                {(manageInvites ? visibleInvitations : invitations.filter(inv => !inv.archived_at).slice(0, 8)).map(inv => {
                  const isExpired = inv.status === 'sent' && new Date(inv.expires_at) < new Date();
                  const status = isExpired ? 'expired' : inv.status;
                  const statusColor = status === 'accepted' ? t.primary
                    : status === 'sent' ? t.accent
                    : textMute(dark);
                  const busy = invitationBusyId === inv.id;
                  return (
                    <div key={inv.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '7px 0' }}>
                      {manageInvites && status !== 'sent' && <input type="checkbox" checked={selectedInvitationIds.has(inv.id)} onChange={() => toggleInvitation(inv.id)} aria-label={tr('trainer.dashboard.selectInvite', { name: inv.invited_name })} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: textPri(dark), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.invited_name}
                        </div>
                        <div style={{ fontSize: 11, color: textMute(dark), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.invited_email}
                        </div>
                        {manageInvites && (inviteSort === 'recent' || inviteSort === 'oldest') && inv.created_at && (
                          <div style={{ fontSize: 10, color: textMute(dark), marginTop: 2 }}>
                            {tr('trainer.dashboard.invitedOn', {
                              date: new Date(inv.created_at).toLocaleDateString(i18n.language || 'en-US', {
                                day: 'numeric', month: 'long', year: 'numeric',
                              }),
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                        textTransform: 'uppercase', letterSpacing: '.04em',
                        background: `${statusColor}1A`, color: statusColor,
                      }}>
                        {tr(`trainer.dashboard.inviteStatus.${status}`)}
                      </div>
                      {status === 'sent' && (
                        <>
                          <button onClick={() => revokeInvitation(inv)} disabled={busy} style={{ ...ghostBtn(dark), padding: '6px 10px', borderRadius: 999, fontSize: 11 }}>
                            {tr('trainer.dashboard.revoke')}
                          </button>
                          {manageInvites && <button onClick={() => void revokeAndArchiveInvitation(inv)} disabled={busy} style={{ ...ghostBtn(dark), padding: '6px 10px', borderRadius: 999, fontSize: 11 }}>
                            {tr('trainer.dashboard.revokeAndArchive')}
                          </button>}
                        </>
                      )}
                      {(status === 'expired' || status === 'revoked' || status === 'declined') && (
                        <button onClick={() => resendInvitation(inv)} disabled={busy} style={{ ...ghostBtn(dark), padding: '6px 10px', borderRadius: 999, fontSize: 11 }}>
                          {tr('trainer.dashboard.resend')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : atClientLimit ? (
          <div style={{
            padding: '16px 18px', borderRadius: 14,
            border: `1.5px solid ${t.accent}55`,
            background: `${t.accent}0D`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, marginBottom: 4 }}>
              {tr('trainer.dashboard.clientLimitReached')}
            </div>
            <div style={{ fontSize: 12, color: textSec(dark), marginBottom: 12 }}>
              {tr('trainer.dashboard.clientLimitReachedNote', {
                plan: (user?.plan_key ?? 'trial').toUpperCase(),
                limit: clientLimitAccess.limitValue,
              })}
            </div>
            <button
              onClick={() => _nav('plans', { source: 'manage' })}
              style={{
                padding: '10px 18px', borderRadius: 10,
                background: t.accent, color: '#fff',
                border: 'none', fontFamily: '"Plus Jakarta Sans",sans-serif',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {tr('trainer.dashboard.upgradeNow')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setShowInvite(true); fetchInvitations(); }}
            style={{
              padding: '14px 18px', borderRadius: 14,
              border: `1.5px dashed ${DARK.surface}`,
              background: 'transparent', color: t.accent,
              fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon name="plus" size={16} color={t.accent} /> {tr('trainer.dashboard.inviteClient')}
          </button>
        )}

        {/* Free Training Session — placed below "+ Invite client" */}
        {!showInvite && startFreeSession && (
          <button
            onClick={async () => { setStartingFree(true); try { await startFreeSession(); } finally { setStartingFree(false); } }}
            disabled={startingFree}
            style={{
              padding: '14px 18px', borderRadius: 14,
              border: `1.5px solid ${t.liveAction}55`,
              background: `${t.liveAction}14`, color: t.liveAction,
              fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 13, fontWeight: 700, cursor: startingFree ? 'default' : 'pointer',
              opacity: startingFree ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon name="play" size={16} color={t.liveAction} /> {startingFree ? tr('trainer.dashboard.startingFreeSession') : tr('trainer.dashboard.freeSession')}
          </button>
        )}
      </VStack>
    </>
  );
}

// ── Alerts sub-component ─────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#EF5B3C',
  high:     '#F5A623',
  medium:   '#F5C842',
  low:      '#4ade80',
};

function AlertsSection({
  alerts, dark, t, clientNameMap, onAcknowledge, onResolve,
}: {
  alerts:         TrainerAlert[];
  dark:           boolean;
  t:              any;
  clientNameMap:  Record<string, string>;
  onAcknowledge:  (id: string) => Promise<void>;
  onResolve:      (id: string) => Promise<void>;
}) {
  const { t: tr } = useTranslation();
  const [busy, setBusy] = React.useState<string | null>(null);

  const handle = async (fn: (id: string) => Promise<void>, id: string) => {
    setBusy(id);
    await fn(id);
    setBusy(null);
  };

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 16,
      background: `${t.accent}0D`, border: `1.5px solid ${t.accent}33`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.accent }}>
          {tr('trainer.dashboard.alerts')}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: t.accent, color: '#fff' }}>
          {alerts.length}
        </div>
      </div>

      {alerts.map((alert, i) => (
        <div key={alert.id} style={{
          padding: '10px 0',
          borderBottom: i < alerts.length - 1 ? `1px solid ${t.accent}22` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                  background: `${SEVERITY_COLOR[alert.severity] ?? SEVERITY_COLOR.high}22`,
                  color: SEVERITY_COLOR[alert.severity] ?? SEVERITY_COLOR.high,
                }}>
                  {alert.severity.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: textMute(dark) }}>
                  {clientNameMap[alert.client_id] ?? tr('trainer.dashboard.clientFallback')}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{alert.title}</div>
              {alert.body && (
                <div style={{ fontSize: 11.5, color: textSec(dark), marginTop: 2 }}>{alert.body}</div>
              )}
              <div style={{ fontSize: 10, color: textMute(dark), marginTop: 3 }}>
                {new Date(alert.created_at).toLocaleDateString(i18n.language || 'en-US')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {alert.status === 'open' && (
                <button
                  onClick={() => handle(onAcknowledge, alert.id)}
                  disabled={busy === alert.id}
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                    background: `${SEVERITY_COLOR.high}18`, color: SEVERITY_COLOR.high,
                    border: `1px solid ${SEVERITY_COLOR.high}40`, fontFamily: 'inherit', cursor: 'pointer',
                    opacity: busy === alert.id ? 0.5 : 1,
                  }}
                >
                  {tr('trainer.dashboard.ack')}
                </button>
              )}
              <button
                onClick={() => handle(onResolve, alert.id)}
                disabled={busy === alert.id}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                  background: `${SEVERITY_COLOR.low}18`, color: SEVERITY_COLOR.low,
                  border: `1px solid ${SEVERITY_COLOR.low}40`, fontFamily: 'inherit', cursor: 'pointer',
                  opacity: busy === alert.id ? 0.5 : 1,
                }}
              >
                {busy === alert.id ? '…' : tr('trainer.dashboard.resolve')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tasks sub-component ──────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#EF5B3C',
  high:   '#F5A623',
  medium: '#2DD4BF',
  low:    '#94A3B8',
};

function TasksSection({
  tasks, dark, t, clientNameMap, onComplete,
}: {
  tasks:          OperationalTask[];
  dark:           boolean;
  t:              any;
  clientNameMap:  Record<string, string>;
  onComplete:     (id: string) => Promise<void>;
}) {
  const { t: tr } = useTranslation();
  const [busy, setBusy] = React.useState<string | null>(null);

  const handle = async (id: string) => {
    setBusy(id);
    await onComplete(id);
    setBusy(null);
  };

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 16,
      background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: t.primary }}>
          {tr('trainer.dashboard.tasks')}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: t.accent, color: '#fff' }}>
          {tasks.length}
        </div>
      </div>

      {tasks.map((task, i) => (
        <div key={task.id} style={{
          padding: '10px 0',
          borderBottom: i < tasks.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                background: `${PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium}22`,
                color: PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium,
              }}>
                {task.priority.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: textMute(dark) }}>
                {clientNameMap[task.client_id] ?? tr('trainer.dashboard.clientFallback')}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{task.title}</div>
            {task.description && (
              <div style={{
                fontSize: 11.5, color: textSec(dark), marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {task.description}
              </div>
            )}
          </div>
          <button
            onClick={() => handle(task.id)}
            disabled={busy === task.id}
            style={{
              padding: '8px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
              background: `${t.primary}22`, color: t.primary,
              border: `1px solid ${t.primary}40`, fontFamily: 'inherit', cursor: 'pointer',
              opacity: busy === task.id ? 0.5 : 1, flexShrink: 0,
            }}
          >
            {busy === task.id ? '…' : `✓ ${tr('trainer.dashboard.resolve')}`}
          </button>
        </div>
      ))}
    </div>
  );
}
