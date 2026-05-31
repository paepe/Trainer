import React, { useState } from 'react';
import { DARK, BRAND } from '../theme/tokens';
import { Icon } from '../components/Icon';

export interface VoiceOptionProps {
  note?: string;
  onClick: () => void;
}

export function VoiceOption({ note, onClick }: VoiceOptionProps) {
  const [hover, setHover] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Voice input"
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 14,
        background: hover ? `${BRAND.primary}12` : DARK.surface,
        border: `1.5px dashed ${hover ? BRAND.primary : DARK.borderSoft}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'inherit',
        cursor: 'pointer',
        color: DARK.textPri,
        transition: 'background .15s, border-color .15s',
        marginTop: 16,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: `${BRAND.primary}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="mic" size={15} color={BRAND.primary} stroke={2.2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.primary, marginBottom: 1 }}>
          Speak to the app
        </div>
        <div style={{ fontSize: 10.5, color: DARK.textMute, lineHeight: 1.4 }}>
          {note ?? 'Voice input available on this block — AI will structure it for you.'}
        </div>
      </div>
      <Icon name="chevR" size={16} color={BRAND.primary} stroke={2} />
    </button>
  );
}
