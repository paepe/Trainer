import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { Chip }        from '../components/Chip';
import { FieldLabel }  from '../components/FieldLabel';
import { PrivacyNote } from '../components/PrivacyNote';
import { useTheme }    from '../../contexts';
import { METHODS, ENVIRONMENTS, INTENSITY } from '../constants';
import type { CoachDNATraining } from '../../types/coach-dna';

interface Step04Props {
  data:     CoachDNATraining;
  onChange: (v: Partial<CoachDNATraining>) => void;
}

export const Step04Training: React.FC<Step04Props> = ({ data, onChange }) => {
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const translatedMethods = tr('coachDna.step04.methods', { returnObjects: true }) as unknown as string[];
  const translatedEnvs = tr('coachDna.step04.envs', { returnObjects: true }) as unknown as string[];
  const translatedIntensity = tr('coachDna.step04.intensity', { returnObjects: true }) as unknown as string[];

  const toggleMethod = (m: string) => {
    const methods = data.methods.includes(m)
      ? data.methods.filter(x => x !== m)
      : [...data.methods, m];
    onChange({ methods });
  };

  const toggleEnv = (e: string) => {
    const envs = data.envs.includes(e)
      ? data.envs.filter(x => x !== e)
      : [...data.envs, e];
    onChange({ envs });
  };

  return (
    <div>
      <StepHeader
        idx={4} total={12}
        title={tr('coachDna.step04.title')}
        sub={tr('coachDna.step04.sub')}
      />
      <Hint>{tr('coachDna.step04.hint')}</Hint>

      <FieldLabel hint={tr('coachDna.step04.multipleChoice')}>{tr('coachDna.step04.methodsLabel')}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {METHODS.map((m, i) => (
          <Chip
            key={m} label={translatedMethods[i] ?? m} multi
            active={data.methods.includes(m)}
            onClick={() => toggleMethod(m)}
            color={theme.accent}
          />
        ))}
      </div>

      <FieldLabel hint={tr('coachDna.step04.multipleChoice')}>{tr('coachDna.step04.envsLabel')}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {ENVIRONMENTS.map((e, i) => (
          <Chip
            key={e} label={translatedEnvs[i] ?? e} multi
            active={data.envs.includes(e)}
            onClick={() => toggleEnv(e)}
            color={theme.primarySoft}
          />
        ))}
      </div>

      <FieldLabel>{tr('coachDna.step04.intensityLabel')}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {INTENSITY.map((intensity, i) => (
          <Chip
            key={intensity} label={translatedIntensity[i] ?? intensity}
            active={data.intensity === intensity}
            onClick={() => onChange({ intensity })}
            color={theme.accent}
          />
        ))}
      </div>

      <PrivacyNote>
        {tr('coachDna.step04.privacyNote')}
      </PrivacyNote>
    </div>
  );
};
