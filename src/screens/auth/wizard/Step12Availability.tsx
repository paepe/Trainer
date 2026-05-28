import React from 'react';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, SliderField, SegmentedRow, Chip, ChipGroup, SectionLabel } from './atoms';
import type { WizardStepProps } from './types';
import type { PreferredTime, AdherenceBarrier } from '../../../types/profile-v2';

const TIME_OPTIONS: { value: PreferredTime; label: string }[] = [
  { value: 'morning',   label: 'Morning'  },
  { value: 'afternoon', label: 'Afternoon'},
  { value: 'evening',   label: 'Evening'  },
  { value: 'variable',  label: 'Variable' },
];

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const BARRIERS: { value: AdherenceBarrier; label: string }[] = [
  { value: 'night_shift',          label: 'Night shift'         },
  { value: 'family_care',          label: 'Family care'        },
  { value: 'frequent_travel',      label: 'Frequent travel'    },
  { value: 'treatment_radiation',  label: 'Treatment/Radiation'},
  { value: 'transport',            label: 'Transport'          },
  { value: 'cost',                 label: 'Cost'               },
  { value: 'emotional',            label: 'Emotional'          },
  { value: 'time_constraint',      label: 'Lack of time'       },
];

const SESSION_PRESETS = [30, 45, 60, 90];

export function Step12Availability({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
  const av = data.availability ?? {
    days_per_week: 3,
    session_duration_min: 45,
    preferred_time: 'afternoon' as PreferredTime,
    preferred_days: [],
    adherence_barriers: [],
  };

  const set = (patch: Partial<typeof av>) => onUpdate({ availability: { ...av, ...patch } });

  const toggleDay = (idx: number) => {
    const cur = av.preferred_days ?? [];
    set({ preferred_days: cur.includes(idx) ? cur.filter(x => x !== idx) : [...cur, idx] });
  };

  const toggleBarrier = (v: AdherenceBarrier) => {
    const cur = av.adherence_barriers ?? [];
    set({ adherence_barriers: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Availability and barriers
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        To calibrate the plan within what you can actually fulfill.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <SliderField
          label="Days per week"
          value={av.days_per_week ?? 3}
          min={1} max={7} unit=" days/week"
          onChange={v => set({ days_per_week: v })}
          dark={dark} primary={primary}
        />

        {/* Session duration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: textSec(dark) }}>Duration per session</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: primary, letterSpacing: '-0.02em' }}>
              {av.session_duration_min ?? 45}
              <span style={{ fontSize: 12, color: '#888', marginLeft: 3, fontWeight: 500 }}>min</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {SESSION_PRESETS.map(m => {
              const on = (av.session_duration_min ?? 45) === m;
              return (
                <button key={m} onClick={() => set({ session_duration_min: m })} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12,
                  background: on ? primary : surfRaised(dark),
                  color: on ? '#0E1A2B' : textPri(dark),
                  border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  {m} min
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred time */}
        <div>
          <SectionLabel label="Best time" dark={dark}/>
          <SegmentedRow
            options={TIME_OPTIONS}
            value={av.preferred_time ?? 'afternoon'}
            onChange={v => set({ preferred_time: v as PreferredTime })}
            dark={dark} primary={primary}
          />
        </div>

        {/* Preferred days */}
        <div>
          <SectionLabel label="Preferred days" dark={dark}/>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {WEEK_DAYS.map((d, i) => {
              const on = (av.preferred_days ?? []).includes(i);
              return (
                <button key={i} onClick={() => toggleDay(i)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: on ? primary : surfRaised(dark),
                  color: on ? '#0E1A2B' : textPri(dark),
                  border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Adherence barriers */}
        <div>
          <SectionLabel label="Adherence barriers" dark={dark}/>
          <ChipGroup>
            {BARRIERS.map(b => (
              <Chip
                key={b.value}
                label={b.label}
                selected={(av.adherence_barriers ?? []).includes(b.value)}
                onToggle={() => toggleBarrier(b.value)}
                dark={dark} primary={primary}
              />
            ))}
          </ChipGroup>
        </div>
      </div>

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} dark={dark} primary={primary}/>
    </div>
  );
}
