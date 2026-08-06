import { describe, expect, it } from 'vitest';
import { isJsonObject, isJsonValueWithinLimit } from './requestSize';

describe('isJsonValueWithinLimit', () => {
  it('bounds serialized JSON and fails closed for cyclic input', () => {
    expect(isJsonValueWithinLimit({ transcript: 'x'.repeat(20) }, 64)).toBe(true);
    expect(isJsonValueWithinLimit({ transcript: 'x'.repeat(64) }, 64)).toBe(false);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(isJsonValueWithinLimit(cyclic, 8_000)).toBe(false);
  });
});

describe('isJsonObject', () => {
  it('accepts only a JSON object as the request root', () => {
    expect(isJsonObject({ transcript: 'ok' })).toBe(true);
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject('payload')).toBe(false);
    expect(isJsonObject(null)).toBe(false);
  });
});
