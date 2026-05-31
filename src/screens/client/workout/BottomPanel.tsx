import React from 'react';
import { borderSubtle } from '../../../theme';

interface BottomPanelProps {
  title:    string;
  dark:     boolean;
  children: React.ReactNode;
}

export function BottomPanel({ title, dark, children }: BottomPanelProps) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: dark ? '#0E1A2B' : '#fff',
      borderTop: `1px solid ${borderSubtle(dark)}`,
      borderRadius: '20px 20px 0 0',
      padding: '20px 22px 32px',
      boxShadow: '0 -8px 32px rgba(0,0,0,.3)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: dark ? '#fff' : '#0E1A2B' }}>{title}</div>
      {children}
    </div>
  );
}
