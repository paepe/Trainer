import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { LevelPicker } from '../components/LevelPicker';
import { PrivacyNote } from '../components/PrivacyNote';
import { FITNESS_LEVELS } from '../constants';
import type { CoachDNAFitness } from '../../types/coach-dna';

interface Step03Props {
  data:     CoachDNAFitness;
  onChange: (v: Partial<CoachDNAFitness>) => void;
}

export const Step03Fitness: React.FC<Step03Props> = ({ data, onChange }) => {
  const { t: tr } = useTranslation();
  const levels = FITNESS_LEVELS.map(l => ({
    value: l.value,
    label: tr(`coachDna.step03.levels.${l.value}.label`),
    sub:   tr(`coachDna.step03.levels.${l.value}.sub`),
  }));
  return (
  <div>
    <StepHeader
      idx={3} total={12}
      title={tr('coachDna.step03.title')}
      sub={tr('coachDna.step03.sub')}
    />
    <Hint>{tr('coachDna.step03.hint')}</Hint>

    <LevelPicker
      value={data.level}
      onChange={level => onChange({ level })}
      items={levels as unknown as { value: number; label: string; sub: string }[]}
    />

    <PrivacyNote tone="optional">
      {tr('coachDna.step03.privacyNote')}
    </PrivacyNote>
  </div>
  );
};
