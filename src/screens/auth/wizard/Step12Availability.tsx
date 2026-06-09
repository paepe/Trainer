import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, Typography, HStack, VStack, Spacer, Slider, Chip, SegmentedControl } from '../../../ui';
import type { WizardStepProps } from './types';
import type { PreferredTime, AdherenceBarrier } from '../../../types/profile-v2';

const TIME_VALUES: PreferredTime[] = ['morning', 'afternoon', 'evening', 'variable'];
const WEEK_DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const BARRIER_VALUES: AdherenceBarrier[] = ['night_shift', 'family_care', 'frequent_travel', 'treatment_radiation', 'transport', 'cost', 'emotional', 'time_constraint'];
const SESSION_PRESETS = [30, 45, 60, 75, 90];

export function Step12Availability({ dark, primary: _primary, accent: _accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const av = data.availability ?? {
    days_per_week: 3,
    session_duration_min: 45,
    preferred_time: 'afternoon' as PreferredTime,
    preferred_days: [],
    adherence_barriers: [],
  };

  const timeOpts = TIME_VALUES.map(v => ({ value: v, label: tr(`wizard.step12.times.${v}`) }));
  const dayLabels = tr('wizard.step12.days', { returnObjects: true }) as unknown as string[];

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
      <WizardHeader currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack} title={tr('wizard.step12.title')} subtitle={tr('wizard.step12.subtitle')} />

      
      

      <VStack gap={22}>
        <Slider
          label={tr('wizard.step12.daysPerWeek')}
          value={av.days_per_week ?? 3}
          min={1} max={7} suffix={tr('wizard.step12.daysSuffix')}
          onChange={v => set({ days_per_week: v })}
        />

        <div>
          <HStack justifyContent="space-between" alignItems="baseline" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: textSec(dark) }}>{tr('wizard.step12.durationLabel')}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: primary, letterSpacing: '-0.02em' }}>
              {av.session_duration_min ?? 45}
              <span style={{ fontSize: 12, color: '#888', marginLeft: 3, fontWeight: 500 }}>{tr('wizard.step12.minSuffix')}</span>
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
                  {m} {tr('wizard.step12.minSuffix')}
                </button>
              );
            })}
          </HStack>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step12.bestTime')}</Typography>
          <SegmentedControl
            options={timeOpts}
            value={av.preferred_time ?? 'afternoon'}
            onChange={v => set({ preferred_time: v as PreferredTime })}
          />
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step12.preferredDays')}</Typography>
          <HStack gap={8} justifyContent="space-between">
            {WEEK_DAY_LABELS.map((d, i) => {
              const on = (av.preferred_days ?? []).includes(i);
              return (
                <button key={i} onClick={() => toggleDay(i)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: on ? primary : surfRaised(dark),
                  color: on ? '#0E1A2B' : textPri(dark),
                  border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {dayLabels[i] ?? d}
                </button>
              );
            })}
          </HStack>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step12.barriers')}</Typography>
          <HStack style={{ flexWrap: 'wrap' }} gap={8}>
            {BARRIER_VALUES.map(b => (
              <Chip
                key={b}
                label={tr(`wizard.step12.barrierItems.${b}`)}
                active={(av.adherence_barriers ?? []).includes(b)}
                onClick={() => toggleBarrier(b)}
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
