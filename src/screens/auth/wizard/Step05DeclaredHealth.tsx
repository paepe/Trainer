import React from 'react';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import { WizardVoiceOverlay } from './WizardVoiceOverlay';
import type { WizardStepProps } from './types';
import type { HealthCategory } from '../../../types/profile-v2';

const CATEGORIES: { value: HealthCategory; label: string }[] = [
  { value: 'cardiovascular',       label: 'Cardiovascular'         },
  { value: 'metabolic',            label: 'Metabolic'              },
  { value: 'renal',                label: 'Renal'                  },
  { value: 'respiratory',          label: 'Respiratory'           },
  { value: 'musculoskeletal',      label: 'Musculoskeletal'     },
  { value: 'neurological',         label: 'Neurological'            },
  { value: 'chronic_pain',         label: 'Chronic pain'            },
  { value: 'emotional_health',     label: 'Emotional health'        },
  { value: 'pregnancy_postpartum', label: 'Pregnancy or postpartum'  },
  { value: 'post_operative',       label: 'Post-operative'         },
  { value: 'physical_disability',  label: 'Physical disability'     },
  { value: 'other',                label: 'Other condition'         },
];

const HIGH_RISK: HealthCategory[] = [
  'cardiovascular', 'respiratory', 'neurological', 'post_operative',
];

type Disclosure = 'yes' | 'no' | 'prefer_not';

export function Step05DeclaredHealth({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const dh = data.declared_health ?? { has_condition: null, categories: [], free_text: '' };
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const disclosure: Disclosure =
    dh.has_condition === null   ? 'prefer_not' :
    dh.has_condition === false  ? 'no'         : 'yes';

  const setDisclosure = (v: Disclosure) => {
    const has = v === 'yes' ? true : v === 'no' ? false : null;
    onUpdate({ declared_health: { ...dh, has_condition: has, categories: has ? dh.categories : [] } });
  };

  const toggleCategory = (v: HealthCategory) => {
    const next = dh.categories?.includes(v)
      ? dh.categories.filter(x => x !== v)
      : [...(dh.categories ?? []), v];
    onUpdate({ declared_health: { ...dh, categories: next } });
  };

  const hasHighRisk = dh.categories?.some(c => HIGH_RISK.includes(c));

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader currentStep={stepNum} stepPrefix="BLOCK" totalSteps={totalSteps} onBack={onBack} badge="sensitive" title="Declared Health"  />

      
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        The system <strong style={{ color: textPri(dark) }}>does not diagnose</strong>. It only uses what you declare
        to adapt the plan safely.
      </p>

      {/* Disclosure choice */}
      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Is there any condition to consider?</Typography>
      <VStack gap={8} style={{ marginBottom: 20 }}>
        {([
          { v: 'yes',        label: 'Yes, what are they'       },
          { v: 'no',         label: 'Not applicable'    },
          { v: 'prefer_not', label: 'Prefer not to say' },
        ] as { v: Disclosure; label: string }[]).map(o => {
          const on = disclosure === o.v;
          return (
            <button key={o.v} onClick={() => setDisclosure(o.v)} style={{
              padding: '13px 16px', borderRadius: 14, textAlign: 'left',
              background: on ? `${primary}1a` : surfRaised(dark),
              border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              color: on ? primary : textPri(dark), cursor: 'pointer',
            }}>
              {o.label}
            </button>
          );
        })}
      </VStack>

      {/* Category multi-select — shown only when "yes" */}
      {disclosure === 'yes' && (
        <>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Categories</Typography>
          <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
            {CATEGORIES.map(c => (
              <Chip
                key={c.value}
                label={c.label}
                active={(dh.categories ?? []).includes(c.value)}
                onClick={() => toggleCategory(c.value)}
              />
            ))}
          </HStack>

          <TextInput multiline
            label="Free note"
            value={dh.free_text ?? ''}
            onChange={v => onUpdate({ declared_health: { ...dh, free_text: v } })}
            placeholder="e.g.: Knee surgery in 2023, cleared for weight training"
            rows={3}
          />

          {hasHighRisk && (
            <div style={{ marginTop: 14 }}>
              <Alert isAI variant="warning"
                text="Sensitive data. Check these points to validate operational restrictions — recommend conservative progression."
              />
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <VoiceOption
              note="Tell us about your condition in your own words."
              onClick={() => setVoiceOpen(true)}
            />
          </div>
        </>
      )}

      <Spacer />
      <WizardFooter onNext={onNext} onSave={onSaveLater} saving={saving}/>

      {voiceOpen && (
        <WizardVoiceOverlay dark={dark} primary={primary}
          context="Tell us about your health"
          onConfirm={(text) => {
            onUpdate({ declared_health: { ...dh, voice_note: text } });
            setVoiceOpen(false);
            onNext();
          }}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </VStack>
  );
}
