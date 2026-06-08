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

interface LoginScreenProps {
  nav:    NavFn;
  t:      Theme;
  dark:   boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
}

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

export function LoginScreen({ nav, t, dark, signIn, requestPasswordReset }: LoginScreenProps) {
  const { t: tr } = useTranslation();
  const [email,    setEmail]    = React.useState('');
  const [pw,       setPw]       = React.useState('');
  const [err,      setErr]      = React.useState('');
  const [info,     setInfo]     = React.useState('');
  const [loading,  setLoading]  = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const submit = async () => {
    if (!email || !pw) { setErr(tr('auth.login.errFields')); return; }
    setLoading(true); setErr(''); setInfo('');
    const { error } = await signIn(email, pw);
    if (error) { setErr(friendlyError(error, tr)); setLoading(false); }
  };

  const forgotPassword = async () => {
    if (!email) { setErr(tr('auth.login.errResetEmailRequired')); return; }
    setResetting(true); setErr(''); setInfo('');
    const { error } = await requestPasswordReset(email);
    setResetting(false);
    if (error) setErr(friendlyError(error, tr));
    else setInfo(tr('auth.login.resetSent'));
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
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', position: 'relative', padding: '6px 0 4px' }}>
        <img
          src="assets/trainer-logo-clean.png" alt="TrAIner" width={120} height={120}
          style={{ width: 120, height: 120, objectFit: 'contain', filter: `drop-shadow(0 10px 24px ${t.primary}55)` }}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <h1 style={{ margin: 0, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em' }}>
          {tr('auth.login.title')}
        </h1>
        <div style={{ color: textSec(dark), fontSize: 13, marginTop: 4 }}>{tr('auth.login.subtitle')}</div>
      </div>
      <div style={{ marginTop: 18 }}>
        <OAuthSection onProvider={oauth} dark={dark} primary={t.primary} dividerLabel={tr('auth.oauth.dividerLogin')}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TextInput icon="mail" placeholder={tr('auth.common.email')}    type="email"    value={email} onChange={setEmail}/>
        <TextInput icon="lock" placeholder={tr('auth.common.password')} type="password" value={pw}    onChange={setPw}/>
      </div>
      {err  && <div style={{ color: t.accent,  fontSize: 12, marginTop: 10 }}>{err}</div>}
      {info && <div style={{ color: textSec(dark), fontSize: 12, marginTop: 10 }}>{info}</div>}
      <div style={{ flex: 1, minHeight: 12 }}/>
      <button onClick={submit} disabled={loading} style={primaryBtn(t.primary, loading)}>
        {loading ? tr('auth.login.loading') : tr('auth.common.login')}
      </button>
      <button onClick={forgotPassword} disabled={resetting} style={{ ...textBtn(dark), alignSelf: 'center' }}>
        {resetting ? tr('auth.login.resetSending') : tr('auth.login.forgot')}
      </button>
    </div>
  );
}
