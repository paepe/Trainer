import React from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '../../../components/Icon';
import { DARK } from '../../../theme/tokens';

// ── Design constants (mirrors perfil-atoms.jsx B tokens) ──────────────────────
const navy       = DARK.bg;           // #0E1A2B
const surf       = DARK.surface;      // #142233
const border     = DARK.border;       // #1F2E45
const borderSoft = DARK.borderSoft;   // #243650
const text       = DARK.textPri;      // #FFFFFF
const textSec    = DARK.textSec;      // rgba(255,255,255,.65)
const textMute   = DARK.textMute;     // rgba(255,255,255,.40)

const FF_DISPLAY = '"Plus Jakarta Sans","Inter",system-ui,sans-serif';
const FF_MONO    = '"JetBrains Mono",ui-monospace,SFMono-Regular,monospace';

// ── Chip ──────────────────────────────────────────────────────────────────────

interface ChipProps {
  label:     string;
  selected:  boolean;
  onToggle:  () => void;
  dark:      boolean;   // kept for API compat; always dark in profile wizard
  primary:   string;
  accent?:   string;
  disabled?: boolean;
}

export function Chip({ label, selected, onToggle, primary, accent, disabled }: ChipProps) {
  const color = (accent && selected) ? accent : primary;
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        padding: '9px 14px', borderRadius: 999,
        background: selected ? `${color}22` : 'transparent',
        color: selected ? color : text,
        border: `1.5px solid ${selected ? color : border}`,
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'all .12s ease',
      }}
    >
      {selected && <Icon name="check" size={12} color={color} stroke={2.5}/>}
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

export function GoalCard({ label, icon, selected, onToggle, primary }: GoalCardProps) {
  return (
    <button onClick={onToggle} style={{
      textAlign: 'left', padding: 14, borderRadius: 14,
      background: selected ? `${primary}14` : surf,
      border: `1.5px solid ${selected ? primary : border}`,
      fontFamily: 'inherit', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      color: text,
      transition: 'all .12s ease',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: selected ? `${primary}22` : navy,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={18} color={selected ? primary : textSec} stroke={2}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: FF_DISPLAY, color: text, lineHeight: 1.3 }}>{label}</div>
      </div>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: `1.5px solid ${selected ? primary : borderSoft}`,
        background: selected ? primary : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <Icon name="check" size={11} color={navy} stroke={2.8}/>}
      </div>
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

export function SegmentedRow({ options, value, onChange, primary }: SegmentedRowProps) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, padding: '11px 0', borderRadius: 14,
            background: on ? `${primary}18` : surf,
            border: `1.5px solid ${on ? primary : border}`,
            color: on ? primary : textSec,
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all .12s ease',
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

export function Toggle({ on, onChange, primary }: ToggleProps) {
  return (
    <div
      onClick={() => onChange(!on)}
      role="switch" aria-checked={on}
      style={{ cursor: 'pointer', flexShrink: 0 }}
    >
      <div style={{
        width: 38, height: 22, borderRadius: 999, padding: 2,
        background: on ? primary : border,
        position: 'relative',
        transition: 'background .15s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 18 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: navy,
          transition: 'left .15s',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
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

export function SliderField({ label, value, min, max, step = 1, unit, onChange, primary }: SliderFieldProps) {
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: textSec }}>{label}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: text, fontFamily: FF_MONO }}>
            {value}
            {unit && <span style={{ fontSize: 11, color: textMute, marginLeft: 2 }}>{unit}</span>}
          </span>
        </div>
      )}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ width: '100%', accentColor: primary, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: textMute, fontFamily: FF_MONO, marginTop: 2 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── FieldInput ────────────────────────────────────────────────────────────────

interface FieldInputProps {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  dark:         boolean;
  primary:      string;
  placeholder?: string;
  type?:        string;
  inputMode?:   React.InputHTMLAttributes<HTMLInputElement>['inputMode'];
}

export function FieldInput({ label, value, onChange, primary, placeholder, type = 'text', inputMode }: FieldInputProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div>
      <div style={{
        fontSize: 11.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
        color: textSec, marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: navy,
        border: `1.5px solid ${focused ? primary : border}`,
        borderRadius: 12, padding: '0 14px',
        transition: 'border-color .15s',
      }}>
        <input
          type={type} inputMode={inputMode} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: text, padding: '13px 0', fontSize: 14.5,
            fontFamily: 'inherit',
          }}
        />
      </div>
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

export function TextArea({ label, value, onChange, primary, placeholder, rows = 3 }: TextAreaProps) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div>
      {label && (
        <div style={{
          fontSize: 11.5, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase',
          color: textSec, marginBottom: 6,
        }}>
          {label}
        </div>
      )}
      <textarea
        value={value} rows={rows} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '13px 14px', borderRadius: 12,
          background: navy,
          border: `1.5px solid ${focused ? primary : border}`,
          color: text, fontSize: 14, fontFamily: 'inherit',
          outline: 'none', boxSizing: 'border-box', resize: 'none',
          lineHeight: 1.55, transition: 'border-color .15s',
        }}
      />
    </div>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

export function SectionLabel({ label }: { label: string; dark: boolean }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em',
      textTransform: 'uppercase', color: textMute, marginBottom: 10,
      fontFamily: FF_MONO,
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
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      background: bg, color: fg,
      fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
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

export function AINote({ text, primary, variant = 'info' }: AINoteProps) {
  const accent = variant === 'warning' ? '#EF5B3C' : primary;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 12,
      background: surf, borderLeft: `3px solid ${accent}`,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <Icon name="sparkle" size={13} color={accent} stroke={2}/>
      <p style={{ margin: 0, fontSize: 12, color: textSec, lineHeight: 1.55 }}>{text}</p>
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

export function VoiceOption({ primary, note, onClick }: VoiceOptionProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Voice input"
      style={{
        width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 14,
        background: hover ? `${primary}12` : navy,
        border: `1.5px dashed ${hover ? primary : borderSoft}`,
        display: 'flex', alignItems: 'center', gap: 12,
        fontFamily: 'inherit', cursor: 'pointer', color: text,
        transition: 'background .15s, border-color .15s',
        marginTop: 16,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: `${primary}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="mic" size={15} color={primary} stroke={2.2}/>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: primary, marginBottom: 1 }}>
          Speak to the app
        </div>
        <div style={{ fontSize: 10.5, color: textMute, lineHeight: 1.4 }}>
          {note ?? 'Voice input available on this block — AI will structure it for you.'}
        </div>
      </div>
      <Icon name="chevR" size={16} color={primary} stroke={2}/>
    </button>
  );
}

// ── WizardHeader ──────────────────────────────────────────────────────────────

interface WizardHeaderProps {
  stepNum:      number;
  totalSteps:   number;
  onBack:       () => void;
  dark:         boolean;
  primary:      string;
  badge?:       BadgeVariant;
  moduleNum?:   number;
  moduleTitle?: string;
}

export function WizardHeader({ stepNum, totalSteps, onBack, primary, badge, moduleNum = 1, moduleTitle = 'Initial setup' }: WizardHeaderProps) {
  const cyanDeep = '#0F8C85';
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Nav row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: surf, border: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: text,
        }}>
          <Icon name="chevL" size={20} color={text} stroke={2}/>
        </button>

        <div style={{
          flex: 1, textAlign: 'center',
          padding: '5px 10px', borderRadius: 8,
          background: `${navy}cc`,
        }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '.15em',
            textTransform: 'uppercase', color: primary, fontFamily: FF_MONO,
          }}>
            TRAINER · MODULE #{String(moduleNum).padStart(2, '0')} · {moduleTitle}
          </span>
        </div>

        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: surf, border: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={13} color={primary} stroke={2.5}/>
        </div>
      </div>

      {/* Progress bar — gradient */}
      {stepNum > 0 && (
        <div style={{ height: 3, borderRadius: 2, background: border, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%', width: `${(stepNum / totalSteps) * 100}%`,
            background: `linear-gradient(90deg, ${cyanDeep} 0%, ${primary} 100%)`,
            borderRadius: 2, transition: 'width .35s ease',
          }}/>
        </div>
      )}

      {/* Block label */}
      {stepNum > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '.15em',
              textTransform: 'uppercase', color: primary, fontFamily: FF_MONO,
            }}>
              BLOCK #{String(stepNum).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
            </span>
            {badge && <Badge variant={badge}/>}
          </div>
          <div style={{ fontSize: 11, color: textMute, fontFamily: FF_MONO }}>
            Step {stepNum} of {totalSteps}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WizardFooter ──────────────────────────────────────────────────────────────

interface WizardFooterProps {
  onNext:        () => void;
  nextLabel?:    string;
  nextDisabled?: boolean;
  dark:          boolean;
  primary:       string;
  onSave?:       (() => void) | undefined;
  saving?:       boolean | undefined;
}

export function WizardFooter({ onNext, nextLabel = 'Continue', nextDisabled, primary, onSave, saving }: WizardFooterProps) {
  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              padding: '14px 18px', borderRadius: 14,
              background: 'transparent', border: `1.5px solid ${border}`,
              color: textSec, fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              whiteSpace: 'nowrap',
              transition: 'opacity .15s',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || saving}
          style={{
            flex: 1, padding: '14px 18px', borderRadius: 14,
            background: primary, border: 'none',
            color: navy, fontFamily: FF_DISPLAY, fontWeight: 700, fontSize: 14,
            cursor: (nextDisabled || saving) ? 'default' : 'pointer',
            opacity: (nextDisabled || saving) ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 10px 30px ${primary}33`,
            transition: 'opacity .15s',
          }}
        >
          {nextLabel}
          <Icon name="chevR" size={14} color={navy} stroke={2.4}/>
        </button>
      </div>
    </div>
  );
}
