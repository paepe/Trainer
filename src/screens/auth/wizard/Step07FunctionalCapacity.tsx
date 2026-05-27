import React from 'react';
import { textPri, textSec } from '../../../theme';
import { WizardHeader, WizardFooter, SegmentedRow, Chip, ChipGroup, AINote, SectionLabel } from './atoms';
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

export function Step07FunctionalCapacity({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, stepNum, totalSteps }: WizardStepProps) {
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
    <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <WizardHeader stepNum={stepNum} totalSteps={totalSteps} onBack={onBack} dark={dark} primary={primary}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Functional capacity<br/>and accessibility
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        Movement capability before training. Let's ensure the plan is realistic.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <SectionLabel label="Mobility" dark={dark}/>
          <SegmentedRow options={MOBILITY_OPTS} value={fc.mobility ?? ''} onChange={v => set({ mobility: v as MobilityLevel })} dark={dark} primary={primary}/>
        </div>

        <div>
          <SectionLabel label="Balance" dark={dark}/>
          <SegmentedRow options={BALANCE_OPTS} value={fc.balance ?? ''} onChange={v => set({ balance: v as BalanceLevel })} dark={dark} primary={primary}/>
        </div>

        <div>
          <SectionLabel label="Autonomy" dark={dark}/>
          <SegmentedRow options={AUTONOMY_OPTS} value={fc.autonomy ?? ''} onChange={v => set({ autonomy: v as AutonomyLevel })} dark={dark} primary={primary}/>
        </div>

        <div>
          <SectionLabel label="Effort tolerance" dark={dark}/>
          <SegmentedRow options={EFFORT_OPTS} value={fc.effort_tolerance ?? ''} onChange={v => set({ effort_tolerance: v as EffortTolerance })} dark={dark} primary={primary}/>
        </div>

        <div>
          <SectionLabel label="Usual pain level" dark={dark}/>
          <SegmentedRow options={PAIN_OPTS} value={fc.pain_level ?? ''} onChange={v => set({ pain_level: v as PainLevel })} dark={dark} primary={primary}/>
        </div>

        <div>
          <SectionLabel label="Access to training environment" dark={dark}/>
          <SegmentedRow options={ACCESS_OPTS} value={fc.access_level ?? ''} onChange={v => set({ access_level: v as AccessLevel })} dark={dark} primary={primary}/>
        </div>

        <div>
          <SectionLabel label="Support resources you use" dark={dark}/>
          <ChipGroup>
            {SUPPORT_RESOURCES.map(r => (
              <Chip
                key={r.value}
                label={r.label}
                selected={(fc.support_resources ?? []).includes(r.value)}
                onToggle={() => toggleSupport(r.value)}
                dark={dark} primary={primary}
                disabled={r.value !== 'none' && (fc.support_resources ?? []).includes('none')}
              />
            ))}
          </ChipGroup>
        </div>

        <div>
          <SectionLabel label="How do you prefer to receive instructions?" dark={dark}/>
          <ChipGroup>
            {INSTRUCTION_FORMATS.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                selected={(fc.instruction_format ?? []).includes(f.value)}
                onToggle={() => toggleFormat(f.value)}
                dark={dark} primary={primary}
              />
            ))}
          </ChipGroup>
        </div>

        <AINote
          dark={dark} primary={primary}
          text="This data generates the Functional Capacity Profile and filters exercises — for example, if you cannot bend your knees, fewer floor exercises will be prescribed."
        />
      </div>

      <div style={{ flex: 1 }}/>
      <WizardFooter
        onNext={onNext} onSaveLater={onSaveLater}
        nextDisabled={!canAdvance}
        dark={dark} primary={primary}
      />
    </div>
  );
}
