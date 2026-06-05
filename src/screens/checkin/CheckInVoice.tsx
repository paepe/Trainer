import React from 'react';
import { useTranslation } from 'react-i18next';
import { BCP47 } from '../../i18n';
import { textPri, textSec, textMute, surfRaised, borderSubtle, primaryBtn, outlineBtn } from '../../theme';
import type { CheckInVoice as CheckInVoiceData } from '../../types/checkin-v2';

interface CheckInVoiceProps {
  dark:     boolean;
  primary:  string;
  userName?: string | undefined;
  onSubmit: (data: CheckInVoiceData) => void;
  onBack:   () => void;
}

const EXAMPLE = '"Slept poorly about 5 hours, energy 4 out of 10, mild lower back pain, I have 30 minutes and I\'ll train at home."';

// Web Speech API — defined locally to avoid lib.dom variance across tsconfigs
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror:  ((e: Event) => void) | null;
  onend:    (() => void) | null;
  start(): void;
  stop():  void;
}
interface RecognitionCtor { new(): RecognitionLike }

function getSpeechRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w['SpeechRecognition'] ?? w['webkitSpeechRecognition'] ?? null) as RecognitionCtor | null;
}

type ParseState = 'idle' | 'parsing' | 'done' | 'error';

export function CheckInVoice({ dark, primary, userName, onSubmit, onBack }: CheckInVoiceProps) {
  const { t: tr, i18n } = useTranslation();
  const [transcript, setTranscript] = React.useState('');
  const [interim, setInterim]       = React.useState('');
  const [listening, setListening]   = React.useState(false);
  const [parseState, setParseState] = React.useState<ParseState>('idle');
  const [parseError, setParseError] = React.useState('');
  const recognitionRef = React.useRef<RecognitionLike | null>(null);
  const supported = !!getSpeechRecognition();

  const startListening = () => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.lang = BCP47[i18n.language as keyof typeof BCP47] ?? 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = '';
      let inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) final += r[0]?.transcript ?? '';
        else           inter += r[0]?.transcript ?? '';
      }
      if (final) setTranscript(prev => prev + final);
      setInterim(inter);
    };

    rec.onerror = (e: Event) => {
      setListening(false);
      const errType = (e as any).error as string | undefined;
      if (errType === 'not-allowed')  setParseError(tr('checkin.voice.errMicDenied'));
      else if (errType === 'no-speech') setParseError(tr('checkin.voice.errNoSpeech'));
      else setParseError(tr('checkin.voice.errMic'));
    };
    rec.onend   = () => { setListening(false); setInterim(''); };

    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  };

  const toggleMic = () => {
    if (listening) stopListening();
    else           startListening();
  };

  const handleSubmit = async () => {
    const text = (transcript + ' ' + interim).trim();
    if (!text) return;

    setParseState('parsing');
    setParseError('');

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 20_000);

    try {
      const res = await fetch('/api/parse-voice', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transcript: text }),
        signal:  ctrl.signal,
      });

      const json = await res.json() as { extracted?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'parse failed');

      const { extracted } = json as { extracted: Record<string, unknown> };
      clearTimeout(timeout);
      setParseState('done');
      onSubmit({ transcript: text, ai_extracted: extracted });
    } catch (err: unknown) {
      setParseState('error');
      const msg = err instanceof Error ? err.message : '';
      setParseError(msg || tr('checkin.voice.errAnalyze'));
    } finally {
      clearTimeout(timeout);
    }
  };

  const fullText = transcript + (interim ? ` ${interim}` : '');
  const canSubmit = fullText.trim().length > 0 && parseState !== 'parsing';

  return (
    <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {userName && (
        <div style={{ marginBottom: 12, padding: '5px 12px', borderRadius: 999, background: '#10B98122', border: '1px solid #10B98155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', letterSpacing: '.06em', textTransform: 'uppercase' }}>{tr('checkin.voice.viewing')}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>{userName.split(' ')[0]}</span>
        </div>
      )}

      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, marginBottom: 16 }}>
        SCREEN 02 · VOICE INPUT
      </div>

      <h2 style={{
        margin: '0 0 6px', fontFamily: '"Plus Jakarta Sans",sans-serif',
        fontSize: 28, fontWeight: 700, color: textPri(dark), letterSpacing: '-0.02em',
      }}>
        Speak freely.
      </h2>
      <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 24px', lineHeight: 1.55 }}>
        The AI will transform your response into information to adapt the workout. You confirm before saving.
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
            // LIVE TRANSCRIPTION
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
            color: listening ? '#ef4444' : textMute(dark),
          }}>
            {listening ? tr('checkin.voice.recording') : tr('checkin.voice.waiting')}
          </span>
        </div>

        <textarea
          value={transcript}
          onChange={e => { setTranscript(e.target.value); setInterim(''); }}
          placeholder="Tap the microphone and describe how you're feeling today. You can talk about sleep, energy, pain, fatigue, available time, where you'll train…"
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
            Voice recognition not available in this browser. Type below.
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
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', color: primary }}>Ex.: </span>
        <span style={{ fontSize: 12, color: textSec(dark), lineHeight: 1.5, fontStyle: 'italic' }}>
          {EXAMPLE}
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
            Try again
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ ...primaryBtn(primary), opacity: canSubmit ? 1 : 0.45 }}
        >
          {parseState === 'parsing' ? (
            <><Spinner color="#0E1A2B"/> Analyzing…</>
          ) : (
            'Confirm and calculate →'
          )}
        </button>
        <button onClick={onBack} style={{ ...outlineBtn(primary), padding: '15px 20px' }}>
          ← Back
        </button>
      </div>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: '50%',
      border: `2.5px solid ${color}44`, borderTopColor: color,
      animation: 'spin .6s linear infinite',
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
