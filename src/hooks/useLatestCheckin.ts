import React from 'react';
import { supabase } from '../supabase';

export interface LatestCheckinData {
  energy?:            number;
  sleep_quality?:     string;
  sleep_hours?:       number;
  fatigue?:           number;
  fatigue_type?:      string;
  available_minutes?: number;
  location_today?:    string;
  equipment_today?:   string[];
  body_rhythm_active?: boolean;
  adaptation_preference?: string;
  emotional_state?:   string;
  pain_region?:       string;
  streak:             number;
  lastCheckin:        string;
}

function formatLast(ts?: string | null): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
}

export function useLatestCheckin(userId: string | null | undefined) {
  const [data, setData] = React.useState<LatestCheckinData>(() => ({
    streak: 0,
    lastCheckin: '-',
  }));
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const reload = React.useCallback(() => {
    if (!userId) return;
    const uid = userId; // narrowed to string

    async function load() {
      const { data: lastCheckin } = await supabase
        .from('checkin_prontidao')
        .select('energy_level, sleep_quality, fatigue_level, available_minutes, training_location, quick_data, detailed_data, occurred_at')
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

      const dd = lastCheckin?.detailed_data as Record<string, unknown> | null;
      const qd = lastCheckin?.quick_data as Record<string, unknown> | null;
      const qdPain = qd?.pain as { present?: boolean; region?: string } | null;
      const pr = qdPain?.region as string | undefined;

      const result: LatestCheckinData = {
        energy:            (lastCheckin?.energy_level         as number)   ?? undefined,
        sleep_quality:     (lastCheckin?.sleep_quality        as string)   ?? undefined,
        sleep_hours:       (dd?.sleep_hours                   as number)   ?? undefined,
        fatigue:           (lastCheckin?.fatigue_level        as number)   ?? undefined,
        fatigue_type:      (dd?.fatigue_type                  as string)   ?? undefined,
        available_minutes: (lastCheckin?.available_minutes    as number)   ?? undefined,
        location_today:    (lastCheckin?.training_location    as string)   ?? undefined,
        equipment_today:   (dd?.equipment_today               as string[]) ?? undefined,
        body_rhythm_active:(dd?.body_rhythm_active            as boolean)  ?? undefined,
        adaptation_preference: (dd?.adaptation_preference      as string)   ?? undefined,
        emotional_state:   (dd?.emotional_state               as string)   ?? undefined,
        streak,
        lastCheckin:       formatLast(lastCheckin?.occurred_at),
      };
      if (pr) result.pain_region = pr;
      setData(result);
      setLastUpdated(new Date());
    }

    load().catch(() => {});
  }, [userId]);

  React.useEffect(() => { reload(); }, [reload]);

  return { ...data, reload, lastUpdated };
}
