import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components';
import { Spinner } from '../../ui';
import { surfRaised, borderSubtle, textPri, textSec, textMute, primaryBtn } from '../../theme';
import type { NavFn } from '../../types';
import type { GeneratedWorkoutExercise } from '../../lib/workoutGeneration';
import type { WorkoutSessionExercise, SessionExerciseStatus } from '../../types/workout';
import { vibrate } from '../../lib/haptics';
import { soundSetDone, soundRestEnd, soundWorkoutDone } from '../../lib/audio';
import { ExerciseCard } from './workout/ExerciseCard';
import { BottomPanel } from './workout/BottomPanel';
import { LabeledInput } from './workout/LabeledInput';
import type { Phase, ExState } from './workout/types';
import { enqueue, flush, pendingCount, type QueuedFullSession } from '../../lib/workoutSyncQueue';
import { useTranslatedExerciseContent } from '../../hooks/useTranslatedExerciseContent';
import { resolveExerciseNameLocale } from '../../lib/exerciseNameLocale';
import type { AppLanguage } from '../../i18n';

interface Theme {
  primary:     string;
  primarySoft: string;
  accent:      string;
}

interface AppUser { id: string | null }

interface WorkoutModeScreenProps {
  nav:                         NavFn;
  t:                           Theme;
  dark:                        boolean;
  user:                        AppUser;
  planId:                      string | null;
  exercises:                   GeneratedWorkoutExercise[] | null;
  plannedDurationMin?:         number;
  clientUserId?:               string;
  clientName?:                 string;
  freeSession?:                boolean; // Free Training Session: runs against synthetic subject (persists normally)
  startWorkoutSession:         (input: { planId: string | null; exercises: GeneratedWorkoutExercise[]; forUserId?: string; planned_duration_min?: number }) => Promise<{ data: { sessionId: string; sessionExercises: WorkoutSessionExercise[] } | null; error: unknown }>;
  logWorkoutSet:               (data: { session_exercise_id: string; session_id: string; set_number: number; reps_done: number | null; load_kg: number | null; rpe: number | null; duration_seconds?: number | null }) => Promise<{ error: unknown }>;
  updateSessionExerciseStatus: (sessionExerciseId: string, status: SessionExerciseStatus, skippedReason?: string) => Promise<{ error: unknown }>;
  reportWorkoutPain:           (data: { session_id: string; session_exercise_id: string | null; body_region: string; intensity: number }) => Promise<{ error: unknown }>;
  completeWorkoutSession:      (data: { sessionId: string; completed_at: string; total_duration_min: number; notes?: string | null; planId?: string | null }) => Promise<{ error: unknown }>;
  updatePainRecurrence:        (region: string) => Promise<{ error: unknown }>;
  sounds?:                     boolean;
  keepExerciseNamesInEnglish?: boolean;
}

export function WorkoutModeScreen({
  nav, t, dark, user: _user, planId, exercises, plannedDurationMin, clientUserId, clientName,
  startWorkoutSession, logWorkoutSet, updateSessionExerciseStatus,
  reportWorkoutPain, completeWorkoutSession, updatePainRecurrence,
  sounds = false, keepExerciseNamesInEnglish = true,
}: WorkoutModeScreenProps) {
  const { t: tr, i18n } = useTranslation();
  const skipOptions = React.useMemo(
    () => tr('client.mode.skipReasons', { returnObjects: true }) as string[],
    [tr],
  );
  const painRegions = React.useMemo(() => [
    { value: 'neck', label: tr('client.mode.bodyParts.neck') },
    { value: 'shoulder', label: tr('client.mode.bodyParts.shoulder') },
    { value: 'elbow', label: tr('client.mode.bodyParts.elbow') },
    { value: 'wrist', label: tr('client.mode.bodyParts.wrist') },
    { value: 'upper_back', label: tr('client.mode.bodyParts.upper_back') },
    { value: 'lower_back', label: tr('client.mode.bodyParts.lower_back') },
    { value: 'hip', label: tr('client.mode.bodyParts.hip') },
    { value: 'knee', label: tr('client.mode.bodyParts.knee') },
    { value: 'ankle', label: tr('client.mode.bodyParts.ankle') },
    { value: 'other', label: tr('client.mode.bodyParts.other') },
  ], [tr]);
  const soundsRef = React.useRef(sounds);
  React.useEffect(() => { soundsRef.current = sounds; }, [sounds]);
  const [sessionId,  setSessionId]  = React.useState<string | null>(null);
  const [exStates,   setExStates]   = React.useState<ExState[]>([]);
  const [activeIdx,  setActiveIdx]  = React.useState(0);
  const [phase,      setPhase]      = React.useState<Phase>('init');
  const [elapsed,    setElapsed]    = React.useState(0);
  const [startedAt]                 = React.useState<Date>(() => new Date());
  const [initErr,    setInitErr]    = React.useState<string | null>(null);
  const [finishing,  setFinishing]  = React.useState(false);
  const [savingSet,  setSavingSet]  = React.useState(false);
  const [syncPending, setSyncPending] = React.useState(() => pendingCount() > 0);

  // Set form
  const [setReps,     setSetReps]     = React.useState('');
  const [setLoad,     setSetLoad]     = React.useState('');
  const [setRpe,      setSetRpe]      = React.useState(7);
  const [setDuration, setSetDuration] = React.useState('');

  // Rest timer
  const [restSec, setRestSec] = React.useState(0);

  // Pain form
  const [painRegion,    setPainRegion]    = React.useState('');
  const [painIntensity, setPainIntensity] = React.useState(5);

  // Skip form
  const [skipReasonOption, setSkipReasonOption] = React.useState('');
  const [skipCustomReason, setSkipCustomReason] = React.useState('');

  // ── Init ─────────────────────────────────────────────────────────────────────
  const [noPlan, setNoPlan] = React.useState(false);
  // React.StrictMode double-invokes mount effects in dev (mount → cleanup →
  // mount again) to surface non-idempotent side effects. This effect has none
  // — startWorkoutSession() is a real INSERT — so without this guard, dev
  // testing was silently writing two workout_sessions rows per run: one
  // tracked by the app (the second, whose sessionId wins the last setState),
  // one orphaned at status='active' forever (until auto_close_stale_sessions
  // catches it hours later). Confirmed root cause of the session stuck in
  // "Treinando" during Fase 3 testing, 2026-08-01.
  const sessionStartedRef = React.useRef(false);

  React.useEffect(() => {
    // A workout must never silently "start" (timer running) with zero
    // exercises — that traps the user on a blank screen with no finish CTA.
    // Surface it explicitly instead (see system audit follow-up, 2026-07-09).
    if (!exercises?.length) { setNoPlan(true); setPhase('active'); return; }
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    const sessionInput: { planId: string | null; exercises: GeneratedWorkoutExercise[]; forUserId?: string; planned_duration_min?: number } = { planId, exercises };
    if (clientUserId)        sessionInput.forUserId            = clientUserId;
    if (plannedDurationMin)  sessionInput.planned_duration_min = plannedDurationMin;
    startWorkoutSession(sessionInput).then(({ data, error }) => {
      if (error || !data) {
        setInitErr(tr('client.mode.offlineSaved'));
        const fallback: ExState[] = exercises.map((ex, i) => makeExState(`offline-${i}`, ex, i));
        setExStates(fallback);
      } else {
        setSessionId(data.sessionId);
        setExStates(data.sessionExercises.map((se, i) =>
          makeExState(se.id, {
            exercise_name:    se.exercise_name,
            muscle_group:     se.muscle_group,
            sets:             se.sets_prescribed,
            reps:             se.reps_prescribed,
            duration_seconds: se.duration_seconds_prescribed,
            load_kg:          se.load_kg_prescribed,
            rest_seconds:     se.rest_seconds,
            notes:            se.notes,
            phase:            se.phase ?? null,
          }, i)
        ));
      }
      setPhase('active');
    });
  // Intentional run-once-on-mount: starts the workout session exactly once
  // when entering this screen. Re-running on prop changes (e.g. exercises,
  // planId) mid-session would create duplicate sessions and reset progress.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Elapsed timer ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Rest countdown ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (phase !== 'rest') return;
    if (restSec <= 0) {
      if (soundsRef.current) { soundRestEnd(); vibrate('rest_end'); }
      setPhase('active');
      return;
    }
    const id = setTimeout(() => setRestSec(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, restSec]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const activeEx     = exStates[activeIdx];
  const doneCount    = exStates.filter(e => e.status === 'completed' || e.status === 'skipped').length;
  const allDone      = doneCount === exStates.length && exStates.length > 0;
  const isOffline    = (id: string) => id.startsWith('offline-');

  // Translates trainer-typed exercise names/notes to this client's locale —
  // AI-generated content is already in the right language at generation time.
  // Only the name respects the keep-English-names toggle (docs/
  // EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md, D1) — notes always follow the
  // client's own app language.
  const translateName = useTranslatedExerciseContent(
    exStates.map(e => e.name),
    resolveExerciseNameLocale({ keepExerciseNamesInEnglish, language: i18n.language as AppLanguage }),
  );
  const translateNote = useTranslatedExerciseContent(
    exStates.map(e => e.notes),
  );

  const updateEx = (idx: number, patch: Partial<ExState>) =>
    setExStates(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));

  const advanceToNext = (fromIdx: number) => {
    const next = exStates.findIndex((e, i) => i > fromIdx && e.status === 'pending');
    if (next !== -1) setActiveIdx(next);
  };

  // ── Open set form ────────────────────────────────────────────────────────────
  const openSetForm = () => {
    if (!activeEx) return;
    setSetReps(String(activeEx.repsPrescribed ?? ''));
    setSetLoad(String(activeEx.loadPrescribed ?? ''));
    setSetDuration(String(activeEx.durationSecondsPrescribed ?? ''));
    setSetRpe(7);
    if (activeEx.status === 'pending') {
      updateEx(activeIdx, { status: 'in_progress' });
      if (sessionId && !isOffline(activeEx.id))
        syncExerciseStatus(activeEx.id, 'in_progress');
    }
    setPhase('set_form');
  };

  // Persists an exercise status; on failure the update is queued for replay
  // instead of being lost (the local UI state is the source of truth mid-workout).
  const syncExerciseStatus = (exId: string, status: SessionExerciseStatus, skippedReason?: string) => {
    updateSessionExerciseStatus(exId, status, skippedReason).then(({ error }) => {
      if (error) {
        enqueue({ kind: 'exercise_status', payload: { session_exercise_id: exId, status, skipped_reason: skippedReason ?? null } });
        setSyncPending(true);
      }
    });
  };

  // ── Confirm set ──────────────────────────────────────────────────────────────
  const confirmSet = async () => {
    if (!activeEx || savingSet) return;
    setSavingSet(true);
    const reps       = parseInt(setReps)     || null;
    const load       = parseFloat(setLoad)   || null;
    const durationS  = parseInt(setDuration) || null;
    const newSets = activeEx.setsLogged + 1;
    const localLog = { set_number: newSets, reps_done: reps, load_kg: load, rpe: setRpe, duration_seconds: durationS, completed_at: new Date().toISOString() };

    // Local record first — the set is never lost, whatever the network does.
    const newSetLogs = [...activeEx.setLogs, localLog];

    if (sessionId && !isOffline(activeEx.id)) {
      const { error } = await logWorkoutSet({
        session_exercise_id: activeEx.id,
        session_id:          sessionId,
        set_number:          newSets,
        reps_done:           reps,
        load_kg:             load,
        rpe:                 setRpe,
        duration_seconds:    durationS,
      });
      if (error) {
        enqueue({ kind: 'set_log', payload: { ...localLog, session_exercise_id: activeEx.id, session_id: sessionId } });
        setSyncPending(true);
      }
    }

    if (soundsRef.current) { soundSetDone(); vibrate('set_done'); }

    if (newSets >= activeEx.setsPrescribed) {
      updateEx(activeIdx, { setsLogged: newSets, setLogs: newSetLogs, status: 'completed' });
      if (sessionId && !isOffline(activeEx.id))
        syncExerciseStatus(activeEx.id, 'completed');
      setPhase('active');
      advanceToNext(activeIdx);
    } else {
      updateEx(activeIdx, { setsLogged: newSets, setLogs: newSetLogs });
      setRestSec(activeEx.restSeconds);
      setPhase('rest');
    }
    setSavingSet(false);
  };

  // ── Skip exercise ────────────────────────────────────────────────────────────
  const skipExercise = () => {
    if (!activeEx) return;
    setSkipReasonOption('');
    setSkipCustomReason('');
    setPhase('skip_form');
  };

  const confirmSkip = async () => {
    if (!activeEx) return;
    const finalReason = skipReasonOption === 'Other'
      ? skipCustomReason.trim()
      : (skipCustomReason.trim()
          ? `${skipReasonOption}: ${skipCustomReason.trim()}`
          : skipReasonOption);

    updateEx(activeIdx, { status: 'skipped', skippedReason: finalReason || null });
    if (sessionId && !isOffline(activeEx.id)) {
      syncExerciseStatus(activeEx.id, 'skipped', finalReason);
    }
    setPhase('active');
    advanceToNext(activeIdx);
  };

  // ── Submit pain ──────────────────────────────────────────────────────────────
  const submitPain = async () => {
    if (!painRegion || !sessionId) { setPhase('active'); return; }
    await reportWorkoutPain({
      session_id:          sessionId,
      session_exercise_id: activeEx && !isOffline(activeEx.id) ? activeEx.id : null,
      body_region:         painRegion,
      intensity:           painIntensity,
    });
    void updatePainRecurrence(painRegion);
    setPainRegion('');
    setPainIntensity(5);
    setPhase('active');
  };

  // ── Finish ───────────────────────────────────────────────────────────────────
  const finishWorkout = async () => {
    if (finishing) return;
    setFinishing(true);
    const completedAt  = new Date();
    const durationMin  = Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 60_000));
    const totalSets    = exStates.reduce((n, e) => n + e.setsLogged, 0);
    const completedCnt = exStates.filter(e => e.status === 'completed').length;

    const resolvedSessionId = sessionId;

    if (!resolvedSessionId) {
      // Session row was never created (offline from the start). Queue the FULL
      // workout — exercises, final statuses and every locally recorded set —
      // and try to replay immediately in case connectivity is back. No more
      // empty "rescue" sessions that silently discard per-set data.
      const ownerId = clientUserId ?? _user.id;
      if (ownerId && exStates.length > 0) {
        const fullSession: QueuedFullSession = {
          user_id:            ownerId,
          plan_id:            planId,
          started_at:         startedAt.toISOString(),
          completed_at:       completedAt.toISOString(),
          total_duration_min: durationMin,
          exercises: exStates.map((e, i) => ({
            exercise_name:               e.name,
            muscle_group:                e.muscleGroup || null,
            order_index:                 i,
            sets_prescribed:             e.setsPrescribed,
            reps_prescribed:             e.repsPrescribed,
            duration_seconds_prescribed: e.durationSecondsPrescribed,
            load_kg_prescribed:          e.loadPrescribed,
            rest_seconds:                e.restSeconds,
            notes:                       e.notes,
            status:                      e.status,
            skipped_reason:              e.skippedReason,
            set_logs:                    e.setLogs,
          })),
        };
        enqueue({ kind: 'full_session', payload: fullSession });
        setSyncPending(true);
        await flush();
      }
    } else {
      const { error } = await completeWorkoutSession({
        sessionId:          resolvedSessionId,
        completed_at:       completedAt.toISOString(),
        total_duration_min: durationMin,
        planId,
      });
      if (error) {
        enqueue({ kind: 'session_complete', payload: {
          session_id:         resolvedSessionId,
          completed_at:       completedAt.toISOString(),
          total_duration_min: durationMin,
          plan_id:            planId,
        } });
        setSyncPending(true);
      }
    }

    if (soundsRef.current) { soundWorkoutDone(); vibrate('workout_done'); }
    nav('workoutSummary', {
      sessionId:     resolvedSessionId,
      durationMin,
      completedCount: completedCnt,
      total:          exStates.length,
      totalSets,
      startedAt:      startedAt.toISOString(),
      forClientName:  clientName   ?? undefined,
      forClientId:    clientUserId ?? undefined,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* Trainer client badge */}
      {clientName && (
        <div style={{
          margin: '8px 22px 0', padding: '6px 14px', borderRadius: 999,
          background: '#10B98122', border: '1px solid #10B98155',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {tr('client.mode.trainerBadge')}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>
            {clientName}
          </span>
        </div>
      )}

      {/* Timer hero */}
      <div style={{ padding: '4px 22px 14px', textAlign: 'center' }}>
        <div style={{
          fontFamily: '"Plus Jakarta Sans",sans-serif',
          fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em',
          color: t.primary, lineHeight: 1,
        }}>{mm}:{ss}</div>
        <div style={{ fontSize: 12.5, color: textSec(dark), marginTop: 2 }}>
          {tr('client.mode.exercisesDone', { done: doneCount, total: exStates.length })}
        </div>
        <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: dark ? '#1F2E45' : '#E5EAF1', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4, background: t.primary,
            width: exStates.length > 0 ? `${(doneCount / exStates.length) * 100}%` : '0%',
            transition: 'width .4s ease',
          }}/>
        </div>
      </div>

      {initErr && (
        <div style={{ margin: '0 22px 8px', padding: '8px 12px', borderRadius: 10, background: `${t.accent}18`, fontSize: 12, color: t.accent }}>
          {initErr}
        </div>
      )}

      {syncPending && !initErr && (
        <div data-testid="pending-sync-banner" style={{ margin: '0 22px 8px', padding: '8px 12px', borderRadius: 10, background: `${t.accent}18`, fontSize: 12, color: t.accent }}>
          {tr('client.mode.pendingSync')}
        </div>
      )}

      {/* Exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 16px' }}>
        {phase === 'init' && (
          <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
            <Spinner size={28} thickness={3} color={t.primary} trackColor={dark ? '#1F2E45' : '#E5EAF1'} />
          </div>
        )}

        {phase === 'active' && noPlan && (
          <div data-testid="no-plan-error" style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <Icon name="info" size={28} color={t.accent}/>
            <div style={{ fontSize: 14, fontWeight: 700, color: textPri(dark) }}>{tr('client.mode.noPlanTitle')}</div>
            <div style={{ fontSize: 12.5, color: textSec(dark), maxWidth: 260 }}>{tr('client.mode.noPlanBody')}</div>
            <button onClick={() => nav('workout')} style={{
              marginTop: 4, padding: '10px 20px', borderRadius: 999, border: 'none',
              background: t.primary, color: '#0E1A2B', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>{tr('common.back')}</button>
          </div>
        )}

        {phase !== 'init' && !noPlan && exStates.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            translateName={translateName}
            translateNote={translateNote}
            isActive={i === activeIdx && !allDone}
            dark={dark}
            t={t}
            onLogSet={openSetForm}
            onSkip={skipExercise}
            onPain={() => { setPainRegion(''); setPhase('pain_form'); }}
            onSetActive={() => {
              if (ex.status === 'pending' || ex.status === 'in_progress') setActiveIdx(i);
            }}
          />
        ))}

        {/* Finish CTA */}
        {phase === 'active' && (allDone || exStates.length > 0) && (
          <div style={{ paddingTop: 16 }}>
            <button
              onClick={finishWorkout}
              disabled={finishing}
              data-testid="finish-workout-btn"
              style={{
                ...primaryBtn(t.primary),
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: finishing ? 0.6 : 1,
              }}
            >
              <Icon name="trophy" size={16} color="#0E1A2B"/>
              {finishing ? tr('client.mode.saving') : tr('client.mode.finishWorkout')}
            </button>
          </div>
        )}
      </div>

      {/* ── Overlay: Set form ── */}
      {phase === 'set_form' && activeEx && (
        <BottomPanel title={tr('client.mode.setFormTitle', { current: activeEx.setsLogged + 1, total: activeEx.setsPrescribed, name: activeEx.name })} dark={dark}>
          {activeEx.durationSecondsPrescribed != null && activeEx.repsPrescribed == null ? (
            <LabeledInput label={tr('client.mode.durationSec')} value={setDuration} onChange={setSetDuration} type="number" dark={dark}/>
          ) : (
            <LabeledInput label={tr('client.mode.reps')} value={setReps} onChange={setSetReps} type="number" dark={dark}/>
          )}
          <LabeledInput label={tr('client.mode.loadKg')} value={setLoad} onChange={setSetLoad} type="number" dark={dark}/>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
              {tr('client.mode.rpeLabel', { value: setRpe })}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setSetRpe(n)} style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: setRpe === n ? t.primary : surfRaised(dark),
                  color: setRpe === n ? '#0E1A2B' : textPri(dark),
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => setPhase('active')} style={{
              flex: 1, padding: '12px 0', borderRadius: 999, border: `1.5px solid ${borderSubtle(dark)}`,
              background: 'transparent', color: textPri(dark), fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>{tr('client.mode.cancel')}</button>
            <button onClick={() => void confirmSet()} disabled={savingSet} data-testid="confirm-set-btn" style={{
              flex: 2, ...primaryBtn(t.primary),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: savingSet ? 0.6 : 1,
            }}>{savingSet ? tr('client.mode.saving') : tr('client.mode.confirmSet')}</button>
          </div>
        </BottomPanel>
      )}

      {/* ── Overlay: Rest timer ── */}
      {phase === 'rest' && (
        <BottomPanel title={tr('client.mode.rest')} dark={dark}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 52, fontWeight: 700, color: t.primary, lineHeight: 1 }}>
              {String(Math.floor(restSec / 60)).padStart(2,'0')}:{String(restSec % 60).padStart(2,'0')}
            </div>
            <div style={{ fontSize: 12.5, color: textSec(dark), marginTop: 4 }}>{tr('client.mode.secondsRemaining')}</div>
          </div>
          <button onClick={() => setPhase('active')} style={{
            ...primaryBtn(t.primary),
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{tr('client.mode.skipRest')}</button>
        </BottomPanel>
      )}

      {/* ── Overlay: Pain form ── */}
      {phase === 'pain_form' && (
        <BottomPanel title={tr('client.mode.reportPain')} dark={dark}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
              {tr('client.mode.bodyRegion')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {painRegions.map(r => (
                <button key={r.value} onClick={() => setPainRegion(r.value)} style={{
                  padding: '7px 12px', borderRadius: 999,
                  background: painRegion === r.value ? `${t.accent}22` : surfRaised(dark),
                  color: painRegion === r.value ? t.accent : textSec(dark),
                  border: `1.5px solid ${painRegion === r.value ? t.accent : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}>{r.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
              {tr('client.mode.painIntensityLabel', { value: painIntensity })}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setPainIntensity(n)} style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: painIntensity === n ? t.accent : surfRaised(dark),
                  color: painIntensity === n ? '#fff' : textPri(dark),
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => setPhase('active')} style={{
              flex: 1, padding: '12px 0', borderRadius: 999, border: `1.5px solid ${borderSubtle(dark)}`,
              background: 'transparent', color: textPri(dark), fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>{tr('client.mode.cancel')}</button>
            <button onClick={() => void submitPain()} disabled={!painRegion} style={{
              flex: 2, ...primaryBtn(t.accent),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: painRegion ? 1 : 0.45,
            }}>{tr('client.mode.report')}</button>
          </div>
        </BottomPanel>
      )}

      {/* ── Overlay: Skip form ── */}
      {phase === 'skip_form' && activeEx && (
        <BottomPanel title={tr('client.mode.skipTitle', { name: activeEx.name })} dark={dark}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
              {tr('client.mode.skipReasonLabel')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skipOptions.map(opt => (
                <button key={opt} onClick={() => setSkipReasonOption(opt)} style={{
                  padding: '7px 12px', borderRadius: 14,
                  background: skipReasonOption === opt ? `${t.primary}22` : surfRaised(dark),
                  color: skipReasonOption === opt ? t.primary : textSec(dark),
                  border: `1.5px solid ${skipReasonOption === opt ? t.primary : borderSubtle(dark)}`,
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                }}>{opt}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
              {skipReasonOption === 'Other' ? tr('client.mode.specifyRequired') : tr('client.mode.commentsOptional')}
            </div>
            <input
              type="text"
              value={skipCustomReason}
              onChange={e => setSkipCustomReason(e.target.value)}
              placeholder={skipReasonOption === 'Other' ? tr('client.mode.typeReason') : tr('client.mode.typeComments')}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', borderRadius: 10,
                border: `1.5px solid ${borderSubtle(dark)}`,
                background: surfRaised(dark), color: textPri(dark),
                fontFamily: 'inherit', fontSize: 14, fontWeight: 600, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={() => setPhase('active')} style={{
              flex: 1, padding: '12px 0', borderRadius: 14, border: `1.5px solid ${borderSubtle(dark)}`,
              background: 'transparent', color: textPri(dark), fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>{tr('client.mode.cancel')}</button>
            <button
              onClick={() => void confirmSkip()}
              disabled={!skipReasonOption || (skipReasonOption === 'Other' && !skipCustomReason.trim())}
              style={{
                flex: 2, ...primaryBtn(t.primary),
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                opacity: (!skipReasonOption || (skipReasonOption === 'Other' && !skipCustomReason.trim())) ? 0.45 : 1,
              }}
            >
              {tr('client.mode.confirmSkip')}
            </button>
          </div>
        </BottomPanel>
      )}
    </div>
  );
}

// ── Factory ───────────────────────────────────────────────────────────────────

function makeExState(id: string, ex: Partial<GeneratedWorkoutExercise> & { exercise_name?: string; muscle_group?: string | null }, _i: number): ExState {
  return {
    id,
    name:                      ex.exercise_name ?? '',
    muscleGroup:               ex.muscle_group  ?? '',
    setsPrescribed:            ex.sets          ?? 3,
    repsPrescribed:            ex.reps          ?? null,
    durationSecondsPrescribed: ex.duration_seconds ?? null,
    loadPrescribed:            ex.load_kg       ?? null,
    restSeconds:               ex.rest_seconds  ?? 60,
    notes:                     ex.notes         ?? null,
    status:                    'pending',
    setsLogged:                0,
    setLogs:                   [],
    skippedReason:             null,
    phase:                     ex.phase ?? null,
  };
}
