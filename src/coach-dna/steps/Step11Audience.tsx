import React from 'react';
import { StepHeader } from '../components/StepHeader';
import { Hint }       from '../components/Hint';
import { FieldLabel } from '../components/FieldLabel';
import { Chip }       from '../components/Chip';
import { TONES, CLIENTS } from '../constants';
import { useTheme }   from '../../contexts';
import type { CoachDNAAudience } from '../../types/coach-dna';

interface Step11Props {
  audience: CoachDNAAudience;
  onChange: (audience: CoachDNAAudience) => void;
}

export const Step11Audience: React.FC<Step11Props> = ({ audience, onChange }) => {
  const { t } = useTheme();
  const toggleTone = (tone: string) => {
    const next = audience.tone.includes(tone)
      ? audience.tone.filter(x => x !== tone)
      : [...audience.tone, tone];
    onChange({ ...audience, tone: next });
  };
  const toggleClient = (c: string) => {
    const next = audience.clients.includes(c)
      ? audience.clients.filter(x => x !== c)
      : [...audience.clients, c];
    onChange({ ...audience, clients: next });
  };

  return (
    <div>
      <StepHeader
        idx={11} total={12}
        title="Audience & tone"
        sub="Who you train and how you communicate."
        badge="Coach DNA"
      />
      <Hint>Select all client profiles you work with and the predominant tone of your communication.</Hint>

      <FieldLabel hint="multi">Communication tone</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {TONES.map(tone => (
          <Chip
            key={tone}
            label={tone}
            active={audience.tone.includes(tone)}
            color={t.accent}
            multi
            onClick={() => toggleTone(tone)}
          />
        ))}
      </div>

      <FieldLabel hint="multi">Client profile</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CLIENTS.map(c => (
          <Chip
            key={c}
            label={c}
            active={audience.clients.includes(c)}
            color={t.primarySoft}
            multi
            onClick={() => toggleClient(c)}
          />
        ))}
      </div>
    </div>
  );
};
