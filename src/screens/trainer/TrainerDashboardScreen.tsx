import React from 'react';
import { TextInput, VStack, HStack, Spacer } from '@/ui';
import { supabase } from '../../supabase';
import { useAlerts } from '../../hooks/useAlerts';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { surfRaised, borderSubtle, textPri, textSec, textMute, ghostBtn } from '../../theme';
import type { NavFn } from '../../types';
import type { TrainerAlert, OperationalTask } from '../../types/workout';
import { DARK } from '../../theme/tokens';
import { useTrainerTheme } from '../../hooks/useTrainerTheme';

interface ClientProfile {
  id:    string;
  name:  string;
  email: string;
}

interface TrainerClient {
  id:         string;
  status:     string;
  created_at: string;
  client:     ClientProfile | null;
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

interface TrainerDashboardUser {
  id:    string;
  name?: string;
  email?: string;
}

interface TrainerDashboardScreenProps {
  nav:          NavFn;
  user:         TrainerDashboardUser | null;
  selectClient?: (client: ClientProfile) => void;
}

export function TrainerDashboardScreen({
  nav,
  user,
  selectClient,
}: TrainerDashboardScreenProps) {
  const { t, dark } = useTrainerTheme();
  const { alerts, tasks, acknowledgeAlert, resolveAlert, completeTask } = useAlerts(user?.id);

  const [clients, setClients]           = React.useState<TrainerClient[]>([]);
  const [loading, setLoading]           = React.useState(true);
  const [showInvite, setShowInvite]     = React.useState(false);
  const [inviteEmail, setInviteEmail]   = React.useState('');
  const [inviteErr, setInviteErr]       = React.useState('');
  const [inviting, setInviting]         = React.useState(false);
  const [pendingReviews, setPendingReviews] = React.useState<SafetyGateEvent[]>([]);
  const [reviewingId, setReviewingId]   = React.useState<string | null>(null);
  const [activeSessions, setActiveSessions] = React.useState<ActiveSession[]>([]);
  const [activeNowOpen, setActiveNowOpen]   = React.useState(false);
  const [activeNowFilter, setActiveNowFilter] = React.useState<'all' | 'training' | 'paused'>('all');

  React.useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    fetchClients();
  }, [user?.id]);

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
            .in('status', ['active', 'paused'])
            .order('started_at', { ascending: false })
            .then(({ data }) => setActiveSessions((data ?? []) as ActiveSession[]));
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, clients]);

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

  async function fetchClients() {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('trainer_clients')
      .select('id, status, created_at, client:profiles!trainer_clients_client_id_fkey(id, name, email)')
      .eq('trainer_id', user.id)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false });

    const clientsList = (data || []) as unknown as TrainerClient[];
    setClients(clientsList);

    const ids: string[] = [];
    for (const c of clientsList) {
      if (c.status === 'active' && c.client?.id) ids.push(c.client.id);
    }
    fetchSafetyGate(ids);

    // Fetch active sessions for these clients
    if (ids.length > 0) {
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, user_id, status, started_at')
        .in('user_id', ids)
        .in('status', ['active', 'paused'])
        .order('started_at', { ascending: false });
      setActiveSessions(sessions as ActiveSession[]);
    }

    setLoading(false);
  }

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

  async function invite() {
    if (!inviteEmail || !user?.id) return;
    setInviting(true);
    setInviteErr('');
    const { data: found } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail)
      .single();

    if (!found) {
      setInviteErr('No account found with that email.');
      setInviting(false);
      return;
    }

    const { error } = await supabase.from('trainer_clients').insert({
      trainer_id: user.id,
      client_id: found.id,
      status: 'pending',
    });

    if (error) {
      setInviteErr(error.message);
      setInviting(false);
      return;
    }

    setShowInvite(false);
    setInviteEmail('');
    fetchClients();
    setInviting(false);
  }

  const activeClients  = clients.filter(c => c.status === 'active');
  const pendingClients = clients.filter(c => c.status === 'pending');

  const clientNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const tc of clients) {
      if (tc.client?.id) map[tc.client.id] = tc.client.name;
    }
    return map;
  }, [clients]);

  // Derive per-client session status: 'active' wins over 'paused' if multiple sessions exist
  const sessionStatusMap = React.useMemo(() => {
    const map: Record<string, 'active' | 'paused'> = {};
    for (const s of activeSessions) {
      if (!map[s.user_id] || s.status !== 'paused') {
        map[s.user_id] = s.status === 'paused' ? 'paused' : 'active';
      }
    }
    return map;
  }, [activeSessions]);

  return (
    <>
      <ScreenTitle dark={dark} sub={`${activeClients.length} active · ${pendingClients.length} pending`}>
        My Clients
      </ScreenTitle>

      <VStack padding="0 22px 32px" gap={12}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: textMute(dark), fontSize: 13 }}>
            Loading…
          </div>
        )}

        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }`}</style>

        {/* Safety Gate review queue */}
        {!loading && pendingReviews.length > 0 && (
          <div style={{
            padding: '14px 16px', borderRadius: 16,
            background: '#EF5B3C0D', border: `1.5px solid #EF5B3C33`,
          }}>
            <HStack gap={8} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#EF5B3C' }}>
                Safety Gate · Pending Review
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: '#EF5B3C', color: '#fff',
              }}>
                {pendingReviews.length}
              </div>
            </HStack>

            {pendingReviews.map((ev, i) => (
              <div key={ev.id} style={{
                padding: '10px 0',
                borderBottom: i < pendingReviews.length - 1 ? `1px solid #EF5B3C22` : 'none',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>
                    {clientNameMap[ev.user_id] || 'Cliente'}
                  </div>
                  <HStack gap={6} flexWrap="wrap" style={{ marginTop: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: ev.status === 'blocked' ? '#EF5B3C' : '#F5A623',
                    }}>
                      {ev.status.toUpperCase()}{ev.readiness_score != null ? ` · ${ev.readiness_score}pts` : ''}
                    </span>
                    {(ev.triggered_signals ?? []).slice(0, 2).map(s => (
                      <span key={s} style={{ fontSize: 10, color: textMute(dark) }}>· {s}</span>
                    ))}
                  </HStack>
                  {ev.created_at && (
                    <div style={{ fontSize: 10, color: textMute(dark), marginTop: 2 }}>
                      {new Date(ev.created_at).toLocaleDateString('en-US')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => markReviewed(ev.id)}
                  disabled={reviewingId === ev.id}
                  style={{
                    padding: '8px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: '#4ade8018', color: '#4ade80',
                    border: `1px solid #4ade8040`, fontFamily: 'inherit', cursor: 'pointer',
                    opacity: reviewingId === ev.id ? 0.5 : 1, flexShrink: 0,
                    transition: 'opacity .15s',
                  }}
                >
                  {reviewingId === ev.id ? '…' : '✓ Revisto'}
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
              No clients yet
            </div>
            <div style={{ fontSize: 13, color: textSec(dark) }}>
              Invite your first client by email to get started.
            </div>
          </div>
        )}

        {clients.map(tc => (
          <div key={tc.id} style={{
            padding: '14px 16px', borderRadius: 16,
            background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14, flexShrink: 0,
              background: `${t.primary}22`, color: t.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 16, fontFamily: '"Plus Jakarta Sans",sans-serif',
            }}>
              {(tc.client?.name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>
                {tc.client?.name || 'Unknown'}
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
                Pending
              </div>
            ) : (
              <HStack gap={8} style={{ flexShrink: 0 }}>
                {tc.client?.id && sessionStatusMap[tc.client.id] === 'active' && (
                  <div style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: '#10B98122', color: '#10B981', letterSpacing: '.05em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s ease-in-out infinite' }}/>
                    Training
                  </div>
                )}
                {tc.client?.id && sessionStatusMap[tc.client.id] === 'paused' && (
                  <div style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                    background: '#F5A62322', color: '#F5A623', letterSpacing: '.05em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A623' }}/>
                    Paused
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
                  View →
                </button>
              </HStack>
            )}
          </div>
        ))}

        {/* Invite form */}
        {showInvite ? (
          <div style={{
            padding: 18, borderRadius: 16,
            background: surfRaised(dark), border: `1.5px solid ${t.primary}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark), marginBottom: 10 }}>
              Invite by email
            </div>
            <TextInput
              icon="mail"
              placeholder="client@email.com"
              type="email"
              value={inviteEmail}
              onChange={setInviteEmail}
            />
            {inviteErr && (
              <div style={{ color: t.accent, fontSize: 11, marginTop: 8 }}>
                {inviteErr}
              </div>
            )}
            <HStack gap={8} style={{ marginTop: 12 }}>
              <button
                onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteErr(''); }}
                style={{
                  ...ghostBtn(dark),
                  flex: 1,
                  padding: '12px 0',
                  textAlign: 'center',
                  borderRadius: 12,
                }}
              >
                Cancel
              </button>
              <button
                onClick={invite}
                disabled={inviting}
                style={{
                  flex: 2, padding: '13px 0', border: 'none', borderRadius: 999,
                  background: t.accent, color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                  fontFamily: '"Plus Jakarta Sans",sans-serif', cursor: 'pointer', opacity: inviting ? 0.7 : 1,
                }}
              >
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </HStack>
          </div>
        ) : (
          <button
            onClick={() => setShowInvite(true)}
            style={{
              padding: '14px 18px', borderRadius: 14,
              border: `1.5px dashed ${DARK.surface}`,
              background: 'transparent', color: t.accent,
              fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon name="plus" size={16} color={t.accent} /> Invite client
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
  const [busy, setBusy] = React.useState<string | null>(null);

  const handle = async (fn: (id: string) => Promise<void>, id: string) => {
    setBusy(id);
    await fn(id);
    setBusy(null);
  };

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 16,
      background: '#EF5B3C0D', border: '1.5px solid #EF5B3C33',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#EF5B3C' }}>
          Alerts
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#EF5B3C', color: '#fff' }}>
          {alerts.length}
        </div>
      </div>

      {alerts.map((alert, i) => (
        <div key={alert.id} style={{
          padding: '10px 0',
          borderBottom: i < alerts.length - 1 ? '1px solid #EF5B3C22' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                  background: `${SEVERITY_COLOR[alert.severity] ?? '#F5A623'}22`,
                  color: SEVERITY_COLOR[alert.severity] ?? '#F5A623',
                }}>
                  {alert.severity.toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: textMute(dark) }}>
                  {clientNameMap[alert.client_id] ?? 'Cliente'}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark) }}>{alert.title}</div>
              {alert.body && (
                <div style={{ fontSize: 11.5, color: textSec(dark), marginTop: 2 }}>{alert.body}</div>
              )}
              <div style={{ fontSize: 10, color: textMute(dark), marginTop: 3 }}>
                {new Date(alert.created_at).toLocaleDateString('en-US')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {alert.status === 'open' && (
                <button
                  onClick={() => handle(onAcknowledge, alert.id)}
                  disabled={busy === alert.id}
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                    background: '#F5A62318', color: '#F5A623',
                    border: '1px solid #F5A62340', fontFamily: 'inherit', cursor: 'pointer',
                    opacity: busy === alert.id ? 0.5 : 1,
                  }}
                >
                  Ack
                </button>
              )}
              <button
                onClick={() => handle(onResolve, alert.id)}
                disabled={busy === alert.id}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                  background: '#4ade8018', color: '#4ade80',
                  border: '1px solid #4ade8040', fontFamily: 'inherit', cursor: 'pointer',
                  opacity: busy === alert.id ? 0.5 : 1,
                }}
              >
                {busy === alert.id ? '…' : 'Resolve'}
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
          Tasks
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
                background: `${PRIORITY_COLOR[task.priority] ?? '#2DD4BF'}22`,
                color: PRIORITY_COLOR[task.priority] ?? '#2DD4BF',
              }}>
                {task.priority.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: textMute(dark) }}>
                {clientNameMap[task.client_id] ?? 'Cliente'}
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
            {busy === task.id ? '…' : '✓ Done'}
          </button>
        </div>
      ))}
    </div>
  );
}
