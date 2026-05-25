import React from 'react';
import { textMute } from '../theme';

interface SectionLabelProps {
  children: React.ReactNode;
  dark:     boolean;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, dark }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
    color: textMute(dark), marginBottom: 8,
  }}>{children}</div>
);
