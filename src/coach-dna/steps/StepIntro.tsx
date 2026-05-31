import React from 'react';
import { Icon }        from '../../components/Icon';
import { PrivacyNote } from '../components/PrivacyNote';
import { BRAND, DARK } from '../../theme/tokens';

const FEATURES = [
  { icon: 'fingerprint', label: 'Professional identity and background'    },
  { icon: 'zap',         label: 'Coaching style and methodological DNA'   },
  { icon: 'target',      label: 'Focus distribution and exercise library' },
  { icon: 'users',       label: 'Communication style and client profile'  },
  { icon: 'brain',       label: 'Philosophy and AI personality'           },
] as const;

export const StepIntro: React.FC = () => (
  <div>
    {/* hero icon */}
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: `linear-gradient(135deg, ${BRAND.accent}, #C23B22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 12px 30px ${BRAND.accent}44`,
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
        textTransform: 'uppercase', color: BRAND.accent,
      }}>
        COACH STUDIO · FEED THE AI
      </p>
      <h1 style={{
        margin: '0 0 12px',
        fontFamily: '"Plus Jakarta Sans","Inter",system-ui,sans-serif',
        fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.08,
        color: DARK.textPri,
      }}>
        Coach DNA
      </h1>
      <p style={{ margin: 0, fontSize: 13.5, color: DARK.textSec, lineHeight: 1.55 }}>
        Capture <strong>your training signature</strong> so the AI Coach Engine generates
        workouts with your real method — not generic recommendations.
      </p>
    </div>

    {/* feature list */}
    <div style={{
      background: DARK.surface, borderRadius: 14,
      border: `1px solid ${DARK.border}`, padding: '4px 0',
      marginBottom: 0,
    }}>
      {FEATURES.map(({ icon, label }) => (
        <div key={icon} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 14px',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `${BRAND.accent}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={icon} size={14} color={BRAND.accent}/>
          </div>
          <span style={{ fontSize: 13, color: DARK.textSec }}>{label}</span>
        </div>
      ))}
    </div>

    <PrivacyNote tone="coach">
      The more accurate your profile, the more the generated workouts will sound like you wrote them.
    </PrivacyNote>

    <p style={{
      margin: '14px 0 0',
      fontFamily: '"JetBrains Mono",ui-monospace,monospace',
      fontSize: 10.5, color: DARK.textMute, textAlign: 'center', letterSpacing: '.04em',
    }}>
      ≈ 5–8 min · 12 blocks · powers the AI Coach Engine
    </p>
  </div>
);
