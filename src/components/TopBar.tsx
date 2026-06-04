import React from 'react';
import { Icon } from './Icon';
import { iconBtn, textPri } from '../theme';

interface TopBarProps {
  onMenu:  () => void;
  dark:    boolean;
  accent:  string;
  badge?:  React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenu, dark, accent, badge }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px 6px', flexShrink: 0,
  }}>
    <button onClick={onMenu} style={iconBtn(dark)} aria-label="Menu">
      <Icon name="menu" size={22} color={textPri(dark)} stroke={2}/>
    </button>
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {badge}
      <button style={iconBtn(dark)} aria-label="Search">
        <Icon name="search" size={20} color={textPri(dark)}/>
      </button>
      <button style={{ ...iconBtn(dark), position: 'relative' }} aria-label="Notifications">
        <Icon name="bell" size={19} color={textPri(dark)}/>
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 7, height: 7, borderRadius: '50%', background: accent,
          border: '1.5px solid var(--bg)',
        }}/>
      </button>
    </div>
  </div>
);
