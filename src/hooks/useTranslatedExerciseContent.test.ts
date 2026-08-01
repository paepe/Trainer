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

  // The mocked i18n.language is 'en' throughout this file — this test only
  // passes if the explicit targetLocale argument actually overrides it
  // rather than being ignored in favour of the UI language.
  it('uses the explicit targetLocale override instead of the UI language', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { 'Agachamento Livre': 'Free Squat' } }),
    });

    renderHook(() => useTranslatedExerciseContent(['Agachamento Livre'], 'es'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.targetLocale).toBe('es');
  });

  it('sends the explicit sourceLocale for library/catalog content', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { 'Bird-Dog': 'Pássaro-Cachorro' } }),
    });

    renderHook(() => useTranslatedExerciseContent(['Bird-Dog'], 'pt', 'en'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.sourceLocale).toBe('en');
  });

  it('omits sourceLocale entirely when not supplied, letting the server default apply', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { 'Corrida Leve': 'Light Run' } }),
    });

    renderHook(() => useTranslatedExerciseContent(['Corrida Leve']));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).not.toHaveProperty('sourceLocale');
  });
});
