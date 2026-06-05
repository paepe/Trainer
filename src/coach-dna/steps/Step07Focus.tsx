import React from 'react';
import { useTranslation } from 'react-i18next';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { FOCUS_ITEMS } from '../constants';
import { THEME_VARS as DARK }        from '../../theme/tokens';
import type { CoachDNAFocus } from '../../types/coach-dna';

interface Step07Props {
  focus:    CoachDNAFocus;
  onChange: (focus: CoachDNAFocus) => void;
}

export const Step07Focus: React.FC<Step07Props> = ({ focus, onChange }) => {
  const { t: tr } = useTranslation();
  const itemLabel = (key: string) => tr(`coachDna.step07.items.${key}`);
  return (
  <div>
    <StepHeader
      idx={7} total={12}
      title={tr('coachDna.step07.title')}
      sub={tr('coachDna.step07.sub')}
      badge={tr('coachDna.step07.badge')}
    />
    <Hint>{tr('coachDna.step07.hint')}</Hint>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {FOCUS_ITEMS.map(item => {
        const val = focus[item.key as keyof CoachDNAFocus];
        return (
          <div key={item.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK.textPri }}>{itemLabel(item.key)}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: item.color,
                minWidth: 24, textAlign: 'right',
              }}>{val}</span>
            </div>
            <input
              type="range" min={0} max={10} step={1} value={val}
              onChange={e => onChange({ ...focus, [item.key]: Number(e.target.value) })}
              style={{ width: '100%', accentColor: item.color, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: DARK.textMute }}>{tr('coachDna.step07.notPriority')}</span>
              <span style={{ fontSize: 10, color: DARK.textMute }}>{tr('coachDna.step07.centralPillar')}</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
  );
};
