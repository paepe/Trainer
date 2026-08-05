// Shared helper: sends a raw voice transcript to /api/cleanup-voice-note, which uses
// an AI pass to collapse "stutter echo" (on-device speech engines re-emitting
// overlapping fragments mid-sentence) into the coherent text the speaker meant.
// Falls back silently to the original text on any failure.

import { authHeaders } from './authHeaders';

const isNative =
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
const API_BASE = isNative ? (import.meta.env.VITE_API_URL ?? '') : '';

export type VoiceCleanupPurpose = 'checkin' | 'coach_dna' | 'trainer_workout_note' | 'onboarding';

export async function cleanupVoiceNote(
  transcript: string,
  purpose: VoiceCleanupPurpose,
): Promise<string> {
  const trimmed = transcript.trim();
  if (!trimmed) return trimmed;
  try {
    const res = await fetch(`${API_BASE}/api/cleanup-voice-note`, {
      method:  'POST',
      headers: await authHeaders(),
      body:    JSON.stringify({ transcript: trimmed, purpose }),
    });
    if (!res.ok) return trimmed;
    const data = await res.json() as { cleaned?: string };
    return data.cleaned?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}
