import { afterEach, describe, expect, it } from 'vitest';
import { setVizProfile, vizSignature, vizSignatureDeep } from './runtimeProfile';

describe('runtime visual signature', () => {
  afterEach(() => setVizProfile(false, 'free'));

  it.each([
    ['free', '#2DD4E0', '#0F8C85'],
    ['ai_fitness', '#4ADE80', '#219653'],
    ['ai_performance', '#A78BFA', '#7C5CCB'],
  ])('uses the %s skin in data visualization', (planKey, primary, deep) => {
    setVizProfile(false, planKey);
    expect(vizSignature()).toBe(primary);
    expect(vizSignatureDeep()).toBe(deep);
  });

  it('preserves the Trainer coral signature', () => {
    setVizProfile(true, 'ai_performance');
    expect(vizSignature()).toBe('#EF5B3C');
    expect(vizSignatureDeep()).toBe('#C23B22');
  });
});
