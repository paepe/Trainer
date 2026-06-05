import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '@/ui';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { Chip }        from '../components/Chip';
import { VoiceBar }    from '../components/VoiceBar';
import { PhotoSlot }   from '../components/PhotoSlot';
import { FieldLabel }  from '../components/FieldLabel';
import { useTheme }    from '../../contexts';
import type { CoachDNAIdentity } from '../../types/coach-dna';

interface Step01Props {
  data:      CoachDNAIdentity;
  onChange:  (v: Partial<CoachDNAIdentity>) => void;
  trainerId: string;
}

export const Step01Identity: React.FC<Step01Props> = ({ data, onChange, trainerId }) => {
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const genders = tr('coachDna.step01.genders', { returnObjects: true }) as unknown as string[];
  return (
  <div>
    <StepHeader
      idx={1} total={12}
      title={tr('coachDna.step01.title')}
      sub={tr('coachDna.step01.sub')}
    />
    <Hint>{tr('coachDna.step01.hint')}</Hint>

    <PhotoSlot
      value={data.photo}
      onChange={photo => onChange({ photo })}
      name={data.name}
      trainerId={trainerId}
    />

    <TextInput
      label={tr('coachDna.step01.fullName')}
      value={data.name}
      onChange={name => onChange({ name })}
      placeholder={tr('coachDna.step01.namePlaceholder')}
    />

    <VoiceBar
      onTranscript={text => onChange({ name: (data.name + ' ' + text).trim() })}
      hint={tr('coachDna.components.voiceBar.dictateHint')}
    />

    <div style={{ marginBottom: 16 }}>
      <FieldLabel>{tr('coachDna.step01.gender')}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {genders.map(g => (
          <Chip
            key={g}
            label={g}
            active={data.gender === g}
            onClick={() => onChange({ gender: g })}
            color={theme.accent}
          />
        ))}
      </div>
    </div>

    <TextInput
      label={tr('coachDna.step01.age')}
      value={data.age}
      onChange={age => onChange({ age })}
      placeholder={tr('coachDna.step01.agePlaceholder')}
      type="number"
      suffix={tr('coachDna.step01.ageSuffix')}
      optional
    />
  </div>
  );
};
