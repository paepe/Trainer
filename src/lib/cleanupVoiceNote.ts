// Shared helper: sends a raw voice transcript to /api/cleanup-voice-note, which uses
// an AI pass to collapse "stutter echo" (on-device speech engines re-emitting
// overlapping fragments mid-sentence) into the coherent text the speaker meant.
// Falls back silently to the original text on any failure.

const isNative =
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
const API_BASE = isNative ? (import.meta.env.VITE_API_URL ?? '') : '';

export async function cleanupVoiceNote(transcript: string): Promise<string> {
  const trimmed = transcript.trim();
  if (!trimmed) return trimmed;
  try {
    const res = await fetch(`${API_BASE}/api/cleanup-voice-note`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ transcript: trimmed }),
    });
    if (!res.ok) return trimmed;
    const data = await res.json() as { cleaned?: string };
    return data.cleaned?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}
