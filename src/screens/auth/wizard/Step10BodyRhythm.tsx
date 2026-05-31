import React from 'react';
import { textPri, textSec, textMute, surfRaised } from '../../../theme';
import { WizardHeader, WizardFooter, Toggle, SliderField, Chip, ChipGroup, SectionLabel } from './atoms';
import type { WizardStepProps } from './types';
import type { BodyRhythmAdaptation } from '../../../types/profile-v2';

const ADAPTATIONS: { value: BodyRhythmAdaptation; label: string }[] = [
  { value: 'maintain_normal',    label: 'Maintain normal'       },
  { value: 'reduce_intensity',   label: 'Reduce intensity' },
  { value: 'reduce_impact',      label: 'Reduce impact'     },
  { value: 'increase_rest',      label: 'Increase rest'   },
  { value: 'shorten_session',    label: 'Shorten session'      },
  { value: 'prioritize_mobility',label: 'Prioritize mobility' },
  { value: 'postpone_training',  label: 'Postpone training'        },
  { value: 'regenerative',       label: 'Regenerative'        },
];

interface Step10Props extends WizardStepProps {
  biologicalSex?: string | undefined;
}

export function Step10BodyRhythm({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps, biologicalSex }: Step10Props) {
  const br = data.body_rhythm ?? {
    enabled: false,
    cycle_current_day: 14,
    cycle_duration_days: 28,
    adaptation_preference: [],
  };

  const set = (patch: Partial<typeof br>) =>
    onUpdate({ body_rhythm: { ...br, ...patch } });

  const toggleAdaptation = (v: BodyRhythmAdaptation) => {
    const cur = br.adaptation_preference ?? [];
    set({ adaptation_preference: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };

  const isDay1 = (br.cycle_current_day ?? 14) === 1;

  const markPeriodToday = () => set({ cycle_current_day: 1 });

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary} badge="opt-in"/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Body Rhythm
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        Private adaptation to physiological cycle, whenever you want to activate it. Never inspected.
      </p>

      {/* Main toggle */}
      <div style={{
        padding: '14px 16px', borderRadius: 14,
        background: surfRaised(dark),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>Activate Body Rhythm</div>
          <div style={{ fontSize: 11.5, color: textSec(dark), marginTop: 3, lineHeight: 1.4 }}>
            This feature is opt-in. You can deactivate and delete data at any time.
          </div>
        </div>
        <Toggle on={br.enabled} onChange={v => set({ enabled: v })} primary={primary} dark={dark}/>
      </div>

      {br.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SliderField
            label="Current cycle day"
            value={br.cycle_current_day ?? 14}
            min={1} max={35} unit=" day"
            onChange={v => set({ cycle_current_day: v })}
            dark={dark} primary={primary}
          />

          <SliderField
            label="Average cycle duration"
            value={br.cycle_duration_days ?? 28}
            min={21} max={35} unit=" days"
            onChange={v => set({ cycle_duration_days: v })}
            dark={dark} primary={primary}
          />

          <button
            onClick={markPeriodToday}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12, textAlign: 'left',
              background: isDay1 ? '#8B5CF622' : (dark ? '#0B1624' : '#EDF1F7'),
              border: `1.5px solid ${isDay1 ? '#8B5CF6' : (dark ? '#1F2E45' : '#D5DCEA')}`,
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background .15s, border-color .15s',
            }}
          >
            <span style={{ fontSize: 16 }}>🌙</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDay1 ? '#8B5CF6' : textPri(dark) }}>
                Period starts today
              </div>
              <div style={{ fontSize: 11, color: textMute(dark), marginTop: 2 }}>
                {isDay1 ? 'Day 1 marked — conservative adaptation activated' : 'Tap to mark cycle day 1'}
              </div>
            </div>
          </button>

          <div>
            <SectionLabel label="Adaptation preference" dark={dark}/>
            <ChipGroup>
              {ADAPTATIONS.map(a => (
                <Chip
                  key={a.value}
                  label={a.label}
                  selected={(br.adaptation_preference ?? []).includes(a.value)}
                  onToggle={() => toggleAdaptation(a.value)}
                  dark={dark} primary={primary}
                />
              ))}
            </ChipGroup>
          </div>

          <p style={{ fontSize: 11.5, color: textMute(dark), lineHeight: 1.5, margin: 0 }}>
            We never adopt things like "the student is on her period". Your operational adaptation will be: "Temporary biological factor — moderate approach and lower impact recommended".
          </p>
        </div>
      )}

      <div style={{ flex: 1 }}/>
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving} dark={dark} primary={primary}/>
    </div>
  );
}
