import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
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
  hasTrainer?: boolean;
  saveError?:       string | null;
  clearSaveError?:  () => void;
  isMale?:          boolean;
}

type ToggleRow   = [BooleanPrefKey, string, string];
interface SelectorRow<K extends keyof AppPreferences> {
  key:     K;
  label:   string;
  hint:    string;
  options: { value: AppPreferences[K]; label: string }[];
}

export function SettingsScreen({ nav: _nav, t, prefs, setPrefs, dark, isTrainer = false, hasTrainer = false, saveError, clearSaveError, isMale = false }: SettingsScreenProps) {
  const { t: tr } = useTranslation();
  const isAutonomous = !isTrainer && !hasTrainer;

  const handlePrefChange = (p: Partial<AppPreferences>) => {
    if (p.language != null && p.language !== i18n.language) {
      void i18n.changeLanguage(p.language);
    }
    setPrefs(p);
  };

  // ── Value-preference sections (Tier 1) ───────────────────────────────────────

  const trainerMgmt: SelectorRow<keyof AppPreferences>[] = [
    { key: 'planExpiryDays', label: tr('settings.fields.planExpiry.label'), hint: tr('settings.fields.planExpiry.hint'),
      options: [7, 10, 14, 21, 30].map(n => ({ value: n as AppPreferences['planExpiryDays'], label: `${n}d` })) },
    { key: 'trainerDashboardLimit', label: tr('settings.fields.dashboardDepth.label'), hint: tr('settings.fields.dashboardDepth.hint'),
      options: [5, 10, 20, 50].map(n => ({ value: n as AppPreferences['trainerDashboardLimit'], label: `${n}` })) },
  ];

  const coachingPrefs: SelectorRow<keyof AppPreferences>[] = [
    { key: 'workoutReadyExpiryMin', label: tr('settings.fields.readyWindow.label'), hint: tr('settings.fields.readyWindow.hint'),
      options: [{ value: 15, label: '15m' }, { value: 30, label: '30m' }, { value: 60, label: '1h' }, { value: 120, label: '2h' }] },
  ];

  const dataPrefs: SelectorRow<keyof AppPreferences>[] = [
    { key: 'sessionHistoryLimit', label: tr('settings.fields.historyDepth.label'), hint: tr('settings.fields.historyDepth.hint'),
      options: [25, 50, 100, 200].map(n => ({ value: n as AppPreferences['sessionHistoryLimit'], label: `${n}` })) },
    { key: 'performanceWindowWeeks', label: tr('settings.fields.performanceWindow.label'), hint: tr('settings.fields.performanceWindow.hint'),
      options: [4, 6, 8, 12].map(n => ({ value: n as AppPreferences['performanceWindowWeeks'], label: tr('settings.fields.performanceWindow.opt', { n }) })) },
  ];

  const appearancePrefs: SelectorRow<keyof AppPreferences>[] = [
    { key: 'lightPalette', label: tr('settings.fields.lightPalette.label'), hint: tr('settings.fields.lightPalette.hint'),
      options: [{ value: 'arctic', label: tr('settings.opt.palette.arctic') }, { value: 'sand', label: tr('settings.opt.palette.sand') }] },
  ];

  // Language endonyms are intentionally NOT translated (always shown natively).
  const localePrefs: SelectorRow<keyof AppPreferences>[] = [
    { key: 'language', label: tr('settings.sections.language'), hint: tr('settings.fields.language.hint'),
      options: [
        { value: 'en', label: 'English' }, { value: 'pt', label: 'Português' },
        { value: 'es', label: 'Español' }, { value: 'de', label: 'Deutsch' },
      ] },
  ];

  // AI training focus — autonomous clients only (clients with a trainer inherit
  // focus from the trainer's Coach DNA, so these sliders wouldn't apply).
  const aiFocusRows: { key: 'aiFocusStrength' | 'aiFocusEndurance' | 'aiFocusMobility'; label: string }[] = [
    { key: 'aiFocusStrength',  label: tr('settings.opt.focus.strength') },
    { key: 'aiFocusEndurance', label: tr('settings.opt.focus.endurance') },
    { key: 'aiFocusMobility',  label: tr('settings.opt.focus.mobility') },
  ];

  // ── Boolean toggle groups ────────────────────────────────────────────────────
  const aiGroup: ToggleRow[] = [
    ['aiPersonalization', tr('settings.toggle.aiWorkouts.label'), tr('settings.toggle.aiWorkouts.hint')],
    ['analysis',          tr('settings.toggle.analysis.label'),   tr('settings.toggle.analysis.hint')],
    ...(isMale ? [] : [['cycle', tr('settings.toggle.cycle.label'), tr('settings.toggle.cycle.hint')] as ToggleRow]),
    ['behaviour',         tr('settings.toggle.behaviour.label'),  tr('settings.toggle.behaviour.hint')],
  ];
  const notifGroup: ToggleRow[] = [
    ['notifications', tr('settings.toggle.push.label'),   tr('settings.toggle.push.hint')],
    ['goals',         tr('settings.toggle.goals.label'),  tr('settings.toggle.goals.hint')],
    ['alerts',        tr('settings.toggle.alerts.label'), tr('settings.toggle.alerts.hint')],
    ['sounds',        tr('settings.toggle.sounds.label'), tr('settings.toggle.sounds.hint')],
  ];

  return (
    <>
      <ScreenTitle dark={dark}>{tr('settings.title')}</ScreenTitle>
      <div style={{ padding: '0 22px 14px' }}>

        {saveError && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 10,
            background: '#EF5B3C18', border: '1px solid #EF5B3C44',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12.5, color: '#EF5B3C', fontWeight: 600 }}>{saveError}</span>
            {clearSaveError && (
              <button onClick={clearSaveError} style={{
                background: 'none', border: 'none', color: '#EF5B3C', fontSize: 16,
                cursor: 'pointer', padding: 0, lineHeight: 1,
              }}>×</button>
            )}
          </div>
        )}

        {/* Client Management + Coaching window — trainer only */}
        {isTrainer && (
          <>
            <SelectorSection title={tr('settings.sections.clientMgmt')} rows={trainerMgmt} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>
            <SelectorSection title={tr('settings.sections.coaching')} rows={coachingPrefs} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>
          </>
        )}

        {/* AI personalization */}
        <ToggleSection title={tr('settings.sections.ai')} rows={aiGroup} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>

        {/* AI training focus — autonomous clients only */}
        {isAutonomous && (
          <SliderSection title={tr('settings.sections.aiFocus')} hint={tr('settings.aiFocusHint')} rows={aiFocusRows} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>
        )}

        {/* Appearance — dark toggle + light palette, clients only (trainer always-dark §8) */}
        {!isTrainer && (
          <>
            <ToggleSection title={tr('settings.sections.appearance')} rows={[['darkMode', tr('settings.toggle.darkMode.label'), tr('settings.toggle.darkMode.hint')]]} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>
            {!prefs.darkMode && (
              <SelectorSection title={tr('settings.sections.lightPalette')} rows={appearancePrefs} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>
            )}
          </>
        )}

        {/* Language — all roles */}
        <SelectorSection title={tr('settings.sections.language')} rows={localePrefs} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>
        <ToggleSection title={tr('settings.sections.exerciseNames')} rows={[['keepExerciseNamesInEnglish', tr('settings.toggle.exerciseNamesEnglish.label'), tr('settings.toggle.exerciseNamesEnglish.hint')]]} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>

        {/* Notifications */}
        <ToggleSection title={tr('settings.sections.notifications')} rows={notifGroup} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>

        {/* Data & History — clients (power-user fetch depth) */}
        {!isTrainer && (
          <SelectorSection title={tr('settings.sections.data')} rows={dataPrefs} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>
        )}

        {/* B2B / Studio — trainer / studio context */}
        {!isAutonomous && (
          <ToggleSection title={tr('settings.sections.b2b')} rows={[['whiteLabel', tr('settings.toggle.whiteLabel.label'), tr('settings.toggle.whiteLabel.hint')]]} prefs={prefs} setPrefs={handlePrefChange} t={t} dark={dark}/>
        )}

        <button onClick={() => alert(tr('settings.aboutTagline'))} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '16px 4px', background: 'transparent', border: 'none',
          fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: textPri(dark) }}>{tr('common.about')}</div>
            <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 2 }}>{tr('common.version', { version: '1.1.0' })}</div>
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

function SliderSection({ title, hint, rows, prefs, setPrefs, t, dark }: {
  title: string; hint: string;
  rows: { key: 'aiFocusStrength' | 'aiFocusEndurance' | 'aiFocusMobility'; label: string }[];
  prefs: AppPreferences; setPrefs: (p: Partial<AppPreferences>) => void; t: Theme; dark: boolean;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionLabel dark={dark}>{title}</SectionLabel>
      <div style={{ background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ fontSize: 11.5, color: textMute(dark), padding: '12px 16px 4px' }}>{hint}</div>
        {rows.map((row, i) => (
          <div key={row.key} style={{
            padding: '10px 16px 14px',
            borderBottom: i < rows.length - 1 ? `1px solid ${borderSubtle(dark)}` : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: textPri(dark) }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.primary, fontVariantNumeric: 'tabular-nums' }}>{prefs[row.key]}/10</span>
            </div>
            <input
              type="range" min={1} max={10} step={1} value={prefs[row.key]}
              onChange={e => setPrefs({ [row.key]: Number(e.target.value) })}
              style={{ width: '100%', accentColor: t.primary, cursor: 'pointer' }}
            />
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
