import React from 'react';
import { DARK } from '../../theme/tokens';

interface FieldLabelProps {
  children: React.ReactNode;
  hint?:    string | undefined;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ children, hint }) => (
  <div style={{
    fontSize: 11.5, fontWeight: 600, letterSpacing: '.06em',
    textTransform: 'uppercase', color: DARK.textSec,
    marginBottom: 8,
  }}>
    {children}
    {hint && (
      <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: DARK.textMute }}>
        {' '}· {hint}
      </span>
    )}
  </div>
);
