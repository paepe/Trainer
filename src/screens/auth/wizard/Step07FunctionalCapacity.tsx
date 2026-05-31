import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import type { WizardStepProps } from './types';
import type {
  MobilityLevel, BalanceLevel, AutonomyLevel, EffortTolerance,
  PainLevel, AccessLevel, SupportResource, InstructionFormat,
} from '../../../types/profile-v2';

const MOBILITY_OPTS: { value: MobilityLevel; label: string }[] = [
  { value: 'low',      label: 'Low'    },
  { value: 'moderate', label: 'Moderate' },
  { value: 'good',     label: 'Good'      },
];
const BALANCE_OPTS: { value: BalanceLevel; label: string }[] = [
  { value: 'unstable', label: 'Unstable'  },
  { value: 'assisted', label: 'Assisted' },
  { value: 'stable',   label: 'Stable'   },
];
const AUTONOMY_OPTS: { value: AutonomyLevel; label: string }[] = [
  { value: 'assisted',     label: 'Assisted'     },
  { value: 'partial',      label: 'Partial'        },
  { value: 'independent',  label: 'Independent'   },
];
const EFFORT_OPTS: { value: EffortTolerance; label: string }[] = [
  { value: 'low',      label: 'Low'    },
  { value: 'moderate', label: 'Moderate' },
  { value: 'good',     label: 'Good'      },
];
const SUPPORT_RESOURCES: { value: SupportResource; label: string }[] = [
  { value: 'wheelchair',    label: 'Wheelchair' },
  { value: 'cane',          label: 'Cane'          },
  { value: 'walker',        label: 'Walker'          },
  { value: 'prosthesis',    label: 'Prosthesis'          },
  { value: 'nearby_support',label: 'Nearby support'    },
  { value: 'none',          label: 'None'           },
];
const PAIN_OPTS: { value: PainLevel; label: string }[] = [
  { value: 'none',     label: 'None'   },
  { value: 'mild',     label: 'Mild'      },
  { value: 'moderate', label: 'Moderate'  },
  { value: 'severe',   label: 'Severe'   },
];
const ACCESS_OPTS: { value: AccessLevel; label: string }[] = [
  { value: 'full',    label: 'Full'     },
  { value: 'partial', label: 'Partial'   },
  { value: 'limited', label: 'Limited'  },
];
const INSTRUCTION_FORMATS: { value: InstructionFormat; label: string }[] = [
  { value: 'visual',          label: 'Visual'             },
  { value: 'auditory',        label: 'Auditory'           },
  { value: 'simplified_text', label: 'Simplified text' },
  { value: 'vibration',       label: 'Vibration'           },
  { value: 'standard',        label: 'Standard'             },
];

export function Step07FunctionalCapacity({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const fc = data.functional_capacity ?? {
    mobility: undefined as unknown as MobilityLevel,
    balance: undefined as unknown as BalanceLevel,
    autonomy: undefined as unknown as AutonomyLevel,
    effort_tolerance: undefined as unknown as EffortTolerance,
    support_resources: [],
    instruction_format: [],
  };

  const set = (patch: Partial<typeof fc>) => onUpdate({ functional_capacity: { ...fc, ...patch } });

  const toggleSupport = (v: SupportResource) => {
    let next: SupportResource[];
    if (v === 'none') {
      next = fc.support_resources?.includes(v) ? [] : [v];
    } else {
      const without = (fc.support_resources ?? []).filter(x => x !== 'none');
      next = without.includes(v) ? without.filter(x => x !== v) : [...without, v];
    }
    set({ support_resources: next });
  };

  const toggleFormat = (v: InstructionFormat) => {
    const cur = fc.instruction_format ?? [];
    set({ instruction_format: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };

  const canAdvance = !!(fc.mobility && fc.balance && fc.autonomy && fc.effort_tolerance);

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader title="Wizard Block" currentStep={stepNum} stepPrefix="BLOCK" totalSteps={totalSteps} onBack={onBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Functional capacity<br/>and accessibility
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        Movement capability before training. Let's ensure the plan is realistic.
      </p>

      <VStack gap={20}>
        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Mobility</Typography>
          <SegmentedControl options={MOBILITY_OPTS} value={fc.mobility ?? ''} onChange={v => set({ mobility: v as MobilityLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Balance</Typography>
          <SegmentedControl options={BALANCE_OPTS} value={fc.balance ?? ''} onChange={v => set({ balance: v as BalanceLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Autonomy</Typography>
          <SegmentedControl options={AUTONOMY_OPTS} value={fc.autonomy ?? ''} onChange={v => set({ autonomy: v as AutonomyLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Effort tolerance</Typography>
          <SegmentedControl options={EFFORT_OPTS} value={fc.effort_tolerance ?? ''} onChange={v => set({ effort_tolerance: v as EffortTolerance })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Usual pain level</Typography>
          <SegmentedControl options={PAIN_OPTS} value={fc.pain_level ?? ''} onChange={v => set({ pain_level: v as PainLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Access to training environment</Typography>
          <SegmentedControl options={ACCESS_OPTS} value={fc.access_level ?? ''} onChange={v => set({ access_level: v as AccessLevel })}/>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Support resources you use</Typography>
          <HStack style={{ flexWrap: 'wrap' }} gap={8}>
            {SUPPORT_RESOURCES.map(r => (
              <Chip
                key={r.value}
                label={r.label}
                active={(fc.support_resources ?? []).includes(r.value)}
                onClick={() => toggleSupport(r.value)}
                disabled={r.value !== 'none' && (fc.support_resources ?? []).includes('none')}
              />
            ))}
          </HStack>
        </div>

        <div>
          <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>How do you prefer to receive instructions?</Typography>
          <HStack style={{ flexWrap: 'wrap' }} gap={8}>
            {INSTRUCTION_FORMATS.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                active={(fc.instruction_format ?? []).includes(f.value)}
                onClick={() => toggleFormat(f.value)}
              />
            ))}
          </HStack>
        </div>

        <Alert isAI
          text="This data generates the Functional Capacity Profile and filters exercises — for example, if you cannot bend your knees, fewer floor exercises will be prescribed."
        />
      </VStack>

      <Spacer />
      <WizardFooter
        onNext={onNext}
        nextDisabled={!canAdvance}
        onSave={onSaveLater} saving={saving}
      />
    </VStack>
  );
}
