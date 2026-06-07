import React from 'react';
import i18n from '../i18n';
import { supabase } from '../supabase';
import { useM5Data } from '../screens/client/performance/perf-engines';
import type { CoachDNARow } from '../types/coach-dna';
import type { UserProfileV2 } from '../types/profile-v2';
import type { CheckInProntidao } from '../types/checkin-v2';
import {
  buildTrainerContext,
  buildClientContext,
  buildTodayContext,
  buildStatsContext,
  buildLibraryContext,
  buildAIContext,
} from '../ai/buildAIContext';
import type {
  AIContext,
  TaskContext,
  SmartWorkoutRequest,
  SmartWorkoutResponse,
} from '../ai/types';

// coach_dna is not yet in auto-generated Supabase types — cast via unknown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

interface UseAIContextOptions {
  trainerId: string | undefined;
  clientId:  string | undefined;
}

interface UseAIContextResult {
  context:  AIContext | null;
  loading:  boolean;
  error:    string | null;
  refresh:  () => void;
  callAI:   (task: TaskContext) => Promise<SmartWorkoutResponse | null>;
}

export function useAIContext({ trainerId, clientId }: UseAIContextOptions): UseAIContextResult {
  const [context, setContext] = React.useState<AIContext | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error,   setError]   = React.useState<string | null>(null);
  const [tick,    setTick]    = React.useState(0);

  // M5 stats computed by the dedicated engine (reuses existing hook)
  const { data: m5Data } = useM5Data(clientId ?? null);

  const refresh = React.useCallback(() => setTick(t => t + 1), []);

  React.useEffect(() => {
    if (!trainerId || !clientId) return;
    const tid = trainerId;
    const cid = clientId;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // 1. Coach DNA (trainer)
        const { data: dnaRow } = await db
          .from('coach_dna')
          .select('*')
          .eq('trainer_id', tid)
          .maybeSingle() as { data: CoachDNARow | null };

        if (!dnaRow?.dna_active) {
          if (!cancelled) {
            setError('Coach DNA not activated. Complete the Coach DNA wizard first.');
            setLoading(false);
          }
          return;
        }

        // 2. Client profile V2
        const { data: profileRow } = await supabase
          .from('profile_v2')
          .select('*')
          .eq('user_id', cid)
          .maybeSingle() as { data: Partial<UserProfileV2> | null };

        // 3. Latest check-in (today's first, fallback to most recent)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: checkinRow } = await supabase
          .from('checkin_prontidao')
          .select('*')
          .eq('user_id', cid)
          .gte('occurred_at', todayStart.toISOString())
          .order('occurred_at', { ascending: false })
          .limit(1)
          .maybeSingle() as { data: CheckInProntidao | null };

        if (cancelled) return;

        const trainerCtx = buildTrainerContext(dnaRow);

        const clientCtx = buildClientContext(
          { user_id: cid, created_at: '', updated_at: '', ...profileRow } as UserProfileV2,
        );

        const fallbackCheckin: CheckInProntidao = {
          id: '', user_id: cid, variant: 'quick', input_source: 'form',
          occurred_at: new Date().toISOString(), created_at: new Date().toISOString(),
          readiness_score: 50, energy_level: 5, sleep_quality: 'regular',
          fatigue_level: 5, pain_present: false, pain_intensity: 0,
          available_minutes: 60, training_location: '', ai_led_blocked: false,
        };
        const todayCtx = buildTodayContext(checkinRow ?? fallbackCheckin);

        // Stats built from M5 data (empty until useM5Data resolves — hook re-runs on tick)
        const statsCtx = m5Data
          ? buildStatsContext(m5Data)
          : buildStatsContext({
              adherenceRate: 0, workoutStreak: 0, completedSessions: 0, partialSessions: 0,
              energyAvg: 0, sleepAvg: 0, painEvents14d: [], primaryPainRegion: null,
              painRecurrenceCount: 0, weeksActive: 0, plannedSessions: 0, missedSessions: 0,
              checkinRate: 0, weekDays: [], weekStatus: [], weeklyStats: [], recentSessions: [],
              scores: {
                churnRisk: { score: 50, name: '', code: '', desc: '', action: '' },
                fatigueRisk: { score: 50, name: '', code: '', desc: '', action: '' },
                painRecurrence: { score: 50, name: '', code: '', desc: '', action: '' },
                progressionReadiness: { score: 60, name: '', code: '', desc: '', action: '' },
                sessionCompletion: { score: 50, name: '', code: '', desc: '', action: '' },
                planFit: { score: 60, name: '', code: '', desc: '', action: '' },
                recoveryInstability: { score: 50, name: '', code: '', desc: '', action: '' },
                responseCompatibility: { score: 60, name: '', code: '', desc: '', action: '' },
                plateauRisk: { score: 40, name: '', code: '', desc: '', action: '' },
              },
              insights: [], milestones: [],
            } as import('../screens/client/performance/perf-types').M5Data);

        // Library: trainer preferences + client equipment
        const libraryCtx = buildLibraryContext({
          excludedRegions:  checkinRow?.pain_present && checkinRow.detailed_data?.pain?.region
            ? [checkinRow.detailed_data.pain.region] : [],
          clientEquipment:  checkinRow?.detailed_data?.equipment_today
            ?? profileRow?.environment?.equipment?.map(String)
            ?? [],
          trainerFavorites: dnaRow.exercises?.favorites ?? [],
          trainerAvoid:     dnaRow.exercises?.avoid     ?? [],
        });

        const placeholderTask: TaskContext = { type: 'generate_workout' };
        const aiCtx = buildAIContext(trainerCtx, clientCtx, todayCtx, statsCtx, libraryCtx, placeholderTask, i18n.language || 'en');

        if (!cancelled) setContext(aiCtx);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to build AI context');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [trainerId, clientId, tick, m5Data]);

  // ── callAI: send context + task to generate-smart-workout ────────────────────

  const callAI = React.useCallback(async (task: TaskContext): Promise<SmartWorkoutResponse | null> => {
    if (!context) return null;

    const payload: SmartWorkoutRequest = {
      trainer: context.trainer,
      client:  context.client,
      today:   context.today,
      stats:   context.stats,
      library: context.library,
      task,
      locale:  context.locale,
    };

    try {
      const response = await fetch('/api/generate-smart-workout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as SmartWorkoutResponse;
    } catch (err) {
      console.error('[useAIContext] callAI:', err);
      return null;
    }
  }, [context]);

  return { context, loading, error, refresh, callAI };
}
