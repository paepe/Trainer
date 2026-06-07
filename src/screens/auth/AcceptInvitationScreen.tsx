import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { textPri, textSec, textMute, primaryBtn, outlineBtn } from '../../theme';
import { Spinner } from '../../ui';
import { supabase } from '../../supabase';
import { notify } from '../../lib/notify';
import { friendlyError } from '../../lib/friendlyError';
import type { NavFn } from '../../types';

interface Theme { primary: string; accent: string; }

interface AcceptInvitationScreenProps {
  nav:   NavFn;
  t:     Theme;
  dark:  boolean;
  user:  { id: string; name?: string | null } | null;
  token: string;
}

type InvitationState =
  | { phase: 'loading' }
  | { phase: 'invalid' }
  | { phase: 'expired' }
  | { phase: 'revoked' }
  | { phase: 'ready';     invitedName: string; trainerName: string }
  | { phase: 'accepted';  trainerName: string }
  | { phase: 'error';     message: string };

interface InvitationRow {
  invited_name: string;
  trainer_name: string;
  status:       string;
  expires_at:   string;
}

interface AcceptanceRow {
  result:       string;
  trainer_id:   string | null;
  trainer_name: string | null;
}

// The trainer_invitations RPCs are not yet in the generated Supabase types
// (added in supabase-trainer-invitations-20260607.sql, pending remote apply + regen).
const rpc = supabase.rpc.bind(supabase) as unknown as
  (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%', justifyContent: 'center' }}>
      {children}
    </div>
  );
}

export function AcceptInvitationScreen({ nav, t, dark, user, token }: AcceptInvitationScreenProps) {
  const { t: tr } = useTranslation();
  const [state,     setState]     = React.useState<InvitationState>({ phase: 'loading' });
  const [accepting, setAccepting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    rpc('get_invitation_by_token', { p_token: token }).then(({ data, error }) => {
      if (cancelled) return;
      const row = (data as InvitationRow[] | null)?.[0];
      if (error || !row) { setState({ phase: 'invalid' }); return; }
      if (row.status === 'expired')   { setState({ phase: 'expired' }); return; }
      if (row.status === 'revoked')   { setState({ phase: 'revoked' }); return; }
      if (row.status === 'accepted')  { setState({ phase: 'accepted', trainerName: row.trainer_name }); return; }
      setState({ phase: 'ready', invitedName: row.invited_name, trainerName: row.trainer_name });
    });
    return () => { cancelled = true; };
  }, [token]);

  const accept = async () => {
    if (!user?.id || state.phase !== 'ready') return;
    setAccepting(true);
    const { data, error } = await rpc('accept_trainer_invitation', { p_token: token, p_user_id: user.id });
    setAccepting(false);
    if (error) { setState({ phase: 'error', message: friendlyError(error, tr) }); return; }
    const row = (data as AcceptanceRow[] | null)?.[0];
    const trainerName = row?.trainer_name ?? state.trainerName;
    switch (row?.result) {
      case 'accepted':
      case 'already_accepted':
        setState({ phase: 'accepted', trainerName });
        if (row.trainer_id) {
          const clientName = user.name ?? '';
          notify(
            row.trainer_id,
            tr('invite.trainerPushTitle', { clientName }),
            tr('invite.trainerPushBody',  { clientName }),
            undefined,
            { type: 'invitation_accepted', templateKey: 'invitation_accepted', params: { clientName }, fromUserId: user.id }
          );
        }
        return;
      case 'already_linked_elsewhere':
        setState({ phase: 'error', message: tr('invite.errAlreadyLinked') });
        return;
      case 'expired':
        setState({ phase: 'expired' });
        return;
      case 'revoked':
        setState({ phase: 'revoked' });
        return;
      default:
        setState({ phase: 'invalid' });
    }
  };

  const goAuth = (screen: 'login' | 'register') => {
    sessionStorage.setItem('trainer_pending_invite_token', token);
    nav(screen);
  };

  if (state.phase === 'loading') {
    return <Wrap><Spinner size={28} color={t.primary}/></Wrap>;
  }

  if (state.phase === 'invalid' || state.phase === 'expired' || state.phase === 'revoked') {
    const msgKey = state.phase === 'invalid' ? 'invite.invalid' : state.phase === 'expired' ? 'invite.expired' : 'invite.revoked';
    return (
      <Wrap>
        <Icon name="shield" size={40} color={textMute(dark)}/>
        <h1 style={{ margin: '14px 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 19, fontWeight: 700, color: textPri(dark) }}>
          {tr('invite.unavailable')}
        </h1>
        <p style={{ margin: 0, color: textSec(dark), fontSize: 13.5, maxWidth: 280, lineHeight: 1.5 }}>{tr(msgKey)}</p>
        <button onClick={() => nav('welcome')} style={{ ...outlineBtn(t.primary), marginTop: 22 }}>
          {tr('invite.goHome')}
        </button>
      </Wrap>
    );
  }

  if (state.phase === 'error') {
    return (
      <Wrap>
        <Icon name="shield" size={40} color={t.accent}/>
        <h1 style={{ margin: '14px 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 19, fontWeight: 700, color: textPri(dark) }}>
          {tr('invite.unavailable')}
        </h1>
        <p style={{ margin: 0, color: textSec(dark), fontSize: 13.5, maxWidth: 280, lineHeight: 1.5 }}>{state.message}</p>
        <button onClick={() => nav('welcome')} style={{ ...outlineBtn(t.primary), marginTop: 22 }}>
          {tr('invite.goHome')}
        </button>
      </Wrap>
    );
  }

  if (state.phase === 'accepted') {
    return (
      <Wrap>
        <Icon name="check" size={40} color={t.primary}/>
        <h1 style={{ margin: '14px 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 19, fontWeight: 700, color: textPri(dark) }}>
          {tr('invite.acceptedTitle')}
        </h1>
        <p style={{ margin: 0, color: textSec(dark), fontSize: 13.5, maxWidth: 280, lineHeight: 1.5 }}>
          {tr('invite.acceptedBody', { trainerName: state.trainerName })}
        </p>
        <button onClick={() => nav(user ? 'checkin' : 'welcome')} style={{ ...primaryBtn(t.primary), marginTop: 22, width: 220 }}>
          {tr('invite.continue')}
        </button>
      </Wrap>
    );
  }

  // phase === 'ready'
  return (
    <Wrap>
      <img src="assets/trainer-logo-clean.png" alt="TrAIner" width={72} height={72}
        style={{ width: 72, height: 72, objectFit: 'contain', filter: `drop-shadow(0 8px 20px ${t.primary}55)` }}/>
      <h1 style={{ margin: '14px 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 20, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em' }}>
        {tr('invite.title', { invitedName: state.invitedName })}
      </h1>
      <p style={{ margin: 0, color: textSec(dark), fontSize: 13.5, maxWidth: 280, lineHeight: 1.5 }}>
        {tr('invite.body', { trainerName: state.trainerName })}
      </p>

      {user ? (
        <button onClick={accept} disabled={accepting} style={{ ...primaryBtn(t.primary, accepting), marginTop: 22, width: 220 }}>
          {accepting ? tr('invite.accepting') : tr('invite.accept')}
        </button>
      ) : (
        <>
          <p style={{ margin: '18px 0 0', color: textMute(dark), fontSize: 12 }}>{tr('invite.needAccount')}</p>
          <button onClick={() => goAuth('register')} style={{ ...primaryBtn(t.primary), marginTop: 10, width: 220 }}>
            {tr('invite.createAccount')}
          </button>
          <button onClick={() => goAuth('login')} style={{ ...outlineBtn(t.primary), marginTop: 10, width: 220 }}>
            {tr('invite.login')}
          </button>
        </>
      )}
    </Wrap>
  );
}
