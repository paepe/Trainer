import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { surfRaised, borderSubtle, textPri, textSec, primaryBtn, outlineBtn } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary:     string;
  primaryDeep: string;
  accent:      string;
  primarySoft: string;
}

interface WelcomeScreenProps {
  nav:  NavFn;
  t:    Theme;
  dark: boolean;
}

export function WelcomeScreen({ nav, t, dark }: WelcomeScreenProps) {
  const { t: tr } = useTranslation();
  return (
    <div style={{ padding: '40px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: `radial-gradient(closest-side, ${t.primary}33, transparent 70%)`,
          filter: 'blur(8px)',
        }}/>
        <img
          src="assets/trainer-logo-clean.png"
          alt="TrAIner"
          width={200}
          height={200}
          style={{
            width: 200, height: 200, objectFit: 'contain',
            filter: `drop-shadow(0 12px 30px ${t.primary}55)`,
            position: 'relative', zIndex: 1,
          }}
        />
      </div>
      <div style={{ marginTop: 22, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 100,
          background: `${t.accent}1f`, color: t.accent,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          <Icon name="sparkle" size={11} color={t.accent} stroke={2.4}/>
          {tr('auth.welcome.tagline')}
        </div>
        <h1 style={{
          margin: '16px 0 4px', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif',
          fontSize: 34, fontWeight: 700, letterSpacing: '-0.025em', color: textPri(dark), lineHeight: 1,
        }}>
          Tr<span style={{ color: t.primary }}>AI</span>ner
        </h1>
        <div style={{ marginTop: 6, fontSize: 13.5, color: textSec(dark), letterSpacing: '.02em' }}>
          {tr('auth.welcome.subtitle')}
        </div>
        <p style={{ margin: '18px auto 0', maxWidth: 280, color: textSec(dark), fontSize: 13.5, lineHeight: 1.55 }}>
          {tr('auth.welcome.blurb')}
        </p>
      </div>
      <div style={{ flex: 1 }}/>
      <button onClick={() => nav('login')}    style={primaryBtn(t.primary)}>{tr('auth.common.login')}</button>
      <button onClick={() => nav('register')} style={outlineBtn(t.primary)}>{tr('auth.common.register')}</button>
    </div>
  );
}
