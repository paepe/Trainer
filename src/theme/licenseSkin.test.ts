import { describe, expect, it } from 'vitest';
import { getClientLicenseSkin } from './licenseSkin';

describe('getClientLicenseSkin', () => {
  it.each([
    ['free', '#2DD4E0'],
    ['ai_fitness', '#4ADE80'],
    ['ai_performance', '#A78BFA'],
  ])('maps %s to its approved client accent', (planKey, primary) => {
    expect(getClientLicenseSkin(planKey).primary).toBe(primary);
  });

  it('keeps unknown and legacy client plans on the Free skin', () => {
    expect(getClientLicenseSkin('legacy')).toEqual(getClientLicenseSkin('free'));
  });
});
