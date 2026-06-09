import React from 'react';
import i18n from '../i18n';
import { supabase } from '../supabase';
import { useRealtimeTable } from './useRealtimeTable';
import { parseCheckinData } from '../lib/parseCheckinData';

export interface LatestCheckinData {
  energy?:               number;
  sleep_quality?:        string;
  sleep_hours?:          number;
  fatigue?:              number;
  fatigue_type?:         string;
  available_minutes?:    number;
  location_today?:       string;
  equipment_today?:      string[];
  body_rhythm_active?:   boolean;
  adaptation_preference?: string;
  emotional_state?:      string;
  pain_present?:         boolean;
  pain_region?:          string;
  pain_intensity?:       number;
  safety_signals?:          string[];
  readiness_score?:         number;
  input_source?:            string;
  can_do_floor_exercises?:  boolean;
  movement_trigger?:        string;
  streak:                   number;
  lastCheckin:           string;
  lastCheckinAt:         string | null;
}

function formatLast(ts?: string | null): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const locale = i18n.language || 'en-US';
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isToday) return `${i18n.t('common.today')} ${time}`;
  if (isYesterday) return `${i18n.t('common.yesterday')} ${time}`;
  return `${d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} ${time}`;
}

export function useLatestCheckin(userId: string | null | undefined) {
  const [data, setData] = React.useState<LatestCheckinData>(() => ({
    streak: 0,
    lastCheckin: '-',
    lastCheckinAt: null,
  }));
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const reload = React.useCallback(() => {
    if (!userId) return;
    const uid = userId; // narrowed to string

    async function load() {
      const { data: lastCheckin } = await supabase
        .from('checkin_prontidao')
        .select('energy_level, sleep_quality, fatigue_level, available_minutes, training_location, pain_present, pain_intensity, readiness_score, input_source, quick_data, detailed_data, occurred_at')
        .eq('user_id', uid)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Compute streak in a single query instead of up to 60 sequential count queries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sixtyDaysAgo = new Date(today);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: recentCheckins } = await supabase
        .from('checkin_prontidao')
        .select('occurred_at')
        .eq('user_id', uid)
        .gte('occurred_at', sixtyDaysAgo.toISOString())
        .order('occurred_at', { ascending: false });

      // Build set of dates (YYYY-MM-DD) that have check-ins
      const checkinDays = new Set<string>();
      for (const row of (recentCheckins ?? [])) {
        if (row.occurred_at) checkinDays.add(row.occurred_at.split('T')[0]!);
      }

      // Count consecutive days backwards from today
      let streak = 0;
      for (let d = 0; d < 60; d++) {
        const day = new Date(today);
        day.setDate(day.getDate() - d);
        const key = day.toISOString().split('T')[0]!;
        if (checkinDays.has(key)) streak++;
        else break;
      }

      const parsed = lastCheckin ? parseCheckinData(lastCheckin) : {};

      const result: LatestCheckinData = {
        ...parsed,
        streak,
        lastCheckin: formatLast(lastCheckin?.occurred_at),
        lastCheckinAt: lastCheckin?.occurred_at ?? null,
      };
      setData(result);
      setLastUpdated(new Date());
    }

    load().catch(() => {});
  }, [userId]);

  React.useEffect(() => { reload(); }, [reload]);

  // Live subscription — auto-reload whenever a new row lands for this user
  useRealtimeTable(
    'checkin_prontidao',
    userId ? { column: 'user_id', value: userId } : null,
    reload,
    !!userId,
  );

  return { ...data, reload, lastUpdated };
}
