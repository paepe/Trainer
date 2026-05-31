import React from 'react';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, VoiceOption, Alert, Typography, HStack, VStack, Spacer, TextInput, Slider, ChoiceCard, Chip, SegmentedControl, Toggle } from '../../../ui';
import { Icon } from '../../../components/Icon';
import type { WizardStepProps } from './types';
import type { TrainingLocation, Equipment, AccessibilityCondition } from '../../../types/profile-v2';

const LOCATIONS: { value: TrainingLocation; label: string; icon: string }[] = [
  { value: 'home',   label: 'Home',       icon: 'pin'    },
  { value: 'gym',    label: 'Gym',        icon: 'dumbbell'},
  { value: 'studio', label: 'Studio',     icon: 'grad'   },
  { value: 'park',   label: 'Park',       icon: 'map'    },
  { value: 'condo',  label: 'Condo',      icon: 'pin'    },
  { value: 'online', label: 'Online',     icon: 'activity'},
];

const EQUIPMENT_OPTS: { value: Equipment; label: string }[] = [
  { value: 'dumbbells',       label: 'Dumbbells'        },
  { value: 'resistance_bands',label: 'Resistance bands' },
  { value: 'barbell',         label: 'Barbell'          },
  { value: 'bench',           label: 'Bench'            },
  { value: 'treadmill',       label: 'Treadmill'        },
  { value: 'bike',            label: 'Bike'             },
  { value: 'machines',        label: 'Machines'         },
  { value: 'kettlebell',      label: 'Kettlebell'       },
  { value: 'cable_pulley',    label: 'Cable/pulley'     },
  { value: 'none',            label: 'None'             },
];

const ACCESSIBILITY_OPTS: { value: AccessibilityCondition; label: string }[] = [
  { value: 'wheelchair_accessible', label: 'Wheelchair accessible' },
  { value: 'support_bars',          label: 'Support bars'          },
  { value: 'safe_floor',            label: 'Safe floor'            },
  { value: 'private_space',         label: 'Training privacy'     },
  { value: 'companion_available',   label: 'Companion available'   },
  { value: 'adapted_equipment',     label: 'Adapted equipment'     },
];

export function Step11Environment({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const env = data.environment ?? { locations: [], equipment: [], accessibility: [] };

  const toggleLocation = (v: TrainingLocation) => {
    const cur = env.locations ?? [];
    onUpdate({ environment: { ...env, locations: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] } });
  };

  const toggleEquipment = (v: Equipment) => {
    let next: Equipment[];
    if (v === 'none') {
      next = env.equipment?.includes(v) ? [] : [v];
    } else {
      const without = (env.equipment ?? []).filter(x => x !== 'none');
      next = without.includes(v) ? without.filter(x => x !== v) : [...without, v];
    }
    onUpdate({ environment: { ...env, equipment: next } });
  };

  const toggleAccessibility = (v: AccessibilityCondition) => {
    const cur = env.accessibility ?? [];
    onUpdate({ environment: { ...env, accessibility: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] } });
  };

  const canAdvance = (env.locations?.length ?? 0) > 0;

  return (
    <VStack padding="20px 24px 28px" style={{ minHeight: '100%' }}>
      <WizardHeader title="Wizard Block" currentStep={stepNum} stepPrefix="BLOCK" totalSteps={totalSteps} onBack={onBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Where you train,<br/>in real life
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        To prescribe exercises that depend on the equipment, space, and support you have.
      </p>

      {/* Locations — card grid */}
      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Possible locations</Typography>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
        {LOCATIONS.map(loc => {
          const on = (env.locations ?? []).includes(loc.value);
          return (
            <button key={loc.value} onClick={() => toggleLocation(loc.value)} style={{
              padding: '14px 10px', borderRadius: 14, textAlign: 'center',
              background: on ? `${primary}1a` : surfRaised(dark),
              border: `1.5px solid ${on ? primary : borderSubtle(dark)}`,
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background .15s, border-color .15s',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: on ? primary : `${primary}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px',
              }}>
                <Icon name={loc.icon} size={16} color={on ? '#0E1A2B' : primary} stroke={2}/>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: on ? primary : textPri(dark) }}>
                {loc.label}
              </div>
            </button>
          );
        })}
      </div>

      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Available equipment</Typography>
      <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
        {EQUIPMENT_OPTS.map(e => (
          <Chip
            key={e.value}
            label={e.label}
            active={(env.equipment ?? []).includes(e.value)}
            onClick={() => toggleEquipment(e.value)}
            disabled={e.value !== 'none' && (env.equipment ?? []).includes('none')}
          />
        ))}
      </HStack>

      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>Accessibility conditions</Typography>
      <HStack style={{ flexWrap: 'wrap' }} gap={8}>
        {ACCESSIBILITY_OPTS.map(a => (
          <Chip
            key={a.value}
            label={a.label}
            active={(env.accessibility ?? []).includes(a.value)}
            onClick={() => toggleAccessibility(a.value)}
          />
        ))}
      </HStack>

      <Spacer />
      <WizardFooter
        onNext={onNext}
        nextDisabled={!canAdvance}
        onSave={onSaveLater} saving={saving}
      />
    </VStack>
  );
}
