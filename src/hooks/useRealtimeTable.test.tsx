import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const supabaseRealtime = vi.hoisted(() => ({
  removeChannel: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn(),
  on: vi.fn(),
  channel: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabase: { channel: supabaseRealtime.channel, removeChannel: supabaseRealtime.removeChannel },
}));

import { useRealtimeTable } from './useRealtimeTable';

type RealtimeListener = () => void;

function configureChannel() {
  let listener: RealtimeListener | undefined;
  const subscribed = { id: 'channel-1' };
  supabaseRealtime.on.mockImplementation((_event, _config, callback: RealtimeListener) => {
    listener = callback;
    return { subscribe: supabaseRealtime.subscribe };
  });
  supabaseRealtime.subscribe.mockReturnValue(subscribed);
  supabaseRealtime.channel.mockReturnValue({ on: supabaseRealtime.on });
  return { subscribed, fire: () => listener?.() };
}

afterEach(() => vi.clearAllMocks());

describe('useRealtimeTable', () => {
  it('subscribes to the client check-in feed and refreshes after a received change', () => {
    const channelResult = configureChannel();
    const refresh = vi.fn();

    const { unmount } = renderHook(() => useRealtimeTable(
      'checkin_prontidao',
      { column: 'user_id', value: 'client-1' },
      refresh,
    ));

    expect(supabaseRealtime.channel).toHaveBeenCalledWith(expect.stringMatching(/^rt-checkin_prontidao-user_id_client-1-/));
    expect(supabaseRealtime.on).toHaveBeenCalledWith('postgres_changes', {
      event: '*', schema: 'public', table: 'checkin_prontidao', filter: 'user_id=eq.client-1',
    }, expect.any(Function));

    act(() => channelResult.fire());
    expect(refresh).toHaveBeenCalledTimes(1);

    unmount();
    expect(supabaseRealtime.removeChannel).toHaveBeenCalledWith(channelResult.subscribed);
  });

  it('keeps the latest refresh callback without replacing the live subscription', () => {
    const channelResult = configureChannel();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ onRefresh }) => useRealtimeTable('checkin_prontidao', { column: 'user_id', value: 'client-1' }, onRefresh),
      { initialProps: { onRefresh: first } },
    );

    rerender({ onRefresh: second });
    act(() => channelResult.fire());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(supabaseRealtime.channel).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe when the client context is not available', () => {
    configureChannel();
    renderHook(() => useRealtimeTable('checkin_prontidao', null, vi.fn(), false));
    expect(supabaseRealtime.channel).not.toHaveBeenCalled();
  });
});
