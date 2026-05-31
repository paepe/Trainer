import React from 'react';
import { BRAND, DARK } from '../../theme/tokens';

interface StepHeaderProps {
  idx:   number;
  total: number;
  title: string;
  sub?:  string;
  badge?: string;
}

export const StepHeader: React.FC<StepHeaderProps> = ({ idx, total, title, sub, badge }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{
        fontFamily:    '"JetBrains Mono",ui-monospace,monospace',
        fontSize:      10.5, fontWeight: 700, letterSpacing: '.15em',
        textTransform: 'uppercase', color: BRAND.primary,
      }}>
        BLOCK {String(idx).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
      {badge && (
        <span style={{
          padding:       '2px 8px', borderRadius: 999,
          background:    `${BRAND.accent}22`, color: BRAND.accent,
          fontSize:      10, fontWeight: 700, letterSpacing: '.06em',
          textTransform: 'uppercase',
        }}>
          {badge}
        </span>
      )}
    </div>
    <h2 style={{
      margin:      0,
      fontFamily:  '"Plus Jakarta Sans","Inter",system-ui,sans-serif',
      fontSize:    24, fontWeight: 700, letterSpacing: '-0.01em',
      lineHeight:  1.15, color: DARK.textPri,
    }}>
      {title}
    </h2>
    {sub && (
      <p style={{ margin: '6px 0 0', fontSize: 13, color: DARK.textSec, lineHeight: 1.5 }}>
        {sub}
      </p>
    )}
  </div>
);
