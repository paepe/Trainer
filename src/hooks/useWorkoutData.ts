import { supabase } from '../supabase';
import i18n from '../i18n';
import { emitEvent, handlePainReport } from '../lib/events';
import { notify } from '../lib/notify';
import type { WorkoutSessionExercise, SessionExerciseStatus } from '../types';
import type { GeneratedWorkoutExercise } from '../lib/workoutGeneration';

interface DataResult<T>  { data: T | null; error: unknown }
interface MutateResult   { error: unknown }

export function useWorkoutData(userId: string | undefined) {

  async function startWorkoutSession(input: {
    planId:               string | null;
    exercises:            GeneratedWorkoutExercise[];
    forUserId?:           string;
    planned_duration_min?: number;
  }): Promise<DataResult<{ sessionId: string; sessionExercises: WorkoutSessionExercise[] }>> {
    const effectiveUserId = input.forUserId ?? userId;
    if (!effectiveUserId) return { data: null, error: 'no user' };

    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id:            effectiveUserId,
        plan_id:            input.planId,
        status:             'active',
        started_at:         new Date().toISOString(),
        total_duration_min: input.planned_duration_min ?? null,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('[useWorkoutData] startWorkoutSession:', sessionError);
      return { data: null, error: sessionError };
    }

    const sessionId = session.id as string;
    const exerciseRows = input.exercises.map((ex, i) => ({
      session_id:         sessionId,
      exercise_name:      ex.exercise_name,
      muscle_group:       ex.muscle_group       ?? null,
      order_index:        i,
      sets_prescribed:    ex.sets               ?? null,
      reps_prescribed:    ex.reps               ?? null,
      load_kg_prescribed: ex.load_kg            ?? null,
      rest_seconds:       ex.rest_seconds       ?? null,
      notes:              ex.notes              ?? null,
      status:             'pending',
    }));

    if (exerciseRows.length === 0) {
      void emitEvent(effectiveUserId, 'workout_started', 'workout_session', sessionId);
      return { data: { sessionId, sessionExercises: [] }, error: null };
    }

    const { data: inserted, error: exError } = await supabase
      .from('workout_session_exercises')
      .insert(exerciseRows)
      .select('*');

    if (exError) {
      console.error('[useWorkoutData] startWorkoutSession exercises:', exError);
      return { data: null, error: exError };
    }

    void emitEvent(effectiveUserId, 'workout_started', 'workout_session', sessionId);
    return { data: { sessionId, sessionExercises: (inserted ?? []) as WorkoutSessionExercise[] }, error: null };
  }

  async function logWorkoutSet(data: {
    session_exercise_id: string;
    session_id:          string;
    set_number:          number;
    reps_done:           number | null;
    load_kg:             number | null;
    rpe:                 number | null;
  }): Promise<MutateResult> {
    const { error } = await supabase
      .from('workout_set_logs')
      .insert({ ...data, completed_at: new Date().toISOString() });
    if (error) console.error('[useWorkoutData] logWorkoutSet:', error);
    return { error };
  }

  async function updateSessionExerciseStatus(
    sessionExerciseId: string,
    status: SessionExerciseStatus,
    skippedReason?: string,
  ): Promise<MutateResult> {
    const payload: { status: SessionExerciseStatus; skipped_reason?: string | null } = { status };
    if (status === 'skipped' && skippedReason !== undefined) {
      payload.skipped_reason = skippedReason || null;
    }

    const { error } = await supabase
      .from('workout_session_exercises')
      .update(payload)
      .eq('id', sessionExerciseId);
    if (error) console.error('[useWorkoutData] updateSessionExerciseStatus:', error);
    return { error };
  }

  async function reportWorkoutPain(data: {
    session_id:          string;
    session_exercise_id: string | null;
    body_region:         string;
    intensity:           number;
  }): Promise<MutateResult> {
    const { error } = await supabase
      .from('workout_pain_events')
      .insert({ ...data, reported_at: new Date().toISOString(), trainer_notified: false });
    if (error) { console.error('[useWorkoutData] reportWorkoutPain:', error); return { error }; }
    if (userId) void handlePainReport(userId, data.session_id, data.body_region, data.intensity);
    return { error };
  }

  async function completeWorkoutSession(data: {
    sessionId:          string;
    completed_at:       string;
    total_duration_min: number;
    notes?:             string | null;
    planId?:            string | null;
  }): Promise<MutateResult> {
    const { error } = await supabase
      .from('workout_sessions')
      .update({
        status:             'completed',
        completed_at:       data.completed_at,
        total_duration_min: data.total_duration_min,
        notes:              data.notes ?? null,
      })
      .eq('id', data.sessionId);
    if (error) { console.error('[useWorkoutData] completeWorkoutSession:', error); return { error }; }
    if (data.planId) {
      void supabase.from('workout_plans').update({ status: 'completed' }).eq('id', data.planId)
        .then(({ error: planErr }) => { if (planErr) console.error('[useWorkoutData] plan complete:', planErr); });
    }
    if (userId) {
      void emitEvent(userId, 'workout_completed', 'workout_session', data.sessionId, { duration_min: data.total_duration_min });
      void supabase.from('trainer_clients').select('trainer_id').eq('client_id', userId).eq('status', 'active').maybeSingle()
        .then(({ data: tc }) => {
          if (tc?.trainer_id) void notify(tc.trainer_id, i18n.t('inbox.notification.workoutCompletedTitle'), i18n.t('inbox.notification.workoutCompletedBody', { duration: data.total_duration_min }), undefined, { type: 'workout_completed', templateKey: 'workout_completed', params: { duration: data.total_duration_min } });
        });
    }
    return { error };
  }

  async function savePostWorkoutFeedback(data: {
    session_id:      string;
    overall_feeling: number;
    energy_after:    number | null;
    notes:           string | null;
    forUserId?:      string;   // trainer submitting on behalf of client
  }): Promise<MutateResult> {
    const effectiveUserId = data.forUserId ?? userId;
    if (!effectiveUserId) return { error: null };
    const { error } = await supabase
      .from('post_workout_feedback')
      .upsert(
        {
          session_id:      data.session_id,
          overall_feeling: data.overall_feeling,
          energy_after:    data.energy_after,
          notes:           data.notes,
          user_id:         effectiveUserId,
          submitted_at:    new Date().toISOString(),
        },
        { onConflict: 'session_id' },
      );
    if (error) console.error('[useWorkoutData] savePostWorkoutFeedback:', error);
    return { error };
  }

  return { startWorkoutSession, logWorkoutSet, updateSessionExerciseStatus, reportWorkoutPain, completeWorkoutSession, savePostWorkoutFeedback };
}
