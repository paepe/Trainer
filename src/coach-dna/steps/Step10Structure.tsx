import React from 'react';
import { StepHeader }    from '../components/StepHeader';
import { Hint }          from '../components/Hint';
import { Icon }          from '../../components/Icon';
import { STRUCTURE_BLOCKS } from '../constants';
import { DARK }          from '../../theme/tokens';

interface Step10Props {
  structure: string[];
  onChange:  (order: string[]) => void;
}

export const Step10Structure: React.FC<Step10Props> = ({ structure, onChange }) => {
  const move = (idx: number, dir: -1 | 1) => {
    const next   = [...structure];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[idx]    as string;
    const b = next[target] as string;
    next[idx]    = b;
    next[target] = a;
    onChange(next);
  };

  return (
    <div>
      <StepHeader
        idx={10} total={12}
        title="Estrutura da sessão"
        sub="Defina a ordem padrão dos blocos de uma sessão típica."
        badge="Coach DNA"
      />
      <Hint>Reordene os blocos com as setas. Esta sequência será o template padrão dos seus treinos.</Hint>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {structure.map((key, idx) => {
          const block = STRUCTURE_BLOCKS.find(b => b.key === key);
          if (!block) return null;
          return (
            <div
              key={key}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: DARK.surface, border: `1.5px solid ${DARK.border}`,
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                background: `${block.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: block.color,
              }}>
                {idx + 1}
              </div>

              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: `${block.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={block.icon} size={16} color={block.color}/>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DARK.textPri }}>{block.label}</div>
                <div style={{ fontSize: 11, color: DARK.textMute, marginTop: 1 }}>{block.sub}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: 'none',
                    background: idx === 0 ? 'transparent' : DARK.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: idx === 0 ? 'default' : 'pointer',
                    opacity: idx === 0 ? 0.2 : 1,
                  }}
                >
                  <Icon name="arrowUp" size={12} color={DARK.textSec}/>
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === structure.length - 1}
                  style={{
                    width: 26, height: 26, borderRadius: 6, border: 'none',
                    background: idx === structure.length - 1 ? 'transparent' : DARK.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: idx === structure.length - 1 ? 'default' : 'pointer',
                    opacity: idx === structure.length - 1 ? 0.2 : 1,
                  }}
                >
                  <Icon name="arrowDown" size={12} color={DARK.textSec}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
