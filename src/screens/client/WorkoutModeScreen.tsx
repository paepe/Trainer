import React from 'react';
import { Icon } from '../../components';
import { surfRaised, borderSubtle, textPri, textSec, textMute, primaryBtn } from '../../theme';
import type { NavFn } from '../../types';
import type { GeneratedWorkoutExercise } from '../../lib/workoutGeneration';
import type { WorkoutSessionExercise, SessionExerciseStatus } from '../../types/workout';
import { vibrate } from '../../lib/haptics';
import { soundSetDone, soundRestEnd, soundWorkoutDone } from '../../lib/audio';

interface Theme {
  primary:     string;
  primarySoft: string;
  accent:      string;
}

interface AppUser { id: string | null }

type Phase = 'init' | 'active' | 'set_form' | 'rest' | 'pain_form' | 'skip_form';

interface ExState {
  id:             string;
  name:           string;
  muscleGroup:    string;
  setsPrescribed: number;
  repsPrescribed: number | null;
  loadPrescribed: number | null;
  restSeconds:    number;
  notes:          string | null;
  status:         SessionExerciseStatus;
  setsLogged:     number;
}

interface WorkoutModeScreenProps {
  nav:                         NavFn;
  t:                           Theme;
  dark:                        boolean;
  user:                        AppUser;
  planId:                      string | null;
  exercises:                   GeneratedWorkoutExercise[] | null;
  clientUserId?:               string;   // trainer acting on behalf of client
  clientName?:                 string;   // for the workout header
  startWorkoutSession:         (input: { planId: string | null; exercises: GeneratedWorkoutExercise[]; forUserId?: string }) => Promise<{ data: { sessionId: string; sessionExercises: WorkoutSessionExercise[] } | null; error: unknown }>;
  logWorkoutSet:               (data: { session_exercise_id: string; session_id: string; set_number: number; reps_done: number | null; load_kg: number | null; rpe: number | null }) => Promise<{ error: unknown }>;
  updateSessionExerciseStatus: (sessionExerciseId: string, status: SessionExerciseStatus, skippedReason?: string) => Promise<{ error: unknown }>;
  reportWorkoutPain:           (data: { session_id: string; session_exercise_id: string | null; body_region: string; intensity: number }) => Promise<{ error: unknown }>;
  completeWorkoutSession:      (data: { sessionId: string; completed_at: string; total_duration_min: number; notes?: string | null }) => Promise<{ error: unknown }>;
  updatePainRecurrence:        (region: string) => Promise<{ error: unknown }>;
  sounds?:                     boolean;
}

const PAIN_REGIONS: { value: string; label: string }[] = [
  { value: 'neck',       label: 'Neck'       }, { value: 'shoulder',   label: 'Shoulder'  },
  { value: 'elbow',      label: 'Elbow'      }, { value: 'wrist',      label: 'Wrist'     },
  { value: 'upper_back', label: 'Upper Back' }, { value: 'lower_back', label: 'Lower Back'},
  { value: 'hip',        label: 'Hip'        }, { value: 'knee',       label: 'Knee'      },
  { value: 'ankle',      label: 'Ankle'      }, { value: 'other',      label: 'Other'     },
];
const SKIP_OPTIONS = ['Pain / Injury', 'Lack of Equipment', 'Fatigue / Energy', 'Time Constraint', 'Other'];

export function WorkoutModeScreen({
  nav, t, dark, user, planId, exercises, clientUserId, clientName,
  startWorkoutSession, logWorkoutSet, updateSessionExerciseStatus,
  reportWorkoutPain, completeWorkoutSession, updatePainRecurrence,
  sounds = false,
}: WorkoutModeScreenProps) {
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

  // Set form
  const [setReps, setSetReps] = React.useState('');
  const [setLoad, setSetLoad] = React.useState('');
  const [setRpe,  setSetRpe]  = React.useState(7);

  // Rest timer
  const [restSec, setRestSec] = React.useState(0);

  // Pain form
  const [painRegion,    setPainRegion]    = React.useState('');
  const [painIntensity, setPainIntensity] = React.useState(5);

  // Skip form
  const [skipReasonOption, setSkipReasonOption] = React.useState('');
  const [skipCustomReason, setSkipCustomReason] = React.useState('');

  // ── Init ─────────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!exercises?.length) { setPhase('active'); return; }

    const sessionInput: { planId: string | null; exercises: GeneratedWorkoutExercise[]; forUserId?: string } = { planId, exercises };
    if (clientUserId) sessionInput.forUserId = clientUserId;
    startWorkoutSession(sessionInput).then(({ data, error }) => {
      if (error || !data) {
        setInitErr('Session saved locally — online sync failed.');
        const fallback: ExState[] = exercises.map((ex, i) => makeExState(`offline-${i}`, ex, i));
        setExStates(fallback);
      } else {
        setSessionId(data.sessionId);
        setExStates(data.sessionExercises.map((se, i) =>
          makeExState(se.id, {
            exercise_name: se.exercise_name,
            muscle_group:  se.muscle_group,
            sets:          se.sets_prescribed,
            reps:          se.reps_prescribed,
            load_kg:       se.load_kg_prescribed,
            rest_seconds:  se.rest_seconds,
            notes:         se.notes,
          }, i)
        ));
      }
      setPhase('active');
    });
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
    setSetRpe(7);
    if (activeEx.status === 'pending') {
      updateEx(activeIdx, { status: 'in_progress' });
      if (sessionId && !isOffline(activeEx.id))
        void updateSessionExerciseStatus(activeEx.id, 'in_progress');
    }
    setPhase('set_form');
  };

  // ── Confirm set ──────────────────────────────────────────────────────────────
  const confirmSet = async () => {
    if (!activeEx) return;
    const reps    = parseInt(setReps)   || null;
    const load    = parseFloat(setLoad) || null;
    const newSets = activeEx.setsLogged + 1;

    if (sessionId && !isOffline(activeEx.id)) {
      await logWorkoutSet({
        session_exercise_id: activeEx.id,
        session_id:          sessionId,
        set_number:          newSets,
        reps_done:           reps,
        load_kg:             load,
        rpe:                 setRpe,
      });
    }

    if (soundsRef.current) { soundSetDone(); vibrate('set_done'); }

    if (newSets >= activeEx.setsPrescribed) {
      updateEx(activeIdx, { setsLogged: newSets, status: 'completed' });
      if (sessionId && !isOffline(activeEx.id))
        void updateSessionExerciseStatus(activeEx.id, 'completed');
      setPhase('active');
      advanceToNext(activeIdx);
    } else {
      updateEx(activeIdx, { setsLogged: newSets });
      setRestSec(activeEx.restSeconds);
      setPhase('rest');
    }
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

    updateEx(activeIdx, { status: 'skipped' });
    if (sessionId && !isOffline(activeEx.id)) {
      void updateSessionExerciseStatus(activeEx.id, 'skipped', finalReason);
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

    if (sessionId) {
      await completeWorkoutSession({
        sessionId,
        completed_at:       completedAt.toISOString(),
        total_duration_min: durationMin,
      });
    }

    if (soundsRef.current) { soundWorkoutDone(); vibrate('workout_done'); }
    nav('workoutSummary', { sessionId, durationMin, completedCount: completedCnt, total: exStates.length, totalSets, startedAt: startedAt.toISOString() });
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
            Training
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
          {doneCount} / {exStates.length} exercises done
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

      {/* Exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 16px' }}>
        {phase === 'init' && (
          <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `3px solid ${dark ? '#1F2E45' : '#E5EAF1'}`, borderTopColor: t.primary,
              animation: 'spin 0.7s linear infinite',
            }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {phase !== 'init' && exStates.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
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
              style={{
                ...primaryBtn(t.primary),
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: finishing ? 0.6 : 1,
              }}
            >
              <Icon name="trophy" size={16} color="#0E1A2B"/>
              {finishing ? 'Saving…' : 'Finish Workout'}
            </button>
          </div>
        )}
      </div>

      {/* ── Overlay: Set form ── */}
      {phase === 'set_form' && activeEx && (
        <BottomPanel title={`Set ${activeEx.setsLogged + 1} of ${activeEx.setsPrescribed} — ${activeEx.name}`} dark={dark} t={t}>
          <LabeledInput label="Reps" value={setReps} onChange={setSetReps} type="number" dark={dark}/>
          <LabeledInput label="Load (kg)" value={setLoad} onChange={setSetLoad} type="number" dark={dark}/>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
              RPE — {setRpe}
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
            }}>Cancel</button>
            <button onClick={() => void confirmSet()} style={{
              flex: 2, ...primaryBtn(t.primary),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>Confirm Set</button>
          </div>
        </BottomPanel>
      )}

      {/* ── Overlay: Rest timer ── */}
      {phase === 'rest' && (
        <BottomPanel title="Rest" dark={dark} t={t}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontSize: 52, fontWeight: 700, color: t.primary, lineHeight: 1 }}>
              {String(Math.floor(restSec / 60)).padStart(2,'0')}:{String(restSec % 60).padStart(2,'0')}
            </div>
            <div style={{ fontSize: 12.5, color: textSec(dark), marginTop: 4 }}>seconds remaining</div>
          </div>
          <button onClick={() => setPhase('active')} style={{
            ...primaryBtn(t.primary),
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>Skip Rest</button>
        </BottomPanel>
      )}

      {/* ── Overlay: Pain form ── */}
      {phase === 'pain_form' && (
        <BottomPanel title="Report Pain" dark={dark} t={t}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
              Body Region
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PAIN_REGIONS.map(r => (
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
              Intensity — {painIntensity}
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
            }}>Cancel</button>
            <button onClick={() => void submitPain()} disabled={!painRegion} style={{
              flex: 2, ...primaryBtn(t.accent),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: painRegion ? 1 : 0.45,
            }}>Report</button>
          </div>
        </BottomPanel>
      )}

      {/* ── Overlay: Skip form ── */}
      {phase === 'skip_form' && activeEx && (
        <BottomPanel title={`Skip Exercise — ${activeEx.name}`} dark={dark} t={t}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 8 }}>
              Reason for skipping
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SKIP_OPTIONS.map(opt => (
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
              {skipReasonOption === 'Other' ? 'Please specify (required)' : 'Additional comments (optional)'}
            </div>
            <input
              type="text"
              value={skipCustomReason}
              onChange={e => setSkipCustomReason(e.target.value)}
              placeholder={skipReasonOption === 'Other' ? 'Type reason...' : 'Type comments...'}
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
            }}>Cancel</button>
            <button
              onClick={() => void confirmSkip()}
              disabled={!skipReasonOption || (skipReasonOption === 'Other' && !skipCustomReason.trim())}
              style={{
                flex: 2, ...primaryBtn(t.primary),
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                opacity: (!skipReasonOption || (skipReasonOption === 'Other' && !skipCustomReason.trim())) ? 0.45 : 1,
              }}
            >
              Confirm Skip
            </button>
          </div>
        </BottomPanel>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  ex:          ExState;
  isActive:    boolean;
  dark:        boolean;
  t:           { primary: string; accent: string };
  onLogSet:    () => void;
  onSkip:      () => void;
  onPain:      () => void;
  onSetActive: () => void;
}

function ExerciseCard({ ex, isActive, dark, t, onLogSet, onSkip, onPain, onSetActive }: ExerciseCardProps) {
  const statusColor = ex.status === 'completed' ? t.primary
    : ex.status === 'skipped' ? textMute(dark)
    : ex.status === 'in_progress' ? t.primary
    : borderSubtle(dark);

  return (
    <div
      onClick={onSetActive}
      style={{
        marginBottom: 10, borderRadius: 14, overflow: 'hidden',
        background: surfRaised(dark),
        border: `1.5px solid ${isActive ? t.primary : borderSubtle(dark)}`,
        opacity: ex.status === 'skipped' ? 0.55 : 1,
        transition: 'border-color .2s, opacity .2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 10px' }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: statusColor,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: textPri(dark),
            textDecoration: ex.status === 'skipped' ? 'line-through' : 'none',
          }}>{ex.name}</div>
          <div style={{ fontSize: 11.5, color: textMute(dark), marginTop: 1 }}>
            {[
              ex.muscleGroup,
              ex.setsPrescribed && ex.repsPrescribed ? `${ex.setsPrescribed}×${ex.repsPrescribed}` : null,
              ex.loadPrescribed ? `${ex.loadPrescribed} kg` : null,
              ex.restSeconds    ? `${ex.restSeconds}s rest`  : null,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        {ex.status === 'completed' && <Icon name="check" size={16} color={t.primary} stroke={2.5}/>}
      </div>

      {/* Active controls */}
      {isActive && ex.status !== 'completed' && ex.status !== 'skipped' && (
        <div style={{ padding: '0 14px 14px' }}>
          {/* Sets progress dots */}
          {ex.setsPrescribed > 1 && (
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              {Array.from({ length: ex.setsPrescribed }, (_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i < ex.setsLogged ? t.primary : (dark ? '#1F2E45' : '#E5EAF1'),
                  transition: 'background .2s',
                }}/>
              ))}
              <span style={{ fontSize: 11.5, color: textSec(dark), marginLeft: 4 }}>
                {ex.setsLogged}/{ex.setsPrescribed} sets
              </span>
            </div>
          )}
          {ex.notes && (
            <div style={{ fontSize: 11.5, color: t.primary, fontStyle: 'italic', marginBottom: 10 }}>
              {ex.notes}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={(e) => { e.stopPropagation(); onLogSet(); }} style={{
              flex: 2, padding: '10px 0', borderRadius: 14, border: 'none',
              background: t.primary, color: '#0E1A2B',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name="play" size={12} color="#0E1A2B" stroke={2.5}/> Log Set
            </button>
            <button onClick={(e) => { e.stopPropagation(); onPain(); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 999,
              border: `1.5px solid ${t.accent}55`, background: 'transparent',
              color: t.accent, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            }}>Pain</button>
            <button onClick={(e) => { e.stopPropagation(); onSkip(); }} style={{
              flex: 1, padding: '10px 0', borderRadius: 999,
              border: `1.5px solid ${borderSubtle(dark)}`, background: 'transparent',
              color: textSec(dark), fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}>Skip</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface BottomPanelProps {
  title:    string;
  dark:     boolean;
  t:        { primary: string; accent: string };
  children: React.ReactNode;
}

function BottomPanel({ title, dark, children }: BottomPanelProps) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      background: dark ? '#0E1A2B' : '#fff',
      borderTop: `1px solid ${borderSubtle(dark)}`,
      borderRadius: '20px 20px 0 0',
      padding: '20px 22px 32px',
      boxShadow: '0 -8px 32px rgba(0,0,0,.3)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: dark ? '#fff' : '#0E1A2B' }}>{title}</div>
      {children}
    </div>
  );
}

interface LabeledInputProps {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  type:     string;
  dark:     boolean;
}

function LabeledInput({ label, value, onChange, type, dark }: LabeledInputProps) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: textMute(dark), marginBottom: 6 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="decimal"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: 10,
          border: `1.5px solid ${borderSubtle(dark)}`,
          background: surfRaised(dark), color: textPri(dark),
          fontFamily: 'inherit', fontSize: 15, fontWeight: 600, outline: 'none',
        }}
      />
    </div>
  );
}

// ── Factory ───────────────────────────────────────────────────────────────────

function makeExState(id: string, ex: Partial<GeneratedWorkoutExercise> & { exercise_name?: string; muscle_group?: string | null }, _i: number): ExState {
  return {
    id,
    name:           ex.exercise_name ?? '',
    muscleGroup:    ex.muscle_group  ?? '',
    setsPrescribed: ex.sets          ?? 3,
    repsPrescribed: ex.reps          ?? null,
    loadPrescribed: ex.load_kg       ?? null,
    restSeconds:    ex.rest_seconds  ?? 60,
    notes:          ex.notes         ?? null,
    status:         'pending',
    setsLogged:     0,
  };
}
