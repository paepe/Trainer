import React from 'react';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { DNAField }    from '../components/DNAField';
import { Chip }        from '../components/Chip';
import { VoiceBar }    from '../components/VoiceBar';
import { PhotoSlot }   from '../components/PhotoSlot';
import { FieldLabel }  from '../components/FieldLabel';
import { BRAND }       from '../../theme/tokens';
import type { CoachDNAIdentity } from '../../types/coach-dna';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

interface Step01Props {
  data:      CoachDNAIdentity;
  onChange:  (v: Partial<CoachDNAIdentity>) => void;
  trainerId: string;
}

export const Step01Identity: React.FC<Step01Props> = ({ data, onChange, trainerId }) => (
  <div>
    <StepHeader
      idx={1} total={12}
      title="Trainer identity"
      sub="Basic information that identifies your presence in the app."
    />
    <Hint>How do you introduce yourself to your clients?</Hint>

    <PhotoSlot
      value={data.photo}
      onChange={photo => onChange({ photo })}
      name={data.name}
      trainerId={trainerId}
    />

    <DNAField
      label="Full name"
      value={data.name}
      onChange={name => onChange({ name })}
      placeholder="e.g. Rafael Mendes"
    />

    <VoiceBar
      onTranscript={text => onChange({ name: (data.name + ' ' + text).trim() })}
      hint="Dictate name to AI"
    />

    <div style={{ marginBottom: 16 }}>
      <FieldLabel>Gender</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {GENDERS.map(g => (
          <Chip
            key={g}
            label={g}
            active={data.gender === g}
            onClick={() => onChange({ gender: g })}
            color={BRAND.accent}
          />
        ))}
      </div>
    </div>

    <DNAField
      label="Age"
      value={data.age}
      onChange={age => onChange({ age })}
      placeholder="34"
      type="number"
      suffix="yrs"
      optional
    />
  </div>
);
