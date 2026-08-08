import { describe, expect, it } from 'vitest';
import { effectiveInvitationStatus, toggleAllManagedSelection, toggleManagedSelection, visibleTrainerInvitations } from './trainerInvitationManagement';

const now = new Date().toISOString();
const past = new Date(Date.now() - 60_000).toISOString();
const fixtures = [
  { id: '1', invited_name: 'Paulo Eduardo Peres', invited_email: 'paulo@example.test', status: 'sent', created_at: '2026-08-02T00:00:00Z', expires_at: now },
  { id: '2', invited_name: 'Gonçalo Silva', invited_email: 'goncalo@example.test', status: 'sent', created_at: '2026-08-01T00:00:00Z', expires_at: past },
  { id: '3', invited_name: 'Ana Lima', invited_email: 'ana@example.test', status: 'declined', created_at: '2026-08-03T00:00:00Z', expires_at: now, archived_at: '2026-08-04T00:00:00Z' },
  { id: '4', invited_name: 'Carlos Silva', invited_email: 'carlos@example.test', status: 'accepted', created_at: '2026-08-04T00:00:00Z', expires_at: now, archived_at: '2026-08-05T00:00:00Z' },
  { id: '5', invited_name: 'Beatriz Lima', invited_email: 'beatriz@example.test', status: 'sent', created_at: '2026-08-05T00:00:00Z', expires_at: past, archived_at: '2026-08-06T00:00:00Z' },
];

describe('trainer invitation management', () => {
  it('normalises accent-insensitive multi-term search and derives expiry', () => {
    expect(effectiveInvitationStatus(fixtures[1]!)).toBe('expired');
    expect(visibleTrainerInvitations(fixtures, 'active', 'all', 'paulo peres', 'recent').map(inv => inv.id)).toEqual(['1']);
    expect(visibleTrainerInvitations(fixtures, 'active', 'expired', 'goncalo', 'recent').map(inv => inv.id)).toEqual(['2']);
  });

  it('filters status within the archived scope and applies deterministic ordering', () => {
    expect(visibleTrainerInvitations(fixtures, 'archived', 'all', '', 'recent').map(inv => inv.id)).toEqual(['5', '4', '3']);
    expect(visibleTrainerInvitations(fixtures, 'archived', 'accepted', '', 'recent').map(inv => inv.id)).toEqual(['4']);
    expect(visibleTrainerInvitations(fixtures, 'archived', 'declined', '', 'recent').map(inv => inv.id)).toEqual(['3']);
    expect(visibleTrainerInvitations(fixtures, 'archived', 'expired', '', 'recent').map(inv => inv.id)).toEqual(['5']);
    expect(visibleTrainerInvitations(fixtures, 'active', 'all', '', 'oldest').map(inv => inv.id)).toEqual(['2', '1']);
  });

  it('supports individual and all-or-none selection without phantom selection', () => {
    const selected = toggleManagedSelection(new Set<string>(), '1');
    expect([...selected]).toEqual(['1']);
    expect([...toggleAllManagedSelection(selected, ['1', '2'])].sort()).toEqual(['1', '2']);
    expect([...toggleAllManagedSelection(new Set(['1', '2']), ['1', '2'])]).toEqual([]);
    expect([...toggleAllManagedSelection(new Set(['1']), [])]).toEqual(['1']);
  });
});
