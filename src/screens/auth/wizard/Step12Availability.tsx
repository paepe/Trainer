import React from 'react';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
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

export function Step12Availability({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
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
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix="BLOCK" totalSteps={totalSteps} onBack={onBack} title="Availability and barriers" subtitle="To calibrate the plan within what you can actually fulfill." />

      
      

      <VStack gap={22}>
        <Slider
          label="Days per week"
          value={av.days_per_week ?? 3}
          min={1} max={7} suffix=" days/week"
          onChange={v => set({ days_per_week: v })}
        />

        {/* Session duration */}
        <div>
          <HStack justifyContent="space-between" alignItems="baseline" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: textSec(dark) }}>Duration per session</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: primary, letterSpacing: '-0.02em' }}>
              {av.session_duration_min ?? 45}
              <span style={{ fontSize: 12, color: '#888', marginLeft: 3, fontWeight: 500 }}>min</span>
            </span>
          </HStack>
          <HStack gap={8}>
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
          </HStack>
        </div>

        {/* Preferred time */}
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Best time</Typography>
          <SegmentedControl
            options={TIME_OPTIONS}
            value={av.preferred_time ?? 'afternoon'}
            onChange={v => set({ preferred_time: v as PreferredTime })}
          />
        </div>

        {/* Preferred days */}
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Preferred days</Typography>
          <HStack gap={8} justifyContent="space-between">
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
          </HStack>
        </div>

        {/* Adherence barriers */}
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Adherence barriers</Typography>
          <HStack style={{ flexWrap: 'wrap' }} gap={8}>
            {BARRIERS.map(b => (
              <Chip
                key={b.value}
                label={b.label}
                active={(av.adherence_barriers ?? []).includes(b.value)}
                onClick={() => toggleBarrier(b.value)}
              />
            ))}
          </HStack>
        </div>
      </VStack>

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>
    </VStack>
  );
}
