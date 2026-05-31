import React from 'react';
import { TextInput } from '@/ui';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { FieldLabel }  from '../components/FieldLabel';
import { VoiceBar }    from '../components/VoiceBar';
import { PrivacyNote } from '../components/PrivacyNote';
import { MOTTO_EXAMPLES } from '../constants';
import { BRAND, DARK } from '../../theme/tokens';
import type { CoachDNAPhilosophy } from '../../types/coach-dna';

interface Step12Props {
  philosophy: CoachDNAPhilosophy;
  onChange:   (philosophy: CoachDNAPhilosophy) => void;
}

export const Step12Philosophy: React.FC<Step12Props> = ({ philosophy, onChange }) => (
  <div>
    <StepHeader
      idx={12} total={12}
      title="Philosophy & identity"
      sub="The manifesto that guides every workout you create."
      badge="Coach DNA"
    />
    <Hint>This is the most personal block. Write or dictate in your own words.</Hint>

    <FieldLabel hint="optional">Coach motto</FieldLabel>
    <TextInput
      value={philosophy.motto}
      placeholder='e.g. "Train with purpose, recover with intelligence."'
      onChange={v => onChange({ ...philosophy, motto: v })}
    />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24, marginTop: -4 }}>
      {MOTTO_EXAMPLES.map(m => (
        <button
          key={m}
          onClick={() => onChange({ ...philosophy, motto: m })}
          style={{
            padding: '4px 10px', borderRadius: 20,
            border: `1px solid ${philosophy.motto === m ? BRAND.accent : DARK.border}`,
            background: philosophy.motto === m ? `${BRAND.accent}20` : 'transparent',
            color: philosophy.motto === m ? BRAND.accent : DARK.textMute,
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'border-color .15s, background .15s',
          }}
        >{m}</button>
      ))}
    </div>

    <FieldLabel hint="optional">Free prompt — your coach voice for the AI</FieldLabel>
    <VoiceBar
      hint="Dictate your coaching manifesto"
      onTranscript={text =>
        onChange({ ...philosophy, prompt: philosophy.prompt + (philosophy.prompt ? ' ' : '') + text })
      }
    />
    <textarea
      value={philosophy.prompt}
      onChange={e => onChange({ ...philosophy, prompt: e.target.value })}
      placeholder="Describe in your own words how you train, what you value, and how you want the AI to represent your style when generating workouts..."
      rows={6}
      style={{
        width: '100%', padding: '12px 14px', borderRadius: 12,
        border: `1.5px solid ${DARK.border}`, background: DARK.surface,
        color: DARK.textPri, fontSize: 13, fontFamily: 'inherit',
        resize: 'vertical', lineHeight: 1.6, outline: 'none',
        boxSizing: 'border-box', marginBottom: 8,
      }}
    />

    <PrivacyNote tone="coach">
      This prompt is the most powerful context in your DNA — the AI uses these words literally to capture your voice.
    </PrivacyNote>
  </div>
);
