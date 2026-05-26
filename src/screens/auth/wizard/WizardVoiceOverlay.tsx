import React from 'react';
import { primaryBtn, surfRaised, textPri, textSec, textMute, borderSubtle } from '../../../theme';
import { Icon } from '../../../components/Icon';

// ─── Detect browser Speech Recognition ────────────────────────────────────────
const SpeechRecognitionAPI =
  (typeof window !== 'undefined')
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null;

interface WizardVoiceOverlayProps {
  dark:       boolean;
  primary:    string;
  /** Label shown at the top: e.g. "Objetivos" */
  context:    string;
  /** Called with the final transcribed / typed text */
  onConfirm:  (text: string) => void;
  onClose:    () => void;
}

/**
 * Full-screen voice + text overlay for Profile Wizard steps.
 *
 * Priority order:
 *   1. Web Speech API (if browser supports it) → real microphone
 *   2. Fallback textarea → manual typing
 *
 * On confirm the text is passed to onConfirm() so the parent step
 * can either pre-fill its own fields or ship the text to the AI.
 */
export function WizardVoiceOverlay({
  dark, primary, context, onConfirm, onClose,
}: WizardVoiceOverlayProps) {
  const [text,       setText]       = React.useState('');
  const [listening,  setListening]  = React.useState(false);
  const [supported,  setSupported]  = React.useState(!!SpeechRecognitionAPI);
  const [error,      setError]      = React.useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  // ── Web Speech API ────────────────────────────────────────────────────────
  const startListening = () => {
    if (!SpeechRecognitionAPI) { setSupported(false); return; }
    setError(null);

    const rec = new SpeechRecognitionAPI();
    rec.lang           = 'pt-BR';
    rec.continuous     = true;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join('');
      setText(transcript);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        setError('Permissão de microfone negada. Use o campo de texto abaixo.');
        setSupported(false);
      } else {
        setError('Erro ao capturar áudio. Tente novamente ou use o campo de texto.');
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  React.useEffect(() => () => recognitionRef.current?.stop(), []);

  const canConfirm = text.trim().length > 3;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: dark ? 'rgba(8,14,24,0.92)' : 'rgba(0,0,0,0.55)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-end',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn .2s ease',
    }}>
      {/* Sheet */}
      <div style={{
        width: '100%', maxWidth: 520,
        background: dark ? '#0E1A2B' : '#fff',
        borderRadius: '24px 24px 0 0',
        padding: '28px 24px 36px',
        boxShadow: '0 -8px 40px rgba(0,0,0,.35)',
        animation: 'slideUp .25s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: primary, marginBottom: 2 }}>
              🎙 Entrada por voz
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: textPri(dark) }}>
              {context}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
            aria-label="Fechar"
          >
            <Icon name="more" size={20} color={textMute(dark)} stroke={2}/>
          </button>
        </div>

        {/* Instruction */}
        <p style={{ fontSize: 13, color: textSec(dark), margin: '0 0 20px', lineHeight: 1.55 }}>
          Fale ou escreva com suas próprias palavras. A IA organiza as informações antes de salvar — você confirma tudo antes.
        </p>

        {/* ── Mic button (if supported) ── */}
        {supported && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <button
              onClick={listening ? stopListening : startListening}
              aria-label={listening ? 'Parar gravação' : 'Iniciar gravação de voz'}
              style={{
                width: 76, height: 76, borderRadius: '50%',
                background: listening ? '#EF5B3C22' : `${primary}22`,
                border: `2.5px solid ${listening ? '#EF5B3C' : primary}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: listening ? '0 0 0 8px rgba(239,91,60,.15)' : 'none',
                transition: 'all .2s',
              }}
            >
              {listening ? (
                /* Stop icon */
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#EF5B3C" stroke="none">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                /* Mic icon */
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke={primary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
              )}
            </button>
            <div style={{ fontSize: 12, color: listening ? '#EF5B3C' : textMute(dark), marginTop: 8, fontWeight: 600 }}>
              {listening ? '● A gravar… toque para parar' : 'Toque para falar'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 10, marginBottom: 14,
            background: '#EF5B3C18', border: '1px solid #EF5B3C44',
            fontSize: 12, color: '#EF5B3C', lineHeight: 1.45,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Textarea (always visible — fallback or supplement) ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em',
            textTransform: 'uppercase', color: textMute(dark), marginBottom: 6,
          }}>
            {supported ? 'Texto transcrito (pode editar)' : 'Escreva aqui'}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={
              supported
                ? 'O texto aparece aqui enquanto fala, ou escreva directamente…'
                : 'Descreva com suas próprias palavras…'
            }
            rows={4}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 12,
              background: surfRaised(dark),
              border: `1.5px solid ${borderSubtle(dark)}`,
              color: textPri(dark), fontSize: 14, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box', resize: 'none',
              lineHeight: 1.55,
            }}
          />
          <div style={{ fontSize: 11, color: textMute(dark), marginTop: 4, textAlign: 'right' }}>
            {text.trim().length} caracteres
          </div>
        </div>

        {/* ── Actions ── */}
        <button
          onClick={() => { if (canConfirm) onConfirm(text.trim()); }}
          disabled={!canConfirm}
          style={{ ...primaryBtn(primary), marginBottom: 10, opacity: canConfirm ? 1 : 0.45 }}
        >
          Confirmar e continuar →
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px', borderRadius: 999,
            background: 'transparent', border: 'none',
            color: textMute(dark), fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>
    </div>
  );
}
