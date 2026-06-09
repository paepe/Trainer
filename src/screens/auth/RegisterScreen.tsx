import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '@/ui';
import { supabase } from '../../supabase';
import { Icon } from '../../components/Icon';
import { iconBtn, borderSubtle, textPri, textSec, textMute, primaryBtn, textBtn } from '../../theme';
import type { NavFn } from '../../types';
import type { AuthError } from '@supabase/supabase-js';
import { friendlyError } from '../../lib/friendlyError';

interface Theme { primary: string; accent: string; }

interface RegisterScreenProps {
  nav:    NavFn;
  t:      Theme;
  dark:   boolean;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<{ data: unknown; error: AuthError | null }>;
  lockedEmail?: string | undefined;
  inviteToken?: string | undefined;
}

// Labels/descriptions are translated at render via auth.roles.<key>.*
const ROLES = [
  { key: 'client',         icon: 'user' },
  { key: 'trainer',        icon: 'dumbbell' },
  { key: 'studio_trainer', icon: 'grad' },
  { key: 'studio_admin',   icon: 'grad' },
] as const;

function OAuthButton({ provider, onClick, dark, primary }: {
  provider: 'google'; onClick: () => void; dark: boolean; primary: string;
}) {
  const [hover, setHover] = React.useState(false);
  const { t: tr } = useTranslation();
  const labels = { google: tr('auth.oauth.google') };
  const logos: Record<string, React.ReactNode> = {
    google: (
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.62z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33C2.44 15.98 5.48 18 9 18z" fill="#34A853"/>
        <path d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33z" fill="#FBBC05"/>
        <path d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
    ),
  };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        width: '100%', padding: '14px 18px', borderRadius: 14,
        background: hover ? 'var(--surface-3)' : 'var(--surface)',
        color: textPri(dark),
        border: `1px solid ${hover ? primary : borderSubtle(dark)}`,
        fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        transition: 'background .15s, border-color .15s',
      }}
    >
      <span style={{
        width: 24, height: 24, borderRadius: 6,
        background: dark ? 'rgba(255,255,255,.96)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{logos[provider]}</span>
      <span>{labels[provider]}</span>
    </button>
  );
}

function OAuthSection({ onProvider, dark, primary, dividerLabel }: {
  onProvider: (p: 'google') => void; dark: boolean; primary: string; dividerLabel: string;
}) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <OAuthButton provider="google" onClick={() => onProvider('google')} dark={dark} primary={primary}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: borderSubtle(dark) }}/>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: textMute(dark) }}>{dividerLabel}</div>
        <div style={{ flex: 1, height: 1, background: borderSubtle(dark) }}/>
      </div>
    </>
  );
}

export function RegisterScreen({ nav, t, dark, signUp, lockedEmail, inviteToken }: RegisterScreenProps) {
  const { t: tr } = useTranslation();
  const [role,    setRole]    = React.useState<string>('client');
  const isInviteFlow = !!lockedEmail;
  const [name,    setName]    = React.useState('');
  const [email,   setEmail]   = React.useState(lockedEmail ?? '');
  const [pw,      setPw]      = React.useState('');
  const [pw2,     setPw2]     = React.useState('');
  const [err,     setErr]     = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    if (!name || !email || !pw) { setErr(tr('auth.register.errFields')); return; }
    if (pw !== pw2) { setErr(tr('auth.register.errMatch')); return; }
    setLoading(true); setErr('');
    const { data, error } = await signUp(email, pw, name, role);
    if (error) { setErr(friendlyError(error, tr)); setLoading(false); return; }
    const d = data as { session?: unknown; user?: { id: string } } | null;
    if (!d?.session) {
      setErr(tr('auth.register.confirmEmail'));
      setLoading(false);
      return;
    }
    // Invite-originated signup: link is established immediately — Supabase
    // issues a session at signUp even before the e-mail is confirmed, so the
    // person lands straight in the app with the trainer link already in place.
    if (inviteToken && d.user?.id) {
      await supabase.rpc('accept_trainer_invitation', { p_token: inviteToken, p_user_id: d.user.id });
      nav('checkin');
      return;
    }
    nav(role === 'client' ? 'profile' : 'trainerDashboard');
  };

  const oauth = async (provider: 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setErr(friendlyError(error, tr));
  };

  return (
    <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button onClick={() => nav('welcome')} style={{ ...iconBtn(dark), marginLeft: -8 }}>
        <Icon name="chevL" size={22} color={textPri(dark)}/>
      </button>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 2px' }}>
        <img src="assets/trainer-logo-clean.png" alt="TrAIner" width={90} height={90}
          style={{ width: 90, height: 90, objectFit: 'contain', filter: `drop-shadow(0 8px 20px ${t.primary}55)` }}/>
      </div>
      <h1 style={{ margin: '4px 0 2px', fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 22, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em' }}>
        {tr('auth.register.title')}
      </h1>
      <div style={{ color: textSec(dark), fontSize: 13, marginBottom: 14 }}>
        {tr('auth.register.subtitle')}
      </div>

      {/* Role selector — hidden for invite-originated signups (always client) */}
      {!isInviteFlow && <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {ROLES.map(r => {
          const on = role === r.key;
          return (
            <button key={r.key} onClick={() => setRole(r.key)} style={{
              flex: 1, padding: '10px 4px', borderRadius: 14,
              border: `1.5px solid ${on ? t.primary : 'var(--border)'}`,
              background: on ? `${t.primary}1A` : 'var(--surface)',
              color: on ? t.primary : textSec(dark),
              fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              transition: 'border-color .15s, background .15s',
            }}>
              <Icon name={r.icon} size={18} color={on ? t.primary : textSec(dark)} stroke={on ? 2.5 : 2}/>
              <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{tr(`auth.roles.${r.key}.label`)}</span>
              <span style={{ fontSize: 9.5, color: on ? t.primary : textMute(dark), textAlign: 'center', lineHeight: 1.3 }}>{tr(`auth.roles.${r.key}.desc`)}</span>
            </button>
          );
        })}
      </div>}

      {/* OAuth bypasses the locked-email flow — skip it for invite-originated signups */}
      {!isInviteFlow && <OAuthSection onProvider={oauth} dark={dark} primary={t.primary} dividerLabel={tr('auth.oauth.dividerRegister')}/>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TextInput icon="user" placeholder={tr('auth.common.fullName')}        value={name}  onChange={setName}/>
        <TextInput icon="mail" placeholder={tr('auth.common.email')} type="email" value={email} onChange={setEmail} disabled={!!lockedEmail}/>
        <TextInput icon="lock" placeholder={tr('auth.common.password')}        value={pw}    onChange={setPw}    type="password"/>
        <TextInput icon="lock" placeholder={tr('auth.common.confirmPassword')} value={pw2}   onChange={setPw2}   type="password"/>
      </div>
      {err && <div style={{ color: t.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
      <div style={{ flex: 1, minHeight: 10 }}/>
      <button onClick={submit} disabled={loading} style={primaryBtn(t.primary, loading)}>
        {loading ? tr('auth.register.loading') : tr('auth.common.register')}
      </button>
      <button onClick={() => nav('login')} style={{ ...textBtn(dark), alignSelf: 'center' }}>
        {tr('auth.register.haveAccount')}
      </button>
    </div>
  );
}
