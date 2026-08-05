import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput } from '@/ui';
import { StepHeader }  from '../components/StepHeader';
import { Hint }        from '../components/Hint';
import { FieldLabel }  from '../components/FieldLabel';
import { VoiceBar }    from '../components/VoiceBar';
import { cleanupVoiceNote } from '../../lib/cleanupVoiceNote';
import { PrivacyNote } from '../components/PrivacyNote';
import { MOTTO_EXAMPLES } from '../constants';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';
import type { CoachDNAPhilosophy } from '../../types/coach-dna';

interface Step12Props {
  philosophy: CoachDNAPhilosophy;
  onChange:   (philosophy: CoachDNAPhilosophy) => void;
}

export const Step12Philosophy: React.FC<Step12Props> = ({ philosophy, onChange }) => {
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();

  // Buffers raw dictation chunks for the current session; cleaned up as one pass on stop
  // (rather than per-chunk) so the AI sees full sentences and the field's prior content
  // — which may already be clean, typed text — isn't re-sent for cleanup each time.
  const sessionRawRef = React.useRef('');
  const sessionBaseRef = React.useRef('');

  const handleTranscript = (text: string) => {
    if (!sessionRawRef.current) sessionBaseRef.current = philosophy.prompt;
    sessionRawRef.current = sessionRawRef.current ? `${sessionRawRef.current} ${text}` : text;
    onChange({ ...philosophy, prompt: `${sessionBaseRef.current}${sessionBaseRef.current ? ' ' : ''}${sessionRawRef.current}`.trim() });
  };

  const handleStop = () => {
    const raw = sessionRawRef.current.trim();
    if (!raw) return;
    const base = sessionBaseRef.current;
    sessionRawRef.current = '';
    sessionBaseRef.current = '';
    void cleanupVoiceNote(raw, 'coach_dna').then(cleaned => {
      onChange({ ...philosophy, prompt: `${base}${base ? ' ' : ''}${cleaned}`.trim() });
    });
  };

  return (
  <div>
    <StepHeader
      idx={12} total={12}
      title={tr('coachDna.step12.title')}
      sub={tr('coachDna.step12.sub')}
      badge={tr('coachDna.step12.badge')}
    />
    <Hint>{tr('coachDna.step12.hint')}</Hint>

    <FieldLabel hint={tr('coachDna.step12.mottoHint')}>{tr('coachDna.step12.mottoLabel')}</FieldLabel>
    <TextInput
      value={philosophy.motto}
      placeholder={tr('coachDna.step12.mottoPlaceholder')}
      onChange={v => onChange({ ...philosophy, motto: v })}
    />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24, marginTop: -4 }}>
      {MOTTO_EXAMPLES.map(m => (
        <button
          key={m}
          onClick={() => onChange({ ...philosophy, motto: m })}
          style={{
            padding: '4px 10px', borderRadius: 20,
            border: `1px solid ${philosophy.motto === m ? theme.accent : DARK.border}`,
            background: philosophy.motto === m ? `${theme.accent}20` : 'transparent',
            color: philosophy.motto === m ? theme.accent : DARK.textMute,
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'border-color .15s, background .15s',
          }}
        >{m}</button>
      ))}
    </div>

    <FieldLabel hint={tr('coachDna.step12.promptHint')}>{tr('coachDna.step12.promptLabel')}</FieldLabel>
    <VoiceBar
      hint={tr('coachDna.step12.promptDictateHint')}
      onTranscript={handleTranscript}
      onStop={handleStop}
    />
    <textarea
      value={philosophy.prompt}
      onChange={e => onChange({ ...philosophy, prompt: e.target.value })}
      placeholder={tr('coachDna.step12.promptPlaceholder')}
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
      {tr('coachDna.step12.privacyNote')}
    </PrivacyNote>
  </div>
  );
};
