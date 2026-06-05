import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const toneLabel = (tone: string) => tr(`coachDna.step11.tones.${tone}`);
  const translatedClients = tr('coachDna.step11.clients', { returnObjects: true }) as unknown as string[];

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
        title={tr('coachDna.step11.title')}
        sub={tr('coachDna.step11.sub')}
        badge={tr('coachDna.step11.badge')}
      />
      <Hint>{tr('coachDna.step11.hint')}</Hint>

      <FieldLabel hint={tr('coachDna.step11.toneHint')}>{tr('coachDna.step11.toneLabel')}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {TONES.map(tone => (
          <Chip
            key={tone}
            label={toneLabel(tone.toLowerCase())}
            active={audience.tone.includes(tone)}
            color={theme.accent}
            multi
            onClick={() => toggleTone(tone)}
          />
        ))}
      </div>

      <FieldLabel hint={tr('coachDna.step11.clientsHint')}>{tr('coachDna.step11.clientsLabel')}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CLIENTS.map((c, i) => (
          <Chip
            key={c}
            label={translatedClients[i] ?? c}
            active={audience.clients.includes(c)}
            color={theme.primarySoft}
            multi
            onClick={() => toggleClient(c)}
          />
        ))}
      </div>
    </div>
  );
};
