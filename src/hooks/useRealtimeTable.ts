import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';

interface RealtimeFilter {
  column: string;
  value:  string;
}

/**
 * Subscribe to INSERT / UPDATE / DELETE changes on a Supabase table and
 * call `onRefresh` whenever any change lands.
 *
 * Cleanup (channel removal) happens automatically on unmount or when any
 * dependency changes.
 *
 * @param table     - Supabase table name, e.g. 'checkin_prontidao'
 * @param filter    - Optional { column, value } row-level filter
 * @param onRefresh - Callback invoked on any table change
 * @param enabled   - Set to false to skip subscription (e.g. when userId is null)
 */
export function useRealtimeTable(
  table:     string,
  filter:    RealtimeFilter | null,
  onRefresh: () => void,
  enabled:   boolean = true,
) {
  // Keep a stable ref to the latest callback so we never need to re-subscribe
  // just because the caller re-renders and provides a new function reference.
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    // Unique channel name to avoid conflicts if multiple instances subscribe
    // to the same table (e.g. trainer dashboard + checkin hook simultaneously).
    const channelName = [
      'rt',
      table,
      filter ? `${filter.column}_${filter.value}` : 'all',
      Math.random().toString(36).slice(2, 7),
    ].join('-');

    const channelConfig = filter
      ? {
          event:  '*' as const,
          schema: 'public',
          table,
          filter: `${filter.column}=eq.${filter.value}`,
        }
      : {
          event:  '*' as const,
          schema: 'public',
          table,
        };

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, () => {
        onRefreshRef.current();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  // Only re-subscribe when the table, filter identity, or enabled flag changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.column, filter?.value, enabled]);
}
