import React from 'react';
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
  const { t } = useTheme();
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
        title="How and where you train"
        sub="Methods, environments, and general intensity that define your practice."
      />
      <Hint>Select everything that's part of your daily repertoire.</Hint>

      <FieldLabel hint="multiple choice">Training methods</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {METHODS.map(m => (
          <Chip
            key={m} label={m} multi
            active={data.methods.includes(m)}
            onClick={() => toggleMethod(m)}
            color={t.accent}
          />
        ))}
      </div>

      <FieldLabel hint="multiple choice">Preferred environments</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {ENVIRONMENTS.map(e => (
          <Chip
            key={e} label={e} multi
            active={data.envs.includes(e)}
            onClick={() => toggleEnv(e)}
            color={t.primarySoft}
          />
        ))}
      </div>

      <FieldLabel>General intensity</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {INTENSITY.map(i => (
          <Chip
            key={i} label={i}
            active={data.intensity === i}
            onClick={() => onChange({ intensity: i })}
            color={t.accent}
          />
        ))}
      </div>

      <PrivacyNote>
        Methods and environments guide the AI Coach Engine in selecting exercises and formats compatible with your context.
      </PrivacyNote>
    </div>
  );
};
