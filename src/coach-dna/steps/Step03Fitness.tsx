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
      title="Your current fitness level"
      sub="Your personal conditioning reference point."
    />
    <Hint>Not your clients' — your own fitness level today.</Hint>

    <LevelPicker
      value={data.level}
      onChange={level => onChange({ level })}
      items={FITNESS_LEVELS as unknown as { value: number; label: string; sub: string }[]}
    />

    <PrivacyNote tone="optional">
      This calibrates the reference intensity of the workouts you prescribe,
      without exposing your personal information to clients.
    </PrivacyNote>
  </div>
);
