import React from 'react';
import i18n, { BCP47 } from '../i18n';

// Web Speech API — defined locally to avoid lib.dom variance across tsconfigs.
interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results:     SpeechRecognitionResultList;
}

interface RecognitionLike {
  lang:           string;
  continuous:     boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror:  ((e: Event) => void) | null;
  onend:    (() => void) | null;
  start(): void;
  stop():  void;
}
interface RecognitionCtor { new(): RecognitionLike }

interface WindowWithSpeechRecognition {
  SpeechRecognition?:        RecognitionCtor;
  webkitSpeechRecognition?:  RecognitionCtor;
}

function getSpeechRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as WindowWithSpeechRecognition;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Mobile (Android/iOS) speech engines tend to be on-device and re-emit
// overlapping/rephrased interim results for the same utterance, which reads
// as an "echo" (repeated words/phrases) in the live transcript. Desktop
// engines stream cleaner interim results. So: live preview only on desktop;
// on mobile we wait for finalized segments only.
const isMobileDevice = (typeof navigator !== 'undefined')
  && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export type SpeechRecognitionErrorType = 'not-allowed' | 'no-speech' | 'other';

export interface UseSpeechRecognitionOptions {
  /** Keep listening across pauses and accumulate finalized segments (default true). */
  continuous?: boolean;
  /** Called with the final accumulated transcript whenever it grows. */
  onResult?: (transcript: string, interim: string) => void;
  /** Called once recognition stops, with the final transcript captured so far. */
  onEnd?: (transcript: string) => void;
  onError?: (type: SpeechRecognitionErrorType) => void;
}

export interface UseSpeechRecognitionResult {
  supported:  boolean;
  listening:  boolean;
  transcript: string;
  interim:    string;
  start: () => void;
  stop:  () => void;
}

/**
 * Unified Web Speech API wrapper shared across voice-input modules.
 * Accumulates only finalized segments — replaying `e.results` each tick
 * would otherwise re-append finished phrases and sound like an echo
 * ("nome nome completo"). On mobile, interim results are suppressed
 * entirely since on-device engines re-emit overlapping interim phrases.
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionResult {
  const { continuous = true, onResult, onEnd, onError } = options;

  const [transcript, setTranscript] = React.useState('');
  const [interim,    setInterim]    = React.useState('');
  const [listening,  setListening]  = React.useState(false);

  const recognitionRef = React.useRef<RecognitionLike | null>(null);
  const finalTextRef   = React.useRef('');
  const endedRef       = React.useRef(false);

  const supported = !!getSpeechRecognitionCtor();

  const start = React.useCallback(() => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) return;

    finalTextRef.current = '';
    endedRef.current = false;
    setTranscript('');
    setInterim('');

    const rec = new SR();
    rec.lang           = BCP47[i18n.language as keyof typeof BCP47] ?? 'en-US';
    rec.continuous     = continuous;
    rec.interimResults = continuous ? !isMobileDevice : false;
    if (!continuous) rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result) continue;
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) finalTextRef.current += chunk;
        else inter += chunk;
      }
      const final = finalTextRef.current;
      setTranscript(final);
      setInterim(inter);
      onResult?.(final, inter);
    };

    rec.onerror = (e: Event) => {
      const errType = (e as unknown as { error?: string }).error;
      const mapped: SpeechRecognitionErrorType =
        errType === 'not-allowed' ? 'not-allowed'
        : errType === 'no-speech' ? 'no-speech'
        : 'other';
      onError?.(mapped);
      setListening(false);
      // Some browsers don't fire `onend` after `onerror` — ensure cleanup
      // callbacks still run so consumers don't get stuck mid-dictation.
      if (!endedRef.current) {
        endedRef.current = true;
        setInterim('');
        onEnd?.(finalTextRef.current);
      }
    };

    rec.onend = () => {
      setListening(false);
      setInterim('');
      if (!endedRef.current) {
        endedRef.current = true;
        onEnd?.(finalTextRef.current);
      }
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [continuous, onResult, onEnd, onError]);

  const stop = React.useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  React.useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, listening, transcript, interim, start, stop };
}
