import React from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import {
  borderSubtle, surfRaised, textPri, textSec, textMute, primaryBtn, iconBtn,
} from '../../../theme';

// ── Chip ──────────────────────────────────────────────────────────────────────

interface ChipProps {
  label:     string;
  selected:  boolean;
  onToggle:  () => void;
  dark:      boolean;
  primary:   string;
  accent?:   string;
  disabled?: boolean;
}

export function Chip({ label, selected, onToggle, dark, primary, accent, disabled }: ChipProps) {
  const color = (accent && selected) ? accent : primary;
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        padding: '9px 16px', borderRadius: 999,
        background: selected ? color : surfRaised(dark),
        color: selected ? '#0E1A2B' : textPri(dark),
        border: `1.5px solid ${selected ? color : borderSubtle(dark)}`,
        fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background .15s, border-color .15s, color .15s',
      }}
    >
      {label}
    </button>
  );
}

export function ChipGroup({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, ...style }}>{children}</div>;
}

// ── GoalCard — 2-col grid item ────────────────────────────────────────────────

interface GoalCardProps {
  label:    string;
  icon:     string;
  selected: boolean;
  onToggle: () => void;
  dark:     boolean;
  primary:  string;
}

export function GoalCard({ label, icon, selected, onToggle, dark, primary }: GoalCardProps) {
  return (
    <button onClick={onToggle} style={{
      textAlign: 'left', padding: 16, borderRadius: 16,
      background: selected ? `${primary}18` : surfRaised(dark),
      border: `1.5px solid ${selected ? primary : borderSubtle(dark)}`,
      fontFamily: 'inherit', cursor: 'pointer',
      transition: 'background .15s, border-color .15s',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, marginBottom: 12,
        background: selected ? primary : `${primary}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={20} color={selected ? '#0E1A2B' : primary} stroke={2.2}/>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: textPri(dark), lineHeight: 1.3 }}>{label}</div>
    </button>
  );
}

// ── SegmentedRow — 2–4 exclusive options ─────────────────────────────────────

interface SegmentedRowProps {
  options: { value: string; label: string }[];
  value:   string;
  onChange:(v: string) => void;
  dark:    boolean;
  primary: string;
}

export function SegmentedRow({ options, value, onChange, dark, primary }: SegmentedRowProps) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, padding: '11px 0', borderRadius: 999,
            background: on ? primary : surfRaised(dark),
            border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
            color: on ? '#0E1A2B' : textSec(dark),
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'background .15s, border-color .15s, color .15s',
          }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Toggle — iOS-style switch ─────────────────────────────────────────────────

interface ToggleProps {
  on:       boolean;
  onChange: (v: boolean) => void;
  primary:  string;
  dark:     boolean;
}

export function Toggle({ on, onChange, primary, dark }: ToggleProps) {
  return (
    <div
      onClick={() => onChange(!on)}
      role="switch" aria-checked={on}
      style={{ cursor: 'pointer', flexShrink: 0 }}
    >
      <div style={{
        width: 44, height: 26, borderRadius: 999, padding: 3,
        background: on ? primary : (dark ? '#1F2E45' : '#D0D6DE'),
        transition: 'background .2s',
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          marginLeft: on ? 18 : 0, transition: 'margin-left .2s',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        }}/>
      </div>
    </div>
  );
}

// ── SliderField ───────────────────────────────────────────────────────────────

interface SliderFieldProps {
  label?:  string;
  value:   number;
  min:     number;
  max:     number;
  step?:   number;
  unit?:   string;
  onChange:(v: number) => void;
  dark:    boolean;
  primary: string;
}

export function SliderField({ label, value, min, max, step = 1, unit, onChange, dark, primary }: SliderFieldProps) {
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, color: textSec(dark) }}>{label}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: primary, letterSpacing: '-0.02em' }}>
            {value}
            {unit && <span style={{ fontSize: 12, color: textMute(dark), marginLeft: 3, fontWeight: 500 }}>{unit}</span>}
          </span>
        </div>
      )}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: primary, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: textMute(dark), marginTop: 3 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── FieldInput ────────────────────────────────────────────────────────────────

interface FieldInputProps {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  dark:        boolean;
  primary:     string;
  placeholder?: string;
  type?:       string;
  inputMode?:  React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
}

export function FieldInput({ label, value, onChange, dark, primary, placeholder, type = 'text', inputMode }: FieldInputProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type} inputMode={inputMode} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          background: surfRaised(dark),
          border: `1.5px solid ${focused ? primary : borderSubtle(dark)}`,
          color: textPri(dark), fontSize: 15, fontFamily: 'inherit',
          outline: 'none', boxSizing: 'border-box',
          transition: 'border-color .15s',
        }}
      />
    </div>
  );
}

// ── TextArea ──────────────────────────────────────────────────────────────────

interface TextAreaProps {
  label?:      string;
  value:       string;
  onChange:    (v: string) => void;
  dark:        boolean;
  primary:     string;
  placeholder?: string;
  rows?:       number;
}

export function TextArea({ label, value, onChange, dark, primary, placeholder, rows = 3 }: TextAreaProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div>
      {label && (
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
          {label}
        </div>
      )}
      <textarea
        value={value} rows={rows} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          background: surfRaised(dark),
          border: `1.5px solid ${focused ? primary : borderSubtle(dark)}`,
          color: textPri(dark), fontSize: 13, fontFamily: 'inherit',
          outline: 'none', boxSizing: 'border-box', resize: 'none',
          lineHeight: 1.55, transition: 'border-color .15s',
        }}
      />
    </div>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

export function SectionLabel({ label, dark }: { label: string; dark: boolean }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em',
      textTransform: 'uppercase', color: textMute(dark), marginBottom: 10,
    }}>
      {label}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'sensitive' | 'selective' | 'blinded' | 'opt-in' | 'lgpd' | 'technical';

const BADGE_CFG: Record<BadgeVariant, { bg: string; fg: string; label: string }> = {
  sensitive:  { bg: '#EF5B3C22', fg: '#EF5B3C', label: 'SENSITIVE'     },
  selective:  { bg: '#F5A62322', fg: '#F5A623', label: 'SELECTIVE'     },
  blinded:    { bg: '#EF5B3C22', fg: '#EF5B3C', label: 'CONFIDENTIAL'  },
  'opt-in':   { bg: '#8B5CF622', fg: '#8B5CF6', label: 'OPT-IN'        },
  lgpd:       { bg: '#2DD4E022', fg: '#2DD4E0', label: 'LGPD'          },
  technical:  { bg: '#F5A62322', fg: '#F5A623', label: 'TECHNICAL'     },
};

export function Badge({ variant }: { variant: BadgeVariant }) {
  const { bg, fg, label } = BADGE_CFG[variant];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      background: bg, color: fg,
      fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}

// ── AINote ────────────────────────────────────────────────────────────────────

interface AINoteProps {
  text:     string;
  dark:     boolean;
  primary:  string;
  variant?: 'info' | 'warning';
}

export function AINote({ text, dark, primary, variant = 'info' }: AINoteProps) {
  const border = variant === 'warning' ? '#EF5B3C' : primary;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 12,
      background: surfRaised(dark), borderLeft: `3px solid ${border}`,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <Icon name="sparkle" size={13} color={border} stroke={2}/>
      <p style={{ margin: 0, fontSize: 12, color: textSec(dark), lineHeight: 1.55 }}>{text}</p>
    </div>
  );
}

// ── VoiceOption ───────────────────────────────────────────────────────────────

interface VoiceOptionProps {
  dark:    boolean;
  primary: string;
  note?:   string;
  onClick: () => void;
}

export function VoiceOption({ dark, primary, note, onClick }: VoiceOptionProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Speak with the app — voice input"
      style={{
        width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14,
        background: hover ? `${primary}12` : surfRaised(dark),
        border: `1.5px solid ${hover ? primary : primary + '55'}`,
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: 'inherit', cursor: 'pointer',
        transition: 'background .15s, border-color .15s',
      }}
    >
      {/* Pulsing mic icon */}
      <div style={{
        position: 'relative',
        width: 40, height: 40, borderRadius: 12,
        background: `${primary}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        border: `1.5px solid ${primary}55`,
      }}>
        {/* Mic SVG — universally recognized */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3"/>
          <path d="M5 10a7 7 0 0 0 14 0"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="8" y1="22" x2="16" y2="22"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: primary, marginBottom: 2 }}>
          🎙 Speak to the app
        </div>
        <div style={{ fontSize: 12, color: textSec(dark), lineHeight: 1.45 }}>
          {note ?? 'Say it in your own words — the AI organizes it before saving.'}
        </div>
      </div>
      {/* Arrow caret */}
      <Icon name="chevR" size={16} color={primary} stroke={2}/>
    </button>
  );
}

// ── WizardHeader ──────────────────────────────────────────────────────────────

interface WizardHeaderProps {
  stepNum:     number;
  totalSteps:  number;
  onBack:      () => void;
  dark:        boolean;
  primary:     string;
  badge?:      BadgeVariant;
  moduleNum?:  number;
  moduleTitle?:string;
}

export function WizardHeader({ stepNum, totalSteps, onBack, dark, primary, badge, moduleNum = 1, moduleTitle = 'Initial setup' }: WizardHeaderProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Nav row: back + module tag + check badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} style={iconBtn(dark)}>
          <Icon name="chevL" size={22} color={textPri(dark)}/>
        </button>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '5px 10px', borderRadius: 8,
          background: dark ? '#0B1624' : '#EDF1F7',
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: textMute(dark) }}>
            TRAINER · MODULE #{String(moduleNum).padStart(2, '0')} · {moduleTitle}
          </span>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `${primary}22`, border: `1.5px solid ${primary}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={12} color={primary} stroke={3}/>
        </div>
      </div>

      {/* Progress bar */}
      {stepNum > 0 && (
        <div style={{
          height: 3, borderRadius: 999, marginBottom: 10,
          background: dark ? '#1F2E45' : '#E7ECF3', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${(stepNum / totalSteps) * 100}%`,
            background: primary, borderRadius: 999, transition: 'width .3s ease',
          }}/>
        </div>
      )}

      {/* BLOCO label + badge + Passo sub-label */}
      {stepNum > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary }}>
              BLOCO #{String(stepNum).padStart(2, '0')} / {totalSteps}
            </span>
            {badge && <Badge variant={badge}/>}
          </div>
          <div style={{ fontSize: 11, color: textMute(dark) }}>
            Passo {stepNum} de {totalSteps}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WizardFooter ──────────────────────────────────────────────────────────────

interface WizardFooterProps {
  onNext:       () => void;
  nextLabel?:   string;
  nextDisabled?:boolean;
  dark:         boolean;
  primary:      string;
}

export function WizardFooter({ onNext, nextLabel = 'Continue', nextDisabled, dark, primary }: WizardFooterProps) {
  return (
    <div style={{ paddingTop: 20 }}>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        style={{ ...primaryBtn(primary), marginBottom: 10, opacity: nextDisabled ? 0.5 : 1 }}
      >
        {nextLabel} →
      </button>
    </div>
  );
}
