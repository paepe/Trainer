import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '@/ui';
import { textPri, textSec, primaryBtn } from '../../theme';
import type { NavFn } from '../../types';
import type { AuthError } from '@supabase/supabase-js';
import { friendlyError } from '../../lib/friendlyError';

interface Theme { primary: string; accent: string; }

interface ResetPasswordScreenProps {
  nav:            NavFn;
  t:              Theme;
  dark:           boolean;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
  onDone:         () => void;
}

export function ResetPasswordScreen({ t, dark, updatePassword, onDone }: ResetPasswordScreenProps) {
  const { t: tr } = useTranslation();
  const [pw,      setPw]      = React.useState('');
  const [pw2,     setPw2]     = React.useState('');
  const [err,     setErr]     = React.useState('');
  const [done,    setDone]    = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    if (!pw || !pw2) { setErr(tr('auth.reset.errFields')); return; }
    if (pw !== pw2)  { setErr(tr('auth.reset.errMatch'));  return; }
    setLoading(true); setErr('');
    const { error } = await updatePassword(pw);
    setLoading(false);
    if (error) { setErr(friendlyError(error, tr)); return; }
    setDone(true);
  };

  return (
    <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginTop: 24 }}>
        <h1 style={{ margin: 0, fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em' }}>
          {tr('auth.reset.title')}
        </h1>
        <div style={{ color: textSec(dark), fontSize: 13, marginTop: 4 }}>{tr('auth.reset.subtitle')}</div>
      </div>

      {done ? (
        <>
          <div style={{ color: textSec(dark), fontSize: 13, marginTop: 24 }}>{tr('auth.reset.success')}</div>
          <div style={{ flex: 1, minHeight: 12 }}/>
          <button onClick={onDone} style={primaryBtn(t.primary, false)}>
            {tr('auth.reset.backToLogin')}
          </button>
        </>
      ) : (
        <>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TextInput icon="lock" placeholder={tr('auth.reset.newPassword')}     type="password" value={pw}  onChange={setPw}/>
            <TextInput icon="lock" placeholder={tr('auth.reset.confirmPassword')} type="password" value={pw2} onChange={setPw2}/>
          </div>
          {err && <div style={{ color: t.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
          <div style={{ flex: 1, minHeight: 12 }}/>
          <button onClick={submit} disabled={loading} style={primaryBtn(t.primary, loading)}>
            {loading ? tr('auth.reset.loading') : tr('auth.reset.submit')}
          </button>
        </>
      )}
    </div>
  );
}
