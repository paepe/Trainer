import React from 'react';
import { Icon } from './Icon';
import type { NavFn } from '../types';

type Tab = [key: string, icon: string, label: string];

interface BottomTabsProps {
  tabs:         Tab[];
  active:       string;
  onTap:        NavFn;
  primary:      string;
  dark:         boolean;
  badges?:      Record<string, number>;
  disabledKeys?: string[];
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ tabs, active, onTap, primary, dark, badges = {}, disabledKeys = [] }) => (
  <div style={{
    flexShrink: 0,
    padding: '8px 4px',
    paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
    background: dark ? 'rgba(14,26,43,.92)' : 'rgba(255,255,255,.94)',
    backdropFilter: 'blur(14px)',
    borderTop: `1px solid ${dark ? '#1F2E45' : '#E5EAF1'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
  }}>
    {tabs.map(([key, ic, lbl]) => {
      const on       = active === key;
      const disabled = disabledKeys.includes(key);
      const count    = badges[key] ?? 0;
      const color    = disabled
        ? (dark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.2)')
        : on ? primary : (dark ? 'rgba(255,255,255,.5)' : '#7a8694');
      return (
        <button
          key={key}
          onClick={() => { if (!disabled) onTap(key); }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'transparent', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '6px 10px', borderRadius: 12, fontFamily: 'inherit',
            color,
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Icon name={ic} size={20} color={color} stroke={on && !disabled ? 2.4 : 2}/>
            {!disabled && count > 0 && (
              <div style={{
                position: 'absolute', top: -4, right: -6,
                minWidth: 16, height: 16, borderRadius: 999,
                background: '#EF5B3C', color: '#fff',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 3px', lineHeight: 1,
              }}>
                {count > 9 ? '9+' : count}
              </div>
            )}
          </div>
          <span style={{ fontSize: 10.5, fontWeight: on && !disabled ? 600 : 500 }}>{lbl}</span>
        </button>
      );
    })}
  </div>
);
