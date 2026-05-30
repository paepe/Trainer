type HapticPattern = 'notification' | 'set_done' | 'rest_end' | 'workout_done';

const PATTERNS: Record<HapticPattern, number[]> = {
  notification:  [50, 50, 80],
  set_done:      [60],
  rest_end:      [80, 60, 80],
  workout_done:  [60, 40, 60, 40, 120],
};

export function vibrate(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate(PATTERNS[pattern]);
}
