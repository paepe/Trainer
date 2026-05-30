let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function beep(freq: number, duration: number, gain = 0.25, startOffset = 0): void {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.frequency.value = freq;
  osc.type = 'sine';
  const t = c.currentTime + startOffset;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

// Short high beep — set confirmed
export function soundSetDone(): void {
  beep(880, 0.12);
}

// Double beep — rest timer ended, back to work
export function soundRestEnd(): void {
  beep(660, 0.1);
  beep(880, 0.18, 0.3, 0.18);
}

// Ascending chord — workout complete
export function soundWorkoutDone(): void {
  beep(523, 0.18);
  beep(659, 0.18, 0.25, 0.22);
  beep(784, 0.35, 0.3,  0.44);
}
