// Write-ahead sync queue for workout data (offline resilience).
//
// Workout sessions are runtime-critical: a failed network write must never
// interrupt the session or silently discard set data (AGENTS.md, Pillar 4 /
// Domain Awareness). Every write that fails is persisted here (localStorage)
// and replayed when connectivity returns — on the browser 'online' event and
// on module load.
//
// Item kinds:
//   set_log          — one workout_set_logs row that failed to insert
//   exercise_status  — a workout_session_exercises status update that failed
//   session_complete — a workout_sessions completion update that failed
//   full_session     — an entire workout executed while the session row could
//                      not be created (offline from the start); replayed as
//                      session + exercises + set logs in one pass

import type { SessionExerciseStatus } from '../types/workout';

const STORAGE_KEY = 'trainer.workoutSyncQueue.v1';

export interface QueuedSetLog {
  session_exercise_id: string;
  session_id:          string;
  set_number:          number;
  reps_done:           number | null;
  load_kg:             number | null;
  rpe:                 number | null;
  duration_seconds:    number | null;
  completed_at:        string;
}

export interface QueuedExerciseStatus {
  session_exercise_id: string;
  status:              SessionExerciseStatus;
  skipped_reason?:     string | null;
}

export interface QueuedSessionComplete {
  session_id:         string;
  completed_at:       string;
  total_duration_min: number;
  notes?:             string | null;
  plan_id?:           string | null;
}

export interface QueuedFullSessionExercise {
  exercise_name:               string;
  muscle_group:                string | null;
  order_index:                 number;
  sets_prescribed:             number | null;
  reps_prescribed:             number | null;
  duration_seconds_prescribed: number | null;
  load_kg_prescribed:          number | null;
  rest_seconds:                number | null;
  notes:                       string | null;
  status:                      SessionExerciseStatus;
  skipped_reason:              string | null;
  set_logs:                    Array<Pick<QueuedSetLog, 'set_number' | 'reps_done' | 'load_kg' | 'rpe' | 'duration_seconds' | 'completed_at'>>;
}

export interface QueuedFullSession {
  user_id:            string;
  plan_id:            string | null;
  started_at:         string;
  completed_at:       string;
  total_duration_min: number;
  exercises:          QueuedFullSessionExercise[];
}

export type QueueItem =
  | { kind: 'set_log';          queuedAt: string; payload: QueuedSetLog }
  | { kind: 'exercise_status';  queuedAt: string; payload: QueuedExerciseStatus }
  | { kind: 'session_complete'; queuedAt: string; payload: QueuedSessionComplete }
  | { kind: 'full_session';     queuedAt: string; payload: QueuedFullSession };

function readQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('[workoutSyncQueue] persist failed:', err);
  }
}

export function enqueue(item: Omit<QueueItem, 'queuedAt'>): void {
  const items = readQueue();
  items.push({ ...item, queuedAt: new Date().toISOString() } as QueueItem);
  writeQueue(items);
}

export function pendingCount(): number {
  return readQueue().length;
}

let flushing = false;

/**
 * Replays every queued item against Supabase. Items that succeed are removed;
 * items that fail again stay queued for the next attempt. Safe to call at any
 * time — concurrent calls are coalesced.
 */
export async function flush(): Promise<void> {
  if (flushing) return;
  const items = readQueue();
  if (items.length === 0) return;
  flushing = true;

  const { supabase } = await import('../supabase');
  const remaining: QueueItem[] = [];

  for (const item of items) {
    try {
      let failed = false;

      if (item.kind === 'set_log') {
        const { error } = await supabase.from('workout_set_logs').insert(item.payload);
        failed = !!error;
      } else if (item.kind === 'exercise_status') {
        const { session_exercise_id, status, skipped_reason } = item.payload;
        const patch: { status: SessionExerciseStatus; skipped_reason?: string | null } = { status };
        if (skipped_reason !== undefined) patch.skipped_reason = skipped_reason;
        const { error } = await supabase
          .from('workout_session_exercises').update(patch).eq('id', session_exercise_id);
        failed = !!error;
      } else if (item.kind === 'session_complete') {
        const { session_id, completed_at, total_duration_min, notes, plan_id } = item.payload;
        const { error } = await supabase
          .from('workout_sessions')
          .update({ status: 'completed', completed_at, total_duration_min, notes: notes ?? null })
          .eq('id', session_id);
        failed = !!error;
        if (!failed && plan_id) {
          void supabase.from('workout_plans').update({ status: 'completed' }).eq('id', plan_id);
        }
      } else {
        failed = !(await replayFullSession(supabase, item.payload));
      }

      if (failed) remaining.push(item);
    } catch (err) {
      console.error('[workoutSyncQueue] flush item failed:', err);
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  flushing = false;
  if (remaining.length < items.length) {
    console.log(`[workoutSyncQueue] flushed ${items.length - remaining.length}/${items.length} items`);
  }
}

// Recreates a fully-offline workout: session row (already completed) +
// exercise rows with final statuses + all set logs.
async function replayFullSession(
  supabase: typeof import('../supabase').supabase,
  s: QueuedFullSession,
): Promise<boolean> {
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id:            s.user_id,
      plan_id:            s.plan_id,
      status:             'completed',
      started_at:         s.started_at,
      completed_at:       s.completed_at,
      total_duration_min: s.total_duration_min,
    })
    .select('id')
    .single();
  if (sessionError || !session) return false;

  const sessionId = session.id as string;

  if (s.exercises.length > 0) {
    const { data: inserted, error: exError } = await supabase
      .from('workout_session_exercises')
      .insert(s.exercises.map(ex => ({
        session_id:                  sessionId,
        exercise_name:               ex.exercise_name,
        muscle_group:                ex.muscle_group,
        order_index:                 ex.order_index,
        sets_prescribed:             ex.sets_prescribed,
        reps_prescribed:             ex.reps_prescribed,
        duration_seconds_prescribed: ex.duration_seconds_prescribed,
        load_kg_prescribed:          ex.load_kg_prescribed,
        rest_seconds:                ex.rest_seconds,
        notes:                       ex.notes,
        status:                      ex.status,
        skipped_reason:              ex.skipped_reason,
      })))
      .select('id, order_index');
    if (exError || !inserted) return false;

    const idByOrder = new Map((inserted as { id: string; order_index: number }[]).map(r => [r.order_index, r.id]));
    const setRows = s.exercises.flatMap(ex => {
      const exId = idByOrder.get(ex.order_index);
      if (!exId) return [];
      return ex.set_logs.map(log => ({ ...log, session_exercise_id: exId, session_id: sessionId }));
    });
    if (setRows.length > 0) {
      const { error: logError } = await supabase.from('workout_set_logs').insert(setRows);
      if (logError) return false;
    }
  }

  return true;
}

// Auto-replay: when connectivity returns, and once on app boot.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flush(); });
  if (navigator.onLine) void flush();
}
