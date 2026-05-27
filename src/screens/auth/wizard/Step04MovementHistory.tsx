import React from 'react';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import {
  WizardHeader, WizardFooter, Chip, ChipGroup, SegmentedRow,
  SliderField, AINote, VoiceOption, SectionLabel, Toggle, TextArea,
} from './atoms';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type {
  TrainingFrequency, FitnessLevelV2, TrainingModality, AbandonReason, PreferredIntensity,
  ProfileAbandonHistory,
} from '../../../types/profile-v2';

const FREQUENCY_OPTIONS: { value: TrainingFrequency; label: string }[] = [
  { value: 'irregular',    label: 'No regularity' },
  { value: 'sometimes',    label: 'Sometimes'     },
  { value: 'not_training', label: 'Not training'  },
];

const LEVEL_OPTIONS: { value: FitnessLevelV2; label: string }[] = [
  { value: 'beginner',     label: 'Beginner'     },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced'     },
];

const MODALITIES: { value: TrainingModality; label: string }[] = [
  { value: 'weight_training', label: 'Weight Training' },
  { value: 'running',         label: 'Running'     },
  { value: 'walking',         label: 'Walking'   },
  { value: 'yoga',            label: 'Yoga'        },
  { value: 'pilates',         label: 'Pilates'     },
  { value: 'cycling',         label: 'Cycling'    },
  { value: 'swimming',        label: 'Swimming'     },
  { value: 'functional',      label: 'Functional'   },
  { value: 'martial_arts',    label: 'Martial Arts'       },
  { value: 'dance',           label: 'Dance'       },
  { value: 'crossfit',        label: 'CrossFit'    },
  { value: 'other',           label: 'Other'       },
];

const ABANDON_REASONS: { value: AbandonReason; label: string }[] = [
  { value: 'lack_of_time',    label: 'Lack of time'    },
  { value: 'injury',          label: 'Injury'             },
  { value: 'lack_of_results', label: 'Lack of results'},
  { value: 'demotivation',    label: 'Demotivation'      },
  { value: 'cost',            label: 'Cost'             },
  { value: 'routine_change',  label: 'Routine change' },
  { value: 'discomfort',      label: 'Embarrassment'   },
  { value: 'other',           label: 'Other'             },
];

const INTENSITY_OPTIONS: { value: PreferredIntensity; label: string }[] = [
  { value: 'gradual',   label: 'Gradual'   },
  { value: 'moderate',  label: 'Moderate'  },
  { value: 'intense',   label: 'Intense'   },
];

export function Step04MovementHistory({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
  // Page 0 = main history, page 1 = abandon details (conditional)
  const [page, setPage] = React.useState(0);
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const mh = data.movement_history ?? {
    frequency: undefined as unknown as TrainingFrequency,
    fitness_level: undefined as unknown as FitnessLevelV2,
    weekly_frequency: 3,
    modalities: [],
    abandoned_before: false,
  };

  const ah: ProfileAbandonHistory = data.abandon_history ?? {
    reasons: [],
    preferred_intensity: 'moderate' as PreferredIntensity,
    churn_risk_signals: [],
  };

  const setMH = (p: typeof mh) => onUpdate({ movement_history: p });
  const setAH = (p: ProfileAbandonHistory) => onUpdate({ abandon_history: p });

  const toggleModality = (v: TrainingModality) => {
    const next = mh.modalities?.includes(v)
      ? mh.modalities.filter(x => x !== v)
      : [...(mh.modalities ?? []), v];
    setMH({ ...mh, modalities: next });
  };

  const toggleReason = (v: AbandonReason) => {
    const next = ah.reasons?.includes(v)
      ? ah.reasons.filter(x => x !== v)
      : [...(ah.reasons ?? []), v];
    setAH({ ...ah, reasons: next });
  };

  const handleNext = () => {
    if (page === 0 && mh.abandoned_before) {
      setPage(1);
    } else {
      onNext();
    }
  };

  const handleBack = () => {
    if (page === 1) { setPage(0); } else { onBack(); }
  };

  if (page === 1) {
    return (
      <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={handleBack} dark={dark} primary={primary}/>

        <h2 style={{
          margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
        }}>
          What led to dropping out?
        </h2>
        <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
          No judgment. This helps the plan work around the same obstacles.
        </p>

        <ChipGroup style={{ marginBottom: 20 }}>
          {ABANDON_REASONS.map(r => (
            <Chip
              key={r.value}
              label={r.label}
              selected={(ah.reasons ?? []).includes(r.value)}
              onToggle={() => toggleReason(r.value)}
              dark={dark} primary={primary}
            />
          ))}
        </ChipGroup>

        <AINote
          dark={dark} primary={primary}
          text="This data feeds the Churn Risk Engine — queried and exposed internally as 'focus reasons'."
        />

        <div style={{ marginTop: 20 }}>
          <SectionLabel label="How do you prefer to progress?" dark={dark}/>
          <SegmentedRow
            options={INTENSITY_OPTIONS}
            value={ah.preferred_intensity ?? 'moderate'}
            onChange={v => setAH({ ...ah, preferred_intensity: v as PreferredIntensity })}
            dark={dark} primary={primary}
          />
        </div>

        {/* Churn risk signals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {([
            { key: 'had_negative_experience', label: 'I had negative workout experiences' },
            { key: 'fear_of_injury',           label: "I'm afraid of getting injured"            },
            { key: 'felt_gym_constraint',      label: 'I feel embarrassed at the gym'    },
          ] as { key: keyof ProfileAbandonHistory; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setAH({ ...ah, [key]: !ah[key] })} style={{
              width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12,
              background: ah[key] ? `${primary}14` : surfRaised(dark),
              border: `1.5px solid ${ah[key] ? primary : borderSubtle(dark)}`,
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              color: ah[key] ? primary : textPri(dark), cursor: 'pointer',
              transition: 'background .15s, border-color .15s',
            }}>
              {label}
            </button>
          ))}
        </div>

        <TextArea
          label="What helps with consistency?"
          value={ah.what_helped_consistency ?? ''}
          onChange={v => setAH({ ...ah, what_helped_consistency: v })}
          dark={dark} primary={primary}
          placeholder="e.g.: Morning training, training partner, seeing progress..."
          rows={2}
        />
        <TextArea
          label="What disrupted your routine before?"
          value={ah.what_disrupted_routine ?? ''}
          onChange={v => setAH({ ...ah, what_disrupted_routine: v })}
          dark={dark} primary={primary}
          placeholder="e.g.: Work trip, injury, lack of time..."
          rows={2}
        />

        <VoiceOption
          dark={dark} primary={primary}
          note="You can tell us in your own words."
          onClick={() => setVoiceOpen(true)}
        />

        <div style={{ flex: 1 }}/>
        <WizardFooter onNext={onNext} onSaveLater={onSaveLater} dark={dark} primary={primary}/>

        {voiceOpen && (
          <WizardVoiceOverlay
            dark={dark} primary={primary}
            context="Tell us about your history"
            onConfirm={(text) => {
              setAH({ ...ah, voice_note: text });
              setVoiceOpen(false);
              onNext();
            }}
            onClose={() => setVoiceOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={handleBack} dark={dark} primary={primary}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        History and relationship<br/>with movement
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        To understand experience, adherence patterns, and what got in your way.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <SectionLabel label="Current frequency" dark={dark}/>
          <SegmentedRow
            options={FREQUENCY_OPTIONS}
            value={mh.frequency ?? ''}
            onChange={v => setMH({ ...mh, frequency: v as TrainingFrequency })}
            dark={dark} primary={primary}
          />
        </div>

        <div>
          <SectionLabel label="Current level" dark={dark}/>
          <SegmentedRow
            options={LEVEL_OPTIONS}
            value={mh.fitness_level ?? ''}
            onChange={v => setMH({ ...mh, fitness_level: v as FitnessLevelV2 })}
            dark={dark} primary={primary}
          />
        </div>

        <SliderField
          label="Typical frequency"
          value={mh.weekly_frequency ?? 3}
          min={1} max={7} unit="×/week"
          onChange={v => setMH({ ...mh, weekly_frequency: v })}
          dark={dark} primary={primary}
        />

        <div>
          <SectionLabel label="Practiced modalities" dark={dark}/>
          <ChipGroup>
            {MODALITIES.map(m => (
              <Chip
                key={m.value}
                label={m.label}
                selected={(mh.modalities ?? []).includes(m.value)}
                onToggle={() => toggleModality(m.value)}
                dark={dark} primary={primary}
              />
            ))}
          </ChipGroup>
        </div>

        {/* Abandon toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: textPri(dark) }}>
              Have you abandoned a workout before?
            </div>
            {mh.abandoned_before && (
              <div style={{ fontSize: 12, color: textSec(dark), marginTop: 2 }}>
                You can detail this in the next step.
              </div>
            )}
          </div>
          <Toggle
            on={mh.abandoned_before ?? false}
            onChange={v => setMH({ ...mh, abandoned_before: v })}
            primary={primary} dark={dark}
          />
        </div>
      </div>

      <div style={{ flex: 1 }}/>
      <WizardFooter
        onNext={handleNext} onSaveLater={onSaveLater}
        nextDisabled={!mh.frequency || !mh.fitness_level}
        dark={dark} primary={primary}
      />
    </div>
  );
}
