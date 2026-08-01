// Contract: renders raw text immediately, swaps in the translated string once
// the (mocked) endpoint resolves, and never throws or blocks on failure.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../supabase', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' } }),
}));

import { useTranslatedExerciseContent } from './useTranslatedExerciseContent';

describe('useTranslatedExerciseContent', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });

  it('returns the raw text immediately, then the translation once it resolves', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { 'Agachamento Livre': 'Free Squat' } }),
    });

    const { result } = renderHook(() => useTranslatedExerciseContent(['Agachamento Livre']));
    expect(result.current('Agachamento Livre')).toBe('Agachamento Livre');

    await waitFor(() => expect(result.current('Agachamento Livre')).toBe('Free Squat'));
  });

  it('deduplicates identical strings into a single request item', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { Squat: 'Squat' } }),
    });

    renderHook(() => useTranslatedExerciseContent(['Squat', 'Squat', null, undefined, '  ']));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.items).toEqual([{ text: 'Squat' }]);
  });

  it('falls back to the raw text and does not throw when the request fails', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useTranslatedExerciseContent(['Corrida Leve']));
    await act(async () => { await Promise.resolve(); });

    expect(result.current('Corrida Leve')).toBe('Corrida Leve');
  });

  it('passes an empty/null text through unchanged without a network call', () => {
    const { result } = renderHook(() => useTranslatedExerciseContent([null, undefined, '']));
    expect(result.current(null)).toBe('');
    expect(result.current(undefined)).toBe('');
    expect(fetch).not.toHaveBeenCalled();
  });
});
