import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { textPri, textSec, textMute, primaryBtn, outlineBtn } from '../../theme';
import { Spinner, TextInput } from '../../ui';
import { supabase } from '../../supabase';
import { notify } from '../../lib/notify';
import { friendlyError } from '../../lib/friendlyError';
import type { NavFn } from '../../types';
import type { AuthError } from '@supabase/supabase-js';

interface Theme { primary: string; accent: string; }

interface AcceptInvitationScreenProps {
  nav:    NavFn;
  t:      Theme;
  dark:   boolean;
  user:   { id: string; name?: string | null; email: string } | null;
  token:  string;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut:            () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError | null }>;
}

type InvitationState =
  | { phase: 'loading' }
  | { phase: 'invalid' }
  | { phase: 'expired' }
  | { phase: 'revoked' }
  | { phase: 'ready';        invitedEmail: string; invitedName: string; trainerName: string; accountExists: boolean; accountConfirmed: boolean }
  | { phase: 'wrongAccount'; invitedEmail: string; trainerName: string }
  | { phase: 'accepted';     trainerName: string }
  | { phase: 'error';        message: string };

interface InvitationRow {
  invited_email:     string;
  invited_name:      string;
  trainer_name:      string;
  status:            string;
  expires_at:        string;
  account_exists:    boolean;
  account_confirmed: boolean;
}

interface AcceptanceRow {
  result:       string;
  trainer_id:   string | null;
  trainer_name: string | null;
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%', justifyContent: 'center' }}>
      {children}
    </div>
  );
}

export function AcceptInvitationScreen({ nav, t, dark, user, token, signIn, signOut, resendConfirmation }: AcceptInvitationScreenProps) {
  const { t: tr } = useTranslation();
  const [state,        setState]        = React.useState<InvitationState>({ phase: 'loading' });
  const [accepting,    setAccepting]    = React.useState(false);
  const [signingOut,   setSigningOut]   = React.useState(false);
  const [resending,    setResending]    = React.useState(false);
  const [resent,       setResent]       = React.useState(false);

  // Scenario A: confirm-link flow for pre-registered invitees who aren't authenticated yet
  const [showPasswordField, setShowPasswordField] = React.useState(false);
  const [password,          setPassword]          = React.useState('');
  const [confirmingLink,    setConfirmingLink]    = React.useState(false);
  const [confirmErr,        setConfirmErr]        = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    supabase.rpc('get_invitation_by_token', { p_token: token }).then(({ data, error }) => {
      if (cancelled) return;
      const row = (data as InvitationRow[] | null)?.[0];
      if (error || !row) { setState({ phase: 'invalid' }); return; }
      if (row.status === 'expired')   { setState({ phase: 'expired' }); return; }
      if (row.status === 'revoked')   { setState({ phase: 'revoked' }); return; }
      if (row.status === 'accepted')  { setState({ phase: 'accepted', trainerName: row.trainer_name }); return; }
      // A logged-in session whose email doesn't match the invitee must not see
      // the Accept button — otherwise a stale/cached session (e.g. the inviting
      // trainer's own browser) could be linked instead of the actual invitee.
      if (user && user.email.toLowerCase() !== row.invited_email.toLowerCase()) {
        setState({ phase: 'wrongAccount', invitedEmail: row.invited_email, trainerName: row.trainer_name });
        return;
      }
      setState({
        phase:            'ready',
        invitedEmail:     row.invited_email,
        invitedName:      row.invited_name,
        trainerName:      row.trainer_name,
        accountExists:    row.account_exists,
        accountConfirmed: row.account_confirmed,
      });
    });
    return () => { cancelled = true; };
  }, [token, user]);

  const runAccept = async (userId: string, name: string | null | undefined): Promise<AcceptanceRow | undefined> => {
    const { data, error } = await supabase.rpc('accept_trainer_invitation', { p_token: token, p_user_id: userId });
    if (error) { setState({ phase: 'error', message: friendlyError(error, tr) }); return undefined; }
    const row = (data as AcceptanceRow[] | null)?.[0];
    return row;
  };

  const finishAcceptance = (row: AcceptanceRow | undefined, fallbackTrainerName: string, userId: string, name: string | null | undefined) => {
    const trainerName = row?.trainer_name ?? fallbackTrainerName;
    switch (row?.result) {
      case 'accepted':
      case 'already_accepted':
        setState({ phase: 'accepted', trainerName });
        if (row.trainer_id) {
          const clientName = name ?? '';
          notify(
            row.trainer_id,
            tr('invite.trainerPushTitle', { clientName }),
            tr('invite.trainerPushBody',  { clientName }),
            undefined,
            { type: 'invitation_accepted', templateKey: 'invitation_accepted', params: { clientName }, fromUserId: userId }
          );
        }
        return;
      case 'already_linked_elsewhere':
        setState({ phase: 'error', message: tr('invite.errAlreadyLinked') });
        return;
      case 'email_mismatch':
        setState({ phase: 'error', message: tr('invite.errEmailMismatch') });
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

  const accept = async () => {
    if (!user?.id || state.phase !== 'ready') return;
    setAccepting(true);
    const row = await runAccept(user.id, user.name);
    setAccepting(false);
    if (row) finishAcceptance(row, state.trainerName, user.id, user.name);
  };

  // Scenario A — already authenticated as the invitee: confirm the link directly
  const confirmLink = async () => {
    if (state.phase !== 'ready') return;
    if (user) { await accept(); return; }
    if (!password) return;
    setConfirmingLink(true);
    setConfirmErr('');
    const { error: signInError } = await signIn(state.invitedEmail, password);
    if (signInError) {
      setConfirmingLink(false);
      setConfirmErr(friendlyError(signInError, tr));
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setConfirmingLink(false);
      setConfirmErr(friendlyError(signInError, tr));
      return;
    }
    const row = await runAccept(authUser.id, authUser.user_metadata?.name as string | undefined);
    setConfirmingLink(false);
    if (row) finishAcceptance(row, state.trainerName, authUser.id, authUser.user_metadata?.name as string | undefined);
  };

  const goRegister = () => {
    if (state.phase !== 'ready') return;
    // No pending-invite token here — RegisterScreen accepts the invitation
    // directly at signup (see inviteToken prop) and routes straight to checkin.
    nav('register', { lockedEmail: state.invitedEmail, inviteToken: token });
  };

  const resend = async (email: string) => {
    setResending(true);
    const { error } = await resendConfirmation(email);
    setResending(false);
    if (!error) setResent(true);
  };

  const switchAccount = async () => {
    setSigningOut(true);
    // No sessionStorage hand-off needed: after signing back in, the post-login
    // routing effect resolves the pending invitation server-side by e-mail
    // (get_pending_invitation_for_user) and routes back here automatically.
    await signOut();
    setSigningOut(false);
    nav('login');
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
        <button onClick={() => nav(user ? 'checkin' : 'login')} style={{ ...primaryBtn(t.primary), marginTop: 22, width: 220 }}>
          {tr('invite.continue')}
        </button>
      </Wrap>
    );
  }

  if (state.phase === 'wrongAccount') {
    return (
      <Wrap>
        <Icon name="shield" size={40} color={t.accent}/>
        <h1 style={{ margin: '14px 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 19, fontWeight: 700, color: textPri(dark) }}>
          {tr('invite.wrongAccountTitle')}
        </h1>
        <p style={{ margin: 0, color: textSec(dark), fontSize: 13.5, maxWidth: 300, lineHeight: 1.5 }}>
          {tr('invite.wrongAccountBody', { invitedEmail: state.invitedEmail, trainerName: state.trainerName })}
        </p>
        <button onClick={switchAccount} disabled={signingOut} style={{ ...primaryBtn(t.primary, signingOut), marginTop: 22, width: 240 }}>
          {signingOut ? tr('invite.switchingAccount') : tr('invite.switchAccount')}
        </button>
        <button onClick={() => nav('welcome')} style={{ ...outlineBtn(t.primary), marginTop: 10, width: 240 }}>
          {tr('invite.goHome')}
        </button>
      </Wrap>
    );
  }

  // phase === 'ready'
  const unconfirmedIndependentAccount = !user && state.accountExists && !state.accountConfirmed;

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

      {unconfirmedIndependentAccount ? (
        // Edge case: account exists but was never confirmed (e.g. abandoned signup
        // from before this invitation). Confirming it is the prerequisite to linking.
        <>
          <p style={{ margin: '18px 0 0', color: textMute(dark), fontSize: 12, maxWidth: 280 }}>{tr('invite.accountUnconfirmed', { email: state.invitedEmail })}</p>
          {resent ? (
            <p style={{ margin: '14px 0 0', color: t.primary, fontSize: 12.5 }}>{tr('invite.confirmationResent')}</p>
          ) : (
            <button onClick={() => resend(state.invitedEmail)} disabled={resending} style={{ ...primaryBtn(t.primary, resending), marginTop: 14, width: 240 }}>
              {resending ? tr('invite.resending') : tr('invite.resendConfirmation')}
            </button>
          )}
        </>
      ) : (state.accountExists || user) ? (
        // Scenario A — pre-registered invitee: one adaptive CTA confirms the link.
        // Already authenticated → straight to accept(); not authenticated → reveal
        // an inline password field so the link is established in the same step.
        <>
          {!user && showPasswordField && (
            <div style={{ width: 240, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <TextInput icon="lock" placeholder={tr('auth.common.password')} value={password} onChange={setPassword} type="password"/>
            </div>
          )}
          {confirmErr && <div style={{ color: t.accent, fontSize: 12, marginTop: 10, maxWidth: 260 }}>{confirmErr}</div>}
          <button
            onClick={() => {
              if (user) { void accept(); return; }
              if (!showPasswordField) { setShowPasswordField(true); return; }
              void confirmLink();
            }}
            disabled={accepting || confirmingLink}
            style={{ ...primaryBtn(t.primary, accepting || confirmingLink), marginTop: 18, width: 240 }}
          >
            {accepting || confirmingLink ? tr('invite.accepting') : tr('invite.confirmLink')}
          </button>
        </>
      ) : (
        // Scenario B — invitee has no account yet: one CTA opens registration
        // with the invited e-mail locked, so the link is established at signup.
        <button onClick={goRegister} style={{ ...primaryBtn(t.primary), marginTop: 22, width: 240 }}>
          {tr('invite.createAccount')}
        </button>
      )}
    </Wrap>
  );
}
