import React from 'react';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { PillInput } from '../../components/PillInput';
import { TopBar } from '../../components/TopBar';
import { ScreenTitle } from '../../components/ScreenTitle';
import { surfRaised, borderSubtle, textPri, textSec, textMute, ghostBtn } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary:     string;
  primaryDeep: string;
  primarySoft: string;
  accent:      string;
}

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

interface TrainerDashboardUser {
  id:    string;
  name?: string;
  email?: string;
}

interface TrainerDashboardScreenProps {
  nav:          NavFn;
  t:            Theme;
  dark:         boolean;
  user:         TrainerDashboardUser | null;
  selectClient?: (client: ClientProfile) => void;
}

export function TrainerDashboardScreen({
  nav,
  t,
  dark,
  user,
  selectClient,
}: TrainerDashboardScreenProps) {
  const [clients, setClients]           = React.useState<TrainerClient[]>([]);
  const [loading, setLoading]           = React.useState(true);
  const [showInvite, setShowInvite]     = React.useState(false);
  const [inviteEmail, setInviteEmail]   = React.useState('');
  const [inviteErr, setInviteErr]       = React.useState('');
  const [inviting, setInviting]         = React.useState(false);
  const [pendingReviews, setPendingReviews] = React.useState<SafetyGateEvent[]>([]);
  const [reviewingId, setReviewingId]   = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    fetchClients();
  }, [user?.id]);

  // Fetch safety gate queue whenever clients list changes
  React.useEffect(() => {
    const ids: string[] = [];
    for (const c of clients) {
      if (c.status === 'active' && c.client?.id) ids.push(c.client.id);
    }
    if (ids.length === 0) { setPendingReviews([]); return; }

    supabase
      .from('safety_gate_events')
      .select('id,user_id,status,readiness_score,triggered_signals,created_at')
      .in('user_id', ids)
      .eq('human_review_required', true)
      .is('human_reviewed_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPendingReviews((data || []) as SafetyGateEvent[]));
  }, [clients]);

  async function fetchClients() {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('trainer_clients')
      .select('id, status, created_at, client:profiles!trainer_clients_client_id_fkey(id, name, email)')
      .eq('trainer_id', user.id)
      .in('status', ['active', 'pending'])
      .order('created_at', { ascending: false });

    setClients((data || []) as unknown as TrainerClient[]);
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

  return (
    <>
      <TopBar onMenu={() => nav('menu')} dark={dark} accent={t.accent} />
      <ScreenTitle dark={dark} sub={`${activeClients.length} active · ${pendingClients.length} pending`}>
        My Clients
      </ScreenTitle>

      <div style={{ padding: '0 22px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: textMute(dark), fontSize: 13 }}>
            Loading…
          </div>
        )}

        {/* Safety Gate review queue */}
        {!loading && pendingReviews.length > 0 && (
          <div style={{
            padding: '14px 16px', borderRadius: 16,
            background: '#EF5B3C0D', border: `1.5px solid #EF5B3C33`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#EF5B3C' }}>
                Safety Gate · Revisão Pendente
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                background: '#EF5B3C', color: '#fff',
              }}>
                {pendingReviews.length}
              </div>
            </div>

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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: ev.status === 'blocked' ? '#EF5B3C' : '#F5A623',
                    }}>
                      {ev.status.toUpperCase()}{ev.readiness_score != null ? ` · ${ev.readiness_score}pts` : ''}
                    </span>
                    {(ev.triggered_signals ?? []).slice(0, 2).map(s => (
                      <span key={s} style={{ fontSize: 10, color: textMute(dark) }}>· {s}</span>
                    ))}
                  </div>
                  {ev.created_at && (
                    <div style={{ fontSize: 10, color: textMute(dark), marginTop: 2 }}>
                      {new Date(ev.created_at).toLocaleDateString('pt-BR')}
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
              <button
                onClick={() => tc.client && selectClient && selectClient(tc.client)}
                style={{
                  padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: `${t.primary}22`, color: t.primary,
                  border: 'none', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
                }}
              >
                View →
              </button>
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
            <PillInput
              icon="mail"
              placeholder="client@email.com"
              type="email"
              value={inviteEmail}
              onChange={setInviteEmail}
              primary={t.primary}
              dark={dark}
            />
            {inviteErr && (
              <div style={{ color: t.accent, fontSize: 11, marginTop: 8 }}>
                {inviteErr}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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
                  background: t.primary, color: '#0E1A2B', fontSize: 14, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer', opacity: inviting ? 0.7 : 1,
                }}
              >
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowInvite(true)}
            style={{
              padding: '14px 18px', borderRadius: 14,
              border: `1.5px dashed ${dark ? '#1F2E45' : '#D0D8E4'}`,
              background: 'transparent', color: t.primary,
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon name="plus" size={16} color={t.primary} /> Invite client
          </button>
        )}
      </div>
    </>
  );
}
