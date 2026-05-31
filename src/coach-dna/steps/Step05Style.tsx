import React from 'react';
import { Icon }        from '../../components/Icon';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { PrivacyNote } from '../components/PrivacyNote';
import { BRAND, DARK } from '../../theme/tokens';
import { STYLES }      from '../constants';

interface Step05Props {
  style:    string[];
  onChange: (style: string[]) => void;
}

export const Step05Style: React.FC<Step05Props> = ({ style, onChange }) => {
  const toggle = (key: string) => {
    onChange(
      style.includes(key) ? style.filter(s => s !== key) : [...style, key],
    );
  };

  return (
    <div>
      <StepHeader
        idx={5} total={12}
        title="Estilo de coaching"
        sub="Como você se comporta com seus alunos na prática."
        badge="Coach DNA"
      />
      <Hint>Escolha todos os estilos que descrevem sua abordagem.</Hint>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {STYLES.map(s => {
          const active = style.includes(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              style={{
                display:      'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                padding:      '16px 10px',
                borderRadius: 14,
                border:       `1.5px solid ${active ? BRAND.accent : DARK.border}`,
                background:   active ? `${BRAND.accent}1c` : DARK.surface,
                cursor:       'pointer', fontFamily: 'inherit',
                transition:   'background .15s, border-color .15s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: active ? `${BRAND.accent}22` : `${DARK.border}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={s.icon} size={18} color={active ? BRAND.accent : DARK.textSec}/>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: active ? DARK.textPri : DARK.textSec,
                textAlign: 'center', lineHeight: 1.3,
              }}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <PrivacyNote tone="coach">
        O estilo de coaching é a parte mais decisiva do seu DNA — define o tom e a voz dos treinos gerados.
      </PrivacyNote>
    </div>
  );
};
