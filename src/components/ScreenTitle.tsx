import React from 'react';
import { textPri, textSec } from '../theme';

interface ScreenTitleProps {
  children: React.ReactNode;
  sub?:     string;
  dark:     boolean;
}

export const ScreenTitle: React.FC<ScreenTitleProps> = ({ children, sub, dark }) => (
  <div style={{ padding: '4px 22px 18px' }}>
    <h1 style={{
      margin: 0, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em',
      color: textPri(dark),
    }}>{children}</h1>
    {sub && <div style={{ marginTop: 4, fontSize: 13, color: textSec(dark) }}>{sub}</div>}
  </div>
);
