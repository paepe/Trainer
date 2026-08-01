// Regression coverage for the bug found live 2026-08-01: StartWorkoutScreen
// and WorkoutModeScreen translated every exercise name assuming a fixed
// Portuguese source, even for AI-generated rows already stored in the
// correct locale — silently altering already-correct text (e.g. "Cinta
// rodante" → "Cinta para correr") on every read. This hook groups rows by
// their own recorded name_source_locale and must never call the endpoint
// for a row whose source already matches the target.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' } }),
}));

import { useTranslatedExerciseNamesByRow } from './useTranslatedExerciseNamesByRow';

describe('useTranslatedExerciseNamesByRow', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });

  it('never calls the endpoint for a row whose source already matches the target locale', () => {
    const { result } = renderHook(() => useTranslatedExerciseNamesByRow(
      [{ name: 'Cinta rodante: caminata rápida', name_source_locale: 'es' }],
      'es',
    ));

    expect(result.current({ name: 'Cinta rodante: caminata rápida', name_source_locale: 'es' }))
      .toBe('Cinta rodante: caminata rápida');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('translates a row whose source diverges from the target, using that row\'s own source locale', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { 'Remada Curvada': 'Bent-Over Row' } }),
    });

    const rows = [{ name: 'Remada Curvada', name_source_locale: 'pt' }];
    const { result } = renderHook(() => useTranslatedExerciseNamesByRow(rows, 'en'));

    expect(result.current(rows[0]!)).toBe('Remada Curvada');
    await waitFor(() => expect(result.current(rows[0]!)).toBe('Bent-Over Row'));

    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.sourceLocale).toBe('pt');
    expect(body.targetLocale).toBe('en');
  });

  it('defaults an untagged (legacy) row to pt source — the assumption this data always had before name_source_locale existed', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { 'Agachamento Livre': 'Free Squat' } }),
    });

    const rows = [{ name: 'Agachamento Livre', name_source_locale: null }];
    renderHook(() => useTranslatedExerciseNamesByRow(rows, 'en'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.sourceLocale).toBe('pt');
  });

  it('groups a mixed-locale list into one call per distinct non-target source, and no call for the matching one', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockImplementation(async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      return { ok: true, json: async () => ({ translations: Object.fromEntries(body.items.map((i: { text: string }) => [i.text, `${i.text}-${body.sourceLocale}`])) }) };
    });

    const rows = [
      { name: 'Already Spanish', name_source_locale: 'es' },   // matches target — no call
      { name: 'Nome em Português', name_source_locale: 'pt' },  // needs pt→es
      { name: 'English Name', name_source_locale: 'en' },       // needs en→es
    ];
    const { result } = renderHook(() => useTranslatedExerciseNamesByRow(rows, 'es'));

    await waitFor(() => expect(result.current(rows[1]!)).toBe('Nome em Português-pt'));
    await waitFor(() => expect(result.current(rows[2]!)).toBe('English Name-en'));
    expect(result.current(rows[0]!)).toBe('Already Spanish');

    // Exactly 2 calls (pt bucket, en bucket) — the es bucket (same as target) never fires.
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const sourceLocales = mockFetch.mock.calls.map(c => JSON.parse((c[1] as RequestInit).body as string).sourceLocale).sort();
    expect(sourceLocales).toEqual(['en', 'pt']);
  });

  it('falls back to pt for an unrecognized source locale value', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ translations: {} }) });

    const rows = [{ name: 'Mystery Name', name_source_locale: 'xx' }];
    renderHook(() => useTranslatedExerciseNamesByRow(rows, 'en'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.sourceLocale).toBe('pt');
  });
});
