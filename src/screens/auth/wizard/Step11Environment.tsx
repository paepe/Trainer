import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, surfRaised, borderSubtle } from '../../../theme';
import { WizardHeader, WizardFooter, Typography, HStack, VStack, Spacer, Chip } from '../../../ui';
import { Icon } from '../../../components/Icon';
import type { WizardStepProps } from './types';
import type { TrainingLocation, Equipment, AccessibilityCondition } from '../../../types/profile-v2';

const LOCATION_KEYS: { value: TrainingLocation; icon: string }[] = [
  { value: 'home',   icon: 'pin'    },
  { value: 'gym',    icon: 'dumbbell'},
  { value: 'studio', icon: 'grad'   },
  { value: 'park',   icon: 'map'    },
  { value: 'condo',  icon: 'pin'    },
  { value: 'online', icon: 'activity'},
];

const EQUIP_KEYS: Equipment[] = ['dumbbells', 'resistance_bands', 'barbell', 'bench', 'treadmill', 'bike', 'machines', 'kettlebell', 'cable_pulley', 'none'];
const ACCESSIBILITY_KEYS: AccessibilityCondition[] = ['wheelchair_accessible', 'support_bars', 'safe_floor', 'private_space', 'companion_available', 'adapted_equipment'];

export function Step11Environment({ dark, primary, accent, data, onUpdate, onNext, onBack, onSaveLater, saving, stepNum, totalSteps }: WizardStepProps) {
  const { t: tr } = useTranslation();
  const env = data.environment ?? { locations: [], equipment: [], accessibility: [] };

  const locLabel    = (v: TrainingLocation) => tr(`wizard.step11.locations.${v}`);
  const equipLabel  = (v: Equipment) => tr(`wizard.step11.equipment.${v}`);
  const accessLabel = (v: AccessibilityCondition) => tr(`wizard.step11.accessibility.${v}`);

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
      <WizardHeader title={tr('wizard.step11.title')} currentStep={stepNum} stepPrefix={tr('wizard.blockPrefix')} totalSteps={totalSteps} onBack={onBack}/>

      <h2 style={{
        margin: '0 0 4px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 26, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('wizard.step11.heading1')}<br/>{tr('wizard.step11.heading2')}
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
        {tr('wizard.step11.subheading')}
      </p>

      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step11.locationsLabel')}</Typography>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
        {LOCATION_KEYS.map(loc => {
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
                {locLabel(loc.value)}
              </div>
            </button>
          );
        })}
      </div>

      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step11.equipmentLabel')}</Typography>
      <HStack flexWrap="wrap" gap={10} style={{ marginBottom: 20 }}>
        {EQUIP_KEYS.map(e => (
          <Chip
            key={e}
            label={equipLabel(e)}
            active={(env.equipment ?? []).includes(e)}
            onClick={() => toggleEquipment(e)}
            disabled={e !== 'none' && (env.equipment ?? []).includes('none')}
          />
        ))}
      </HStack>

      <Typography variant="overline" color="muted" style={{ marginBottom: 10 }}>{tr('wizard.step11.accessibilityLabel')}</Typography>
      <HStack style={{ flexWrap: 'wrap' }} gap={8}>
        {ACCESSIBILITY_KEYS.map(a => (
          <Chip
            key={a}
            label={accessLabel(a)}
            active={(env.accessibility ?? []).includes(a)}
            onClick={() => toggleAccessibility(a)}
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
