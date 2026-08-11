import { describe, expect, it } from 'vitest';
import {
  canArchiveInboxItem,
  inboxCategoryFor,
  isInboxActionable,
  matchesOperationalSearch,
  toggleAllOperationalSelection,
  toggleOperationalSelection,
} from './operationalListManagement';

describe('operational list management', () => {
  it('normalises accent-insensitive, token-based search for reuse by invitations and Inbox', () => {
    expect(matchesOperationalSearch('Paulo Eduardo Pérez', 'paulo perez')).toBe(true);
    expect(matchesOperationalSearch('Paulo Eduardo Pérez', 'eduardo silva')).toBe(false);
  });

  it('keeps selection scoped to the currently visible operational result set', () => {
    const one = toggleOperationalSelection(new Set<string>(), 'a');
    expect([...one]).toEqual(['a']);
    expect([...toggleAllOperationalSelection(one, ['a', 'b'])].sort()).toEqual(['a', 'b']);
    expect([...toggleAllOperationalSelection(new Set(['a', 'b']), ['a', 'b'])]).toEqual([]);
  });

  it('classifies pending Inbox actions before their broader business category', () => {
    const pending = { type: 'trainer_invitation', response: null, expires_at: '2026-12-31T00:00:00.000Z' };
    expect(isInboxActionable(pending, new Date('2026-08-11T00:00:00.000Z'))).toBe(true);
    expect(inboxCategoryFor(pending)).toBe('actionRequired');
    expect(canArchiveInboxItem({ ...pending, read_at: '2026-08-11T00:00:00.000Z' }, new Date('2026-08-11T00:00:00.000Z'))).toBe(false);
  });

  it('allows only read, resolved items to be archived', () => {
    const resolved = { type: 'workout_completed', response: null, expires_at: null, read_at: '2026-08-11T00:00:00.000Z' };
    expect(inboxCategoryFor(resolved)).toBe('plansAndWorkouts');
    expect(canArchiveInboxItem(resolved)).toBe(true);
    expect(canArchiveInboxItem({ ...resolved, read_at: null })).toBe(false);
  });
});
