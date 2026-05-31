import React from 'react';
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

export const Step03Fitness: React.FC<Step03Props> = ({ data, onChange }) => (
  <div>
    <StepHeader
      idx={3} total={12}
      title="Seu nível físico atual"
      sub="Sua referência pessoal de condicionamento."
    />
    <Hint>Não o dos alunos — o seu próprio nível de condicionamento hoje.</Hint>

    <LevelPicker
      value={data.level}
      onChange={level => onChange({ level })}
      items={FITNESS_LEVELS as unknown as { value: number; label: string; sub: string }[]}
    />

    <PrivacyNote tone="optional">
      Este dado calibra a intensidade de referência dos treinos que você prescreve,
      sem expor suas informações pessoais aos alunos.
    </PrivacyNote>
  </div>
);
