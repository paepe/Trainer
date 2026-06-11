import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { THEME_VARS as DARK } from '../../theme/tokens';
import { useTheme } from '../../contexts';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface VoiceBarProps {
  onTranscript: (text: string) => void;
  /** Fired when dictation stops — the right moment to clean up the accumulated text. */
  onStop?:      () => void;
  hint?:        string;
}

export const VoiceBar: React.FC<VoiceBarProps> = ({
  onTranscript,
  onStop,
  hint = undefined,
}) => {
  const { t: theme } = useTheme();
  const { t: tr } = useTranslation();
  const effectiveHint = hint ?? tr('coachDna.components.voiceBar.dictateHint');
  const [error, setError] = React.useState<string | null>(null);
  const lastFinalLenRef = React.useRef(0);

  const { supported, listening: active, interim, start, stop: stopRecognition } = useSpeechRecognition({
    onResult: final => {
      const delta = final.slice(lastFinalLenRef.current);
      lastFinalLenRef.current = final.length;
      if (delta) onTranscript(delta);
    },
    onEnd: () => onStop?.(),
    onError: type => {
      if (type === 'not-allowed') setError(tr('coachDna.components.voiceBar.micDenied'));
      else if (type === 'no-speech') setError(tr('coachDna.components.voiceBar.noSpeech'));
      else setError(tr('coachDna.components.voiceBar.speechError'));
    },
  });

  const toggle = () => {
    if (!supported) return;
    if (active) { stopRecognition(); return; }
    setError(null);
    lastFinalLenRef.current = 0;
    start();
  };

  if (!supported) return null;

  return (
    <div
      onClick={active ? stopRecognition : undefined}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '12px 14px',
        borderRadius: 12,
        border:       `1.5px dashed ${active ? theme.accent : DARK.border}`,
        background:   active ? `${theme.accent}08` : 'transparent',
        marginBottom: 8,
        cursor:       active ? 'pointer' : 'default',
        transition:   'border-color .2s, background .2s',
      }}
    >
      {/* mic / stop button */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {active && (
          <div style={{
            position:     'absolute', inset: -6,
            borderRadius: '50%',
            border:       `2px solid ${theme.accent}`,
            animation:    'dna-pulse-ring 1.2s ease-out infinite',
            pointerEvents: 'none',
          }}/>
        )}
        <button
          onClick={e => { e.stopPropagation(); toggle(); }}
          title={active ? tr('coachDna.components.voiceBar.stopRecording') : tr('coachDna.components.voiceBar.startRecording')}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: active ? theme.accent : DARK.surface,
            color:      active ? '#fff' : DARK.textSec,
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            cursor:     'pointer', flexShrink: 0,
          }}
        >
          <Icon
            name={active ? 'close' : 'mic'}
            size={active ? 14 : 16}
            color={active ? '#fff' : DARK.textSec}
          />
        </button>
      </div>

      {/* wave bars / label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {active ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                background: theme.accent,
                animation:  `dna-wave .8s ease-in-out ${i * 0.12}s infinite`,
                height:     '60%',
              }}/>
            ))}
            {interim && (
              <span style={{
                marginLeft: 8, fontSize: 11.5, color: DARK.textSec,
                fontStyle: 'italic', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {interim}
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: DARK.textMute }}>
            {error ?? effectiveHint}
          </span>
        )}
      </div>

      {/* right action label */}
      {active ? (
        <div style={{
          display:      'flex', alignItems: 'center', gap: 5,
          padding:      '4px 10px', borderRadius: 20,
          background:   `${theme.accent}22`,
          border:       `1px solid ${theme.accent}55`,
          flexShrink:   0,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: theme.accent,
            animation:  'dna-dot-blink .9s ease-in-out infinite',
          }}/>
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
            textTransform: 'uppercase', color: theme.accent,
            whiteSpace: 'nowrap',
          }}>
            {tr('coachDna.components.voiceBar.stop')}
          </span>
        </div>
      ) : null}

      <style>{`
        @keyframes dna-wave       { 0%,100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
        @keyframes dna-pulse-ring { 0% { transform: scale(.9); opacity:.7; } 100% { transform: scale(1.7); opacity:0; } }
        @keyframes dna-dot-blink  { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
      `}</style>
    </div>
  );
};
