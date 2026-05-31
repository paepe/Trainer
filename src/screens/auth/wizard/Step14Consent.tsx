import React from 'react';
import { textPri, textSec, textMute, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, Toggle, SectionLabel } from './atoms';
import type { WizardStepProps } from './types';
import type { ConsentCategory, ConsentValue } from '../../../types/profile-v2';

type ConsentKey = keyof ConsentCategory;

const ROWS: { key: ConsentKey; label: string; sensitive?: boolean }[] = [
  { key: 'training_objective',           label: 'Training goal'                     },
  { key: 'training_history',             label: 'Training history'                },
  { key: 'pain_operational_restriction', label: 'Pain / operational restriction'  },
  { key: 'relevant_comorbidity',         label: 'Relevant comorbidity',    sensitive: true },
  { key: 'sensitive_medication',         label: 'Sensitive medication',    sensitive: true },
  { key: 'emotional_psychiatric_health', label: 'Emotional/psychiatric health', sensitive: true },
  { key: 'body_rhythm',                  label: 'Body Rhythm',              sensitive: true },
];

const VALUES: ConsentValue[] = ['share', 'summary', 'authorized_only', 'hidden'];
const VALUE_LABELS: Record<ConsentValue, string> = {
  share:          'SHARE',
  summary:        'SUMMARY',
  authorized_only:'AUTHORIZE ONLY',
  hidden:         'HIDDEN',
};
const VALUE_COLOR: Record<ConsentValue, string> = {
  share:          '#2DD4E0',
  summary:        '#2DD4E0',
  authorized_only:'#F5A623',
  hidden:         '#EF5B3C',
};

const DEFAULT_PERSONAL: ConsentCategory = {
  training_objective:           'share',
  training_history:             'share',
  pain_operational_restriction: 'share',
  relevant_comorbidity:         'authorized_only',
  sensitive_medication:         'authorized_only',
  emotional_psychiatric_health: 'hidden',
  body_rhythm:                  'authorized_only',
};
const DEFAULT_STUDIO: ConsentCategory = {
  training_objective:           'share',
  training_history:             'summary',
  pain_operational_restriction: 'summary',
  relevant_comorbidity:         'hidden',
  sensitive_medication:         'hidden',
  emotional_psychiatric_health: 'hidden',
  body_rhythm:                  'hidden',
};

export function Step14Consent({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const consent = data.consent ?? {
    personal: DEFAULT_PERSONAL,
    studio:   DEFAULT_STUDIO,
    allow_ai_adaptation: true,
    maintain_access_log: true,
  };

  const setPersonal = (key: ConsentKey, v: ConsentValue) =>
    onUpdate({ consent: { ...consent, personal: { ...consent.personal, [key]: v } } });

  const setStudio = (key: ConsentKey, v: ConsentValue) =>
    onUpdate({ consent: { ...consent, studio: { ...consent.studio, [key]: v } } });

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary} badge="lgpd"/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Consent and visibility
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 16px', lineHeight: 1.55 }}>
        You decide who sees what, and can revoke at any time.
      </p>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px', gap: 8, marginBottom: 8, paddingLeft: 4 }}>
        <div/>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: textMute(dark), textAlign: 'center' }}>
          Personal (trainer)
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: textMute(dark), textAlign: 'center' }}>
          Studio
        </div>
      </div>

      {/* Consent rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {ROWS.map(row => (
          <div key={row.key} style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 130px', gap: 8, alignItems: 'center',
            padding: '10px 8px', borderRadius: 10,
            background: row.sensitive ? `${accent}08` : surfRaised(dark),
            border: `1px solid ${row.sensitive ? `${accent}33` : borderSubtle(dark)}`,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: textPri(dark), lineHeight: 1.3 }}>
              {row.label}
              {row.sensitive && (
                <span style={{ display: 'block', fontSize: 10, color: accent, fontWeight: 700, letterSpacing: '.04em', marginTop: 2 }}>
                  SENSITIVE
                </span>
              )}
            </div>
            <ConsentPicker
              value={(consent.personal?.[row.key] ?? DEFAULT_PERSONAL[row.key]) as ConsentValue}
              onChange={v => setPersonal(row.key, v)}
              dark={dark} primary={primary}
            />
            <ConsentPicker
              value={(consent.studio?.[row.key] ?? DEFAULT_STUDIO[row.key]) as ConsentValue}
              onChange={v => setStudio(row.key, v)}
              dark={dark} primary={primary}
            />
          </div>
        ))}
      </div>

      {/* Global toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        <GlobalToggle
          label="Allows AI use for plan adaptation"
          description="The AI uses authorized data — it does not have access to what you have hidden."
          on={consent.allow_ai_adaptation}
          onChange={v => onUpdate({ consent: { ...consent, allow_ai_adaptation: v } })}
          dark={dark} primary={primary}
        />
        <GlobalToggle
          label="Maintain access history"
          description="You will be able to audit who accessed what and when."
          on={consent.maintain_access_log}
          onChange={v => onUpdate({ consent: { ...consent, maintain_access_log: v } })}
          dark={dark} primary={primary}
        />
      </div>

      <p style={{ fontSize: 11, color: textMute(dark), lineHeight: 1.5, margin: 0 }}>
        Revoking consent prevents unauthorized future use and maintains an auditable decision record.
      </p>

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving} dark={dark} primary={primary}/>
    </div>
  );
}

// ── ConsentPicker — cycles through 4 values on tap ───────────────────────────

function ConsentPicker({ value, onChange, dark, primary }: {
  value: ConsentValue; onChange: (v: ConsentValue) => void; dark: boolean; primary: string;
}) {
  const next = () => {
    const idx = VALUES.indexOf(value);
    onChange(VALUES[(idx + 1) % VALUES.length] as ConsentValue);
  };
  const color = VALUE_COLOR[value];
  return (
    <button onClick={next} style={{
      padding: '6px 4px', borderRadius: 8, textAlign: 'center',
      background: `${color}18`, border: `1.5px solid ${color}44`,
      fontFamily: 'inherit', cursor: 'pointer', width: '100%',
    }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color, letterSpacing: '.04em', lineHeight: 1.3 }}>
        {VALUE_LABELS[value]}
      </span>
    </button>
  );
}

// ── GlobalToggle ──────────────────────────────────────────────────────────────

function GlobalToggle({ label, description, on, onChange, dark, primary }: {
  label: string; description: string; on: boolean;
  onChange: (v: boolean) => void; dark: boolean; primary: string;
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12,
      background: surfRaised(dark), border: `1px solid ${borderSubtle(dark)}`,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark), marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: textSec(dark), lineHeight: 1.4 }}>{description}</div>
      </div>
      <Toggle on={on} onChange={onChange} primary={primary} dark={dark}/>
    </div>
  );
}
