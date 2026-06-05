import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon }        from '../../components/Icon';
import { PrivacyNote } from '../components/PrivacyNote';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';

const FEATURE_ICONS = ['fingerprint', 'zap', 'target', 'users', 'brain'] as const;

export const StepIntro: React.FC = () => {
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const features = tr('coachDna.intro.features', { returnObjects: true }) as unknown as string[];
  return (
  <div>
    {/* hero icon */}
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: `linear-gradient(135deg, ${theme.accent}, #C23B22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 12px 30px ${theme.accent}44`,
      }}>
        <Icon name="fingerprint" size={28} color="#fff" stroke={1.5}/>
      </div>
    </div>

    {/* copy */}
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <p style={{
        margin: '0 0 4px',
        fontFamily: '"JetBrains Mono",ui-monospace,monospace',
        fontSize: 10.5, fontWeight: 700, letterSpacing: '.18em',
        textTransform: 'uppercase', color: theme.accent,
      }}>
        {tr('coachDna.intro.kicker')}
      </p>
      <h1 style={{
        margin: '0 0 12px',
        fontFamily: '"Plus Jakarta Sans","Inter",system-ui,sans-serif',
        fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08,
        color: DARK.textPri,
      }}>
        {tr('coachDna.intro.title')}
      </h1>
      <p
        style={{ margin: 0, fontSize: 13.5, color: DARK.textSec, lineHeight: 1.55 }}
        dangerouslySetInnerHTML={{ __html: tr('coachDna.intro.body') }}
      />
    </div>

    {/* feature list */}
    <div style={{
      background: DARK.surface, borderRadius: 14,
      border: `1px solid ${DARK.border}`, padding: '4px 0',
      marginBottom: 0,
    }}>
      {FEATURE_ICONS.map((icon, i) => (
        <div key={icon} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `${theme.accent}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={icon} size={14} color={theme.accent}/>
          </div>
          <span style={{ fontSize: 13, color: DARK.textSec }}>{features[i]}</span>
        </div>
      ))}
    </div>

    <PrivacyNote tone="coach">
      {tr('coachDna.intro.privacyNote')}
    </PrivacyNote>

    <p style={{
      margin: '14px 0 0',
      fontFamily: '"JetBrains Mono",ui-monospace,monospace',
      fontSize: 10.5, color: DARK.textMute, textAlign: 'center', letterSpacing: '.04em',
    }}>
      {tr('coachDna.intro.meta')}
    </p>
  </div>
  );
};
