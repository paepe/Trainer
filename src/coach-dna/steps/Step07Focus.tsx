import React from 'react';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { FOCUS_ITEMS } from '../constants';
import { THEME_VARS as DARK }        from '../../theme/tokens';
import type { CoachDNAFocus } from '../../types/coach-dna';

interface Step07Props {
  focus:    CoachDNAFocus;
  onChange: (focus: CoachDNAFocus) => void;
}

export const Step07Focus: React.FC<Step07Props> = ({ focus, onChange }) => (
  <div>
    <StepHeader
      idx={7} total={12}
      title="Training focus"
      sub="How much weight does each physical capacity carry in your method?"
      badge="Coach DNA"
    />
    <Hint>Distribute emphasis across physical qualities. 0 = not a priority, 10 = central pillar.</Hint>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {FOCUS_ITEMS.map(item => {
        const val = focus[item.key as keyof CoachDNAFocus];
        return (
          <div key={item.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK.textPri }}>{item.label}</span>
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
              <span style={{ fontSize: 10, color: DARK.textMute }}>0 – Not a priority</span>
              <span style={{ fontSize: 10, color: DARK.textMute }}>10 – Central pillar</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
