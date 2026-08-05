import { describe, expect, it } from 'vitest';
import { isWorkoutRequestWithinLimit, MAX_WORKOUT_REQUEST_CHARS } from './generate-workout';

describe('generate-workout — request size guard', () => {
  it('accepts normal input and rejects oversized payloads before generation', () => {
    expect(isWorkoutRequestWithinLimit({ checkin: { energy: 7 } })).toBe(true);
    expect(isWorkoutRequestWithinLimit({ padding: 'x'.repeat(MAX_WORKOUT_REQUEST_CHARS) })).toBe(false);
  });
});
