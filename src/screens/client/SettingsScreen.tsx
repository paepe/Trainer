import React from 'react';
import { Icon } from '../../components/Icon';
import { ScreenTitle } from '../../components/ScreenTitle';
import { SectionLabel } from '../../components/SectionLabel';
import { surfRaised, borderSubtle, textPri, textSec, textMute } from '../../theme';
import type { NavFn } from '../../types';
import type { AppPreferences, BooleanPrefKey } from '../../types/preferences';

interface Theme {
  primary: string;
  accent:  string;
}

interface SettingsScreenProps {
  nav:        NavFn;
  t:          Theme;
  prefs:      AppPreferences;
  setPrefs:   (p: Partial<AppPreferences>) => void;
  dark:       boolean;
  isTrainer?: boolean;
  hasTrainer?: boolean;  // client with an active trainer
}

type ToggleRow   = [BooleanPrefKey, string, string];
interface SelectorRow<K extends keyof AppPreferences> {
  key:     K;
  label:   string;
  hint:    string;
  options: { value: AppPreferences[K]; label: string }[];
}

export function SettingsScreen({ nav, t, prefs, setPrefs, dark, isTrainer = false, hasTrainer = false }: SettingsScreenProps) {
  const isAutonomous = !isTrainer && !hasTrainer;

  // ── Value-preference sections (Tier 1) ───────────────────────────────────────
  const trainingPrefs: SelectorRow<keyof AppPreferences>[] = [
    { key: 'defaultLocation', label: 'Default location', hint: 'Where you usually train',
      options: [{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }, { value: 'outdoor', label: 'Outdoor' }] },
    { key: 'defaultDurationMin', label: 'Default session', hint: 'Preferred workout length',
      options: [30, 45, 60, 75, 90].map(n => ({ value: n as AppPreferences['defaultDurationMin'], label: `${n}m` })) },
    { key: 'preferredIntensity', label: 'Preferred intensity', hint: 'Baseline effort for AI plans',
      options: [{ value: 'light', label: 'Light' }, { value: 'moderate', label: 'Moderate' }, { value: 'hard', label: 'Hard' }] },
  ];

  const trainerMgmt: SelectorRow<keyof AppPreferences>[] = [
    { key: 'planExpiryDays', label: 'Plan auto-expiry', hint: 'Cancel pending plans after',
      options: [7, 10, 14, 21, 30].map(n => ({ value: n as AppPreferences['planExpiryDays'], label: `${n}d` })) },
  ];

  const coachingPrefs: SelectorRow<keyof AppPreferences>[] = [
    { key: 'workoutReadyExpiryMin', label: 'Ready-to-train window', hint: 'How long your "I\'m ready" alert stays live',
      options: [{ value: 15, label: '15m' }, { value: 30, label: '30m' }, { value: 60, label: '1h' }, { value: 120, label: '2h' }] },
  ];

  const appearancePrefs: SelectorRow<keyof AppPreferences>[] = [
    { key: 'lightPalette', label: 'Light palette', hint: 'Applied when dark mode is off',
      options: [{ value: 'arctic', label: 'Arctic' }, { value: 'sand', label: 'Sand' }] },
  ];

  // ── Boolean toggle groups ────────────────────────────────────────────────────
  const aiGroup: ToggleRow[] = [
    ['aiPersonalization', 'AI workouts',      'Daily plan from your trainer + AI'],
    ['analysis',          'Workout Analysis', 'Post-session AI summary'],
    ['cycle',             'Cycle tracking',   'Adapt intensity to your phase'],
    ['behaviour',         'Behavior Track',   'Learn from completion + feedback'],
  ];
  const notifGroup: ToggleRow[] = [
    ['notifications', 'Push notifications', 'All app alerts'],
    ['goals',         'Goal reminders',     'Weekly milestone nudges'],
    ['alerts',        'Activity Alerts',    'Inactive day warnings'],
    ['sounds',        'Sounds & Beeps',     'In-workout audio cues'],
  ];

  return (
    <>
      <ScreenTitle dark={dark}>Settings</ScreenTitle>
      <div style={{ padding: '0 22px 14px' }}>

        {/* Training Preferences — clients (autonomous + with trainer) */}
        {!isTrainer && (
          <SelectorSection title="Training Preferences" rows={trainingPrefs} prefs={prefs} setPrefs={setPrefs} t={t} dark={dark}/>
        )}

        {/* Client Management — trainer only */}
        {isTrainer && (
          <SelectorSection title="Client Management" rows={trainerMgmt} prefs={prefs} setPrefs={setPrefs} t={t} dark={dark}/>
        )}

        {/* Coaching — client with an active trainer */}
        {hasTrainer && !isTrainer && (
          <SelectorSection title="Coaching" rows={coachingPrefs} prefs={prefs} setPrefs={setPrefs} t={t} dark={dark}/>
        )}

        {/* AI personalization */}
        <ToggleSection title="AI personalization" rows={aiGroup} prefs={prefs} setPrefs={setPrefs} t={t} dark={dark}/>

        {/* Appearance — dark toggle + light palette, clients only (trainer always-dark §8) */}
        {!isTrainer && (
          <>
            <ToggleSection title="Appearance" rows={[['darkMode', 'Dark mode', 'Use the dark theme across the app']]} prefs={prefs} setPrefs={setPrefs} t={t} dark={dark}/>
            {!prefs.darkMode && (
              <SelectorSection title="Light palette" rows={appearancePrefs} prefs={prefs} setPrefs={setPrefs} t={t} dark={dark}/>
            )}
          </>
        )}

        {/* Notifications */}
        <ToggleSection title="Notifications" rows={notifGroup} prefs={prefs} setPrefs={setPrefs} t={t} dark={dark}/>

        {/* B2B / Studio — trainer / studio context */}
        {!isAutonomous && (
          <ToggleSection title="B2B / Studio" rows={[['whiteLabel', 'White-label mode', 'Hide TrAIner brand for your studio']]} prefs={prefs} setPrefs={setPrefs} t={t} dark={dark}/>
        )}

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

// ── Sections ───────────────────────────────────────────────────────────────────

function ToggleSection({ title, rows, prefs, setPrefs, t, dark }: {
  title: string; rows: ToggleRow[]; prefs: AppPreferences;
  setPrefs: (p: Partial<AppPreferences>) => void; t: Theme; dark: boolean;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionLabel dark={dark}>{title}</SectionLabel>
      <div style={{ background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`, borderRadius: 16, overflow: 'hidden' }}>
        {rows.map(([k, lbl, hint], i) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px',
            borderBottom: i < rows.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
          }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: textPri(dark) }}>{lbl}</div>
              <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>{hint}</div>
            </div>
            <Toggle on={!!prefs[k]} primary={t.primary} onChange={v => setPrefs({ [k]: v })}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectorSection({ title, rows, prefs, setPrefs, t, dark }: {
  title: string; rows: SelectorRow<keyof AppPreferences>[]; prefs: AppPreferences;
  setPrefs: (p: Partial<AppPreferences>) => void; t: Theme; dark: boolean;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionLabel dark={dark}>{title}</SectionLabel>
      <div style={{ background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`, borderRadius: 16, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <div key={String(row.key)} style={{
            padding: '13px 16px',
            borderBottom: i < rows.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: textPri(dark) }}>{row.label}</div>
            </div>
            <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: -6, marginBottom: 10 }}>{row.hint}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {row.options.map(opt => {
                const active = prefs[row.key] === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => setPrefs({ [row.key]: opt.value })}
                    style={{
                      flex: '1 1 auto', minWidth: 52, padding: '8px 10px', borderRadius: 10,
                      border: `1.5px solid ${active ? t.primary : borderSubtle(dark)}`,
                      background: active ? `${t.primary}1A` : 'transparent',
                      color: active ? t.primary : textSec(dark),
                      fontFamily: 'inherit', fontSize: 12.5, fontWeight: active ? 700 : 500,
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, primary, onChange }: { on: boolean; primary: string; onChange: (on: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 46, height: 26, borderRadius: 999, border: 'none', padding: 0,
      background: on ? primary : 'var(--border)',
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
