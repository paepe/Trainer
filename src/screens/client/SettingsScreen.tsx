import React from 'react';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { SectionLabel } from '../../components/SectionLabel';
import { surfRaised, borderSubtle, textPri, textMute } from '../../theme';
import type { NavFn } from '../../types';

interface Theme {
  primary: string;
  accent:  string;
}

interface SettingsScreenProps {
  nav:      NavFn;
  t:        Theme;
  prefs:    Record<string, boolean>;
  setPrefs: (p: Record<string, boolean>) => void;
  dark:     boolean;
  setDark?: (dark: boolean) => void;
}

export function SettingsScreen({ nav, t, prefs, setPrefs, dark }: SettingsScreenProps) {
  const groups: { title: string; items: [string, string, string][] }[] = [
    { title: 'AI personalization', items: [
      ['aiPersonalization', 'AI workouts',     'Daily plan from your trainer + AI'],
      ['analysis',          'Workout Analysis','Post-session AI summary'],
      ['cycle',             'Cycle tracking',  'Adapt intensity to your phase'],
      ['behaviour',         'Behaviour Track', 'Learn from completion + feedback'],
    ]},
    { title: 'Notifications', items: [
      ['notifications', 'Push notifications', 'All app alerts'],
      ['goals',         'Goal reminders',     'Weekly milestone nudges'],
      ['alerts',        'Activity Alerts',    'Inactive day warnings'],
      ['sounds',        'Sounds & Beeps',     'In-workout audio cues'],
    ]},
    { title: 'B2B / Studio', items: [
      ['whiteLabel', 'White-label mode', 'Hide TrAIner brand for your studio'],
    ]},
  ];

  return (
    <>
      <ScreenTitle dark={dark}>Settings</ScreenTitle>
      <div style={{ padding: '0 22px 14px' }}>
        {groups.map(g => (
          <div key={g.title} style={{ marginBottom: 18 }}>
            <SectionLabel dark={dark}>{g.title}</SectionLabel>
            <div style={{
              background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
              borderRadius: 16, overflow: 'hidden',
            }}>
              {g.items.map(([k, lbl, hint], i) => (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: i < g.items.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: textPri(dark) }}>{lbl}</div>
                    <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>{hint}</div>
                  </div>
                  <Toggle on={!!prefs[k]} primary={t.primary} dark={dark} onChange={v => setPrefs({ ...prefs, [k]: v })}/>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => alert('TrAIner v1.1.0 · The PT & ME Experience')} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '16px 4px', background: 'transparent', border: 'none',
          fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: textPri(dark) }}>About this app</div>
            <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>Version 1.1.0</div>
          </div>
          <Icon name="chev" size={18} color={textMute(dark)}/>
        </button>
      </div>
    </>
  );
}

interface ToggleProps {
  on:       boolean;
  primary:  string;
  onChange: (on: boolean) => void;
  dark:     boolean;
}

function Toggle({ on, primary, onChange, dark }: ToggleProps) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 46, height: 26, borderRadius: 999, border: 'none', padding: 0,
      background: on ? primary : (dark ? '#1F2E45' : '#D7DEE7'),
      position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 2px 6px rgba(0,0,0,.25)',
      }}/>
    </button>
  );
}
