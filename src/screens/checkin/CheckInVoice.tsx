import React from 'react';
import { useTranslation } from 'react-i18next';
import { textPri, textSec, textMute, surfRaised, borderSubtle, primaryBtn, outlineBtn } from '../../theme';
import { Spinner } from '../../ui';
import { friendlyError } from '../../lib/friendlyError';
import { cleanupVoiceNote } from '../../lib/cleanupVoiceNote';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import type { CheckInVoice as CheckInVoiceData } from '../../types/checkin-v2';

interface CheckInVoiceProps {
  dark:     boolean;
  primary:  string;
  userName?: string | undefined;
  onSubmit: (data: CheckInVoiceData) => void;
  onBack:   () => void;
}

type ParseState = 'idle' | 'parsing' | 'done' | 'error';

export function CheckInVoice({ dark, primary, userName, onSubmit, onBack }: CheckInVoiceProps) {
  const { t: tr } = useTranslation();
  const [parseState, setParseState] = React.useState<ParseState>('idle');
  const [parseError, setParseError] = React.useState('');
  const [manualText, setManualText] = React.useState<string | null>(null);

  const { supported, listening, transcript, interim, start, stop } = useSpeechRecognition({
    onError: type => {
      if (type === 'not-allowed') setParseError(tr('checkin.voice.errMicDenied'));
      else if (type === 'no-speech') setParseError(tr('checkin.voice.errNoSpeech'));
      else setParseError(tr('checkin.voice.errMic'));
    },
  });

  const toggleMic = () => {
    if (listening) { stop(); return; }
    setManualText(null);
    start();
  };

  const displayText = manualText ?? transcript;
  const fullText = displayText + (interim ? ` ${interim}` : '');
  const canSubmit = fullText.trim().length > 0 && parseState !== 'parsing';

  const handleSubmit = async () => {
    const raw = fullText.trim();
    if (!raw) return;

    setParseState('parsing');
    setParseError('');

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 20_000);

    try {
      const cleaned = await cleanupVoiceNote(raw);

      const res = await fetch('/api/parse-voice', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transcript: cleaned }),
        signal:  ctrl.signal,
      });

      const json = await res.json() as { extracted?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'parse failed');

      const { extracted } = json as { extracted: Record<string, unknown> };
      clearTimeout(timeout);
      setParseState('done');
      onSubmit({ transcript: cleaned, ai_extracted: extracted });
    } catch (err: unknown) {
      setParseState('error');
      void friendlyError(err, tr);
      setParseError(tr('checkin.voice.errAnalyze'));
    } finally {
      clearTimeout(timeout);
    }
  };

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {userName && (
        <div style={{ marginBottom: 12, padding: '5px 12px', borderRadius: 999, background: '#10B98122', border: '1px solid #10B98155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', letterSpacing: '.06em', textTransform: 'uppercase' }}>{tr('checkin.voice.viewing')}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>{userName.split(' ')[0]}</span>
        </div>
      )}

      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, marginBottom: 16 }}>
        {tr('checkin.voice.kicker')}
      </div>

      <h2 style={{
        margin: '0 0 6px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 28, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        {tr('checkin.voice.title')}
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 24px', lineHeight: 1.55 }}>
        {tr('checkin.voice.sub')}
      </p>

      {/* Transcription box */}
      <div style={{
        flex: 1, padding: '14px 16px', borderRadius: 14, marginBottom: 20, minHeight: 160,
        background: surfRaised(dark),
        border: `1.5px solid ${listening ? primary : borderSubtle(dark)}`,
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'border-color .2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: textMute(dark) }}>
            {tr('checkin.voice.transcriptionLabel')}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
            color: listening ? '#ef4444' : textMute(dark),
          }}>
            {listening ? tr('checkin.voice.recording') : tr('checkin.voice.waiting')}
          </span>
        </div>

        <textarea
          value={displayText}
          onChange={e => setManualText(e.target.value)}
          placeholder={tr('checkin.voice.placeholder')}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 14, color: textPri(dark), fontFamily: 'inherit',
            lineHeight: 1.6, resize: 'none', minHeight: 120,
          }}
        />

        {interim && (
          <p style={{ margin: 0, fontSize: 12, color: textMute(dark), fontStyle: 'italic' }}>
            {interim}
          </p>
        )}
      </div>

      {/* Mic button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16, gap: 10 }}>
        {!supported && (
          <p style={{ fontSize: 11.5, color: textMute(dark), textAlign: 'center', margin: '0 0 8px' }}>
            {tr('checkin.voice.unsupported')}
          </p>
        )}
        {supported && (
          <button
            onClick={toggleMic}
            style={{
              width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
              background: listening
                ? 'radial-gradient(circle at 40% 35%, #ef4444, #b91c1c)'
                : 'radial-gradient(circle at 40% 35%, #5eead4, #0891b2)',
              border: 'none',
              boxShadow: listening
                ? '0 0 0 14px rgba(239,68,68,.12), 0 8px 24px rgba(239,68,68,.35)'
                : `0 0 0 14px ${primary}18, 0 8px 28px ${primary}45`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .25s, box-shadow .25s',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#0E1A2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="9"  y1="22" x2="15" y2="22"/>
            </svg>
          </button>
        )}
        {supported && (
          <span style={{ fontSize: 11.5, color: textMute(dark) }}>
            {listening ? tr('checkin.voice.tapStop') : tr('checkin.voice.tapSpeak')}
          </span>
        )}
      </div>

      {/* Example */}
      <div style={{
        padding: '10px 14px', borderRadius: 10, marginBottom: parseError ? 10 : 24,
        background: `${primary}0C`, border: `1px solid ${primary}22`,
      }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: primary }}>{tr('checkin.voice.exPrefix')}</span>
        <span style={{ fontSize: 12, color: textSec(dark), lineHeight: 1.5, fontStyle: 'italic' }}>
          {`"${tr('checkin.voice.example')}"`}
        </span>
      </div>

      {parseError && (
        <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 16, textAlign: 'center' }}>{parseError}</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {parseState === 'error' && (
          <button
            onClick={() => { setParseState('idle'); setParseError(''); }}
            style={{ ...outlineBtn(primary), padding: '15px 20px' }}
          >
            {tr('checkin.voice.tryAgain')}
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ ...primaryBtn(primary), opacity: canSubmit ? 1 : 0.45 }}
        >
          {parseState === 'parsing' ? (
            <><Spinner color="#0E1A2B"/> {tr('checkin.voice.analyzing')}</>
          ) : (
            tr('checkin.voice.confirm')
          )}
        </button>
        <button onClick={onBack} style={{ ...outlineBtn(primary), padding: '15px 20px' }}>
          {tr('checkin.voice.back')}
        </button>
      </div>
    </div>
  );
}
