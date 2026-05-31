import React from 'react';
import { StepHeader } from '../components/StepHeader';
import { Hint }       from '../components/Hint';
import { FieldLabel } from '../components/FieldLabel';
import { Chip }       from '../components/Chip';
import { TONES, CLIENTS } from '../constants';
import { BRAND }      from '../../theme/tokens';
import type { CoachDNAAudience } from '../../types/coach-dna';

interface Step11Props {
  audience: CoachDNAAudience;
  onChange: (audience: CoachDNAAudience) => void;
}

export const Step11Audience: React.FC<Step11Props> = ({ audience, onChange }) => {
  const toggleTone = (t: string) => {
    const next = audience.tone.includes(t)
      ? audience.tone.filter(x => x !== t)
      : [...audience.tone, t];
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
        {TONES.map(t => (
          <Chip
            key={t}
            label={t}
            active={audience.tone.includes(t)}
            color={BRAND.accent}
            multi
            onClick={() => toggleTone(t)}
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
            color={BRAND.primarySoft}
            multi
            onClick={() => toggleClient(c)}
          />
        ))}
      </div>
    </div>
  );
};
