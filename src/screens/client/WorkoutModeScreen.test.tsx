import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { WorkoutModeScreen } from './WorkoutModeScreen';
import * as syncQueue from '../../lib/workoutSyncQueue';
import type { GeneratedWorkoutExercise } from '../../lib/workoutGeneration';

// Validates the P1 remediation (system-audit-trainer-20260707.md, Area 4):
// a failed network write during an active workout must never be silently
// discarded — it must be queued for replay and surfaced to the user.

vi.mock('../../lib/workoutSyncQueue', () => ({
  enqueue: vi.fn(),
  flush: vi.fn().mockResolvedValue(undefined),
  pendingCount: vi.fn().mockReturnValue(0),
}));

const theme = { primary: '#2DD4E0', primarySoft: '#2DD4E022', accent: '#EF5B3C' };
const exercises: GeneratedWorkoutExercise[] = [
  { exercise_name: 'Squat', muscle_group: 'Legs', sets: 1, reps: 10, duration_seconds: null, load_kg: 40, rest_seconds: 60, notes: null },
];

function makeProps(overrides: Partial<Parameters<typeof WorkoutModeScreen>[0]> = {}) {
  return {
    nav: vi.fn(),
    t: theme,
    dark: true,
    user: { id: 'client-1' },
    planId: 'plan-1',
    exercises,
    startWorkoutSession: vi.fn().mockResolvedValue({
      data: {
        sessionId: 'session-1',
        sessionExercises: [{
          id: 'ex-1', session_id: 'session-1', exercise_name: 'Squat', muscle_group: 'Legs',
          order_index: 0, sets_prescribed: 1, reps_prescribed: 10, duration_seconds_prescribed: null, load_kg_prescribed: 40,
          rest_seconds: 60, notes: null, status: 'pending', skipped_reason: null,
        }],
      },
      error: null,
    }),
    logWorkoutSet: vi.fn().mockResolvedValue({ error: null }),
    updateSessionExerciseStatus: vi.fn().mockResolvedValue({ error: null }),
    reportWorkoutPain: vi.fn().mockResolvedValue({ error: null }),
    completeWorkoutSession: vi.fn().mockResolvedValue({ error: null }),
    updatePainRecurrence: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

async function logOneSet() {
  fireEvent.click(await screen.findByTestId('log-set-btn'));
  fireEvent.click(screen.getByTestId('confirm-set-btn'));
  await waitFor(() => expect(screen.queryByTestId('confirm-set-btn')).not.toBeInTheDocument());
}

describe('WorkoutModeScreen — offline resilience', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queues the set and shows the pending-sync banner when logWorkoutSet fails', async () => {
    const props = makeProps({ logWorkoutSet: vi.fn().mockResolvedValue({ error: 'network down' }) });
    render(<WorkoutModeScreen {...props} />);

    await logOneSet();

    expect(syncQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'set_log',
      payload: expect.objectContaining({ session_exercise_id: 'ex-1', session_id: 'session-1' }),
    }));
    expect(await screen.findByTestId('pending-sync-banner')).toBeInTheDocument();
  });

  it('does not queue or show the banner when logWorkoutSet succeeds', async () => {
    const props = makeProps();
    render(<WorkoutModeScreen {...props} />);

    await logOneSet();

    expect(syncQueue.enqueue).not.toHaveBeenCalled();
    expect(screen.queryByTestId('pending-sync-banner')).not.toBeInTheDocument();
  });

  it('disables the confirm-set button while the request is in flight (no duplicate submits)', async () => {
    let resolveLog: (v: { error: null }) => void = () => {};
    const logWorkoutSet = vi.fn().mockReturnValue(new Promise(res => { resolveLog = res; }));
    render(<WorkoutModeScreen {...makeProps({ logWorkoutSet })} />);

    fireEvent.click(await screen.findByTestId('log-set-btn'));
    const confirmBtn = screen.getByTestId('confirm-set-btn') as HTMLButtonElement;
    fireEvent.click(confirmBtn);

    // Still awaiting the network call — a second click must not fire a second insert.
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.click(confirmBtn);
    expect(logWorkoutSet).toHaveBeenCalledTimes(1);

    resolveLog({ error: null });
    await waitFor(() => expect(screen.queryByTestId('confirm-set-btn')).not.toBeInTheDocument());
  });

  it('queues a session_complete item when completeWorkoutSession fails', async () => {
    const props = makeProps({ completeWorkoutSession: vi.fn().mockResolvedValue({ error: 'timeout' }) });
    render(<WorkoutModeScreen {...props} />);

    await logOneSet();
    fireEvent.click(await screen.findByTestId('finish-workout-btn'));

    await waitFor(() => expect(syncQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'session_complete',
      payload: expect.objectContaining({ session_id: 'session-1' }),
    })));
  });

  it('queues a full_session (session + exercises + set logs) and flushes when the session never synced (offline from start)', async () => {
    const props = makeProps({ startWorkoutSession: vi.fn().mockResolvedValue({ data: null, error: 'offline' }) });
    render(<WorkoutModeScreen {...props} />);

    // Offline fallback path uses a local 'offline-*' id — log-set-btn still renders.
    await logOneSet();
    fireEvent.click(await screen.findByTestId('finish-workout-btn'));

    await waitFor(() => expect(syncQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'full_session',
      payload: expect.objectContaining({
        user_id: 'client-1',
        plan_id: 'plan-1',
        exercises: expect.arrayContaining([
          expect.objectContaining({
            exercise_name: 'Squat',
            set_logs: expect.arrayContaining([expect.objectContaining({ set_number: 1 })]),
          }),
        ]),
      }),
    })));
    expect(syncQueue.flush).toHaveBeenCalled();
  });

  // Regression for the orphaned-session bug (docs/WORK_SUMMARY_20260801.md,
  // "sessão travada em Treinando"): React.StrictMode double-invokes mount
  // effects in dev (mount → cleanup → mount again). The session-start effect
  // has no cleanup, so without a guard it fired startWorkoutSession() twice
  // per real workout start — a real INSERT each time, orphaning one row.
  it('starts the workout session exactly once, even when StrictMode double-invokes the mount effect', async () => {
    const startWorkoutSession = vi.fn().mockResolvedValue({
      data: { sessionId: 'session-1', sessionExercises: [] },
      error: null,
    });
    render(
      <React.StrictMode>
        <WorkoutModeScreen {...makeProps({ startWorkoutSession })} />
      </React.StrictMode>,
    );

    await waitFor(() => expect(startWorkoutSession).toHaveBeenCalled());
    expect(startWorkoutSession).toHaveBeenCalledTimes(1);
  });
});

// Regression for a bug found live 2026-08-01: this screen used to translate
// every session exercise name assuming a fixed Portuguese source, silently
// altering already-correct AI-generated text on every read (e.g. "Cinta
// rodante" → "Cinta para correr"). Each session exercise now carries its own
// name_source_locale (docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md, D7).
describe('WorkoutModeScreen — exercise name translation by source locale (Fase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  function sessionExercisesWith(nameSourceLocale: string | null) {
    return [{
      id: 'ex-1', session_id: 'session-1', exercise_name: 'Cinta rodante', muscle_group: 'Legs',
      order_index: 0, sets_prescribed: 1, reps_prescribed: 10, duration_seconds_prescribed: null, load_kg_prescribed: 40,
      rest_seconds: 60, notes: null, status: 'pending', skipped_reason: null,
      name_source_locale: nameSourceLocale,
    }];
  }

  it('does not call the translation endpoint when the exercise name is already in the target locale (default target: en)', async () => {
    const startWorkoutSession = vi.fn().mockResolvedValue({
      data: { sessionId: 'session-1', sessionExercises: sessionExercisesWith('en') },
      error: null,
    });
    render(<WorkoutModeScreen {...makeProps({ startWorkoutSession })} />);

    expect(await screen.findByText('Cinta rodante')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("translates the exercise name when its recorded source diverges from the target, instead of silently corrupting already-correct text", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { 'Cinta rodante': 'Treadmill' } }),
    });
    const startWorkoutSession = vi.fn().mockResolvedValue({
      data: { sessionId: 'session-1', sessionExercises: sessionExercisesWith('es') },
      error: null,
    });
    render(<WorkoutModeScreen {...makeProps({ startWorkoutSession })} />);

    expect(await screen.findByText('Treadmill')).toBeInTheDocument();
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body as string);
    expect(body.sourceLocale).toBe('es');
    expect(body.targetLocale).toBe('en');
  });

  it('falls back to pt source for a session exercise with no recorded name_source_locale (legacy)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ translations: { 'Cinta rodante': 'Cinta rodante' } }),
    });
    const startWorkoutSession = vi.fn().mockResolvedValue({
      data: { sessionId: 'session-1', sessionExercises: sessionExercisesWith(null) },
      error: null,
    });
    render(<WorkoutModeScreen {...makeProps({ startWorkoutSession })} />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body as string);
    expect(body.sourceLocale).toBe('pt');
  });
});

// The client now sees the same block grouping the trainer already sees in
// the plan editor (docs/SESSION_STRUCTURE_IMPLEMENTATION_PLAN.md, Decision #3
// follow-up) — session progression itself follows the canonical block order,
// not whatever order_index the plan happened to persist.
describe('WorkoutModeScreen — grouped by session block (client-side follow-up)', () => {
  beforeEach(() => vi.clearAllMocks());

  function sessionExercisesOutOfOrder() {
    // order_index 0-2, but declared blocks are strength → warmup → mobility —
    // the reverse of the canonical sequence, so a passing test proves the
    // screen re-sorts rather than just trusting input order.
    return [
      { id: 'ex-strength', session_id: 's-1', exercise_name: 'Back Squat', muscle_group: 'Legs',
        order_index: 0, sets_prescribed: 3, reps_prescribed: 8, duration_seconds_prescribed: null, load_kg_prescribed: 60,
        rest_seconds: 90, notes: null, status: 'pending', skipped_reason: null, phase: 'strength' },
      { id: 'ex-warmup', session_id: 's-1', exercise_name: 'Jumping Jacks', muscle_group: 'Full body',
        order_index: 1, sets_prescribed: 1, reps_prescribed: null, duration_seconds_prescribed: 60, load_kg_prescribed: null,
        rest_seconds: 30, notes: null, status: 'pending', skipped_reason: null, phase: 'warmup' },
      { id: 'ex-mobility', session_id: 's-1', exercise_name: 'Cat-Cow Stretch', muscle_group: 'Spine',
        order_index: 2, sets_prescribed: 1, reps_prescribed: 10, duration_seconds_prescribed: null, load_kg_prescribed: null,
        rest_seconds: 15, notes: null, status: 'pending', skipped_reason: null, phase: 'mobility' },
    ];
  }

  it('renders exercises in canonical block order (mobility → warmup → strength), not order_index order', async () => {
    const startWorkoutSession = vi.fn().mockResolvedValue({
      data: { sessionId: 'session-1', sessionExercises: sessionExercisesOutOfOrder() },
      error: null,
    });
    render(<WorkoutModeScreen {...makeProps({ startWorkoutSession })} />);

    const names = (await screen.findAllByText(/Cat-Cow Stretch|Jumping Jacks|Back Squat/))
      .map(el => el.textContent);
    expect(names).toEqual(['Cat-Cow Stretch', 'Jumping Jacks', 'Back Squat']);
  });

  it('shows one section header per block, in canonical order, above the first exercise of that block', async () => {
    const startWorkoutSession = vi.fn().mockResolvedValue({
      data: { sessionId: 'session-1', sessionExercises: sessionExercisesOutOfOrder() },
      error: null,
    });
    render(<WorkoutModeScreen {...makeProps({ startWorkoutSession })} />);

    await screen.findByText('Cat-Cow Stretch');
    expect(screen.getByText('Mobility')).toBeInTheDocument();
    expect(screen.getByText('Warm-up')).toBeInTheDocument();
    expect(screen.getByText('Strength')).toBeInTheDocument();
  });

  it('makes the mobility exercise (first in block order) the active card, even though it has the highest order_index', async () => {
    const startWorkoutSession = vi.fn().mockResolvedValue({
      data: { sessionId: 'session-1', sessionExercises: sessionExercisesOutOfOrder() },
      error: null,
    });
    render(<WorkoutModeScreen {...makeProps({ startWorkoutSession })} />);

    await screen.findByText('Cat-Cow Stretch');
    // Only the active card renders a Log Set control — proves activeIdx
    // points at the block-order-first exercise, not exStates[0] pre-sort.
    const logButtons = await screen.findAllByTestId('log-set-btn');
    expect(logButtons).toHaveLength(1);
  });

  it('renders without a block header for legacy exercises with no phase recorded', async () => {
    const startWorkoutSession = vi.fn().mockResolvedValue({
      data: {
        sessionId: 'session-1',
        sessionExercises: [{
          id: 'ex-1', session_id: 's-1', exercise_name: 'Deadlift', muscle_group: 'Back',
          order_index: 0, sets_prescribed: 3, reps_prescribed: 5, duration_seconds_prescribed: null, load_kg_prescribed: 80,
          rest_seconds: 90, notes: null, status: 'pending', skipped_reason: null, phase: null,
        }],
      },
      error: null,
    });
    render(<WorkoutModeScreen {...makeProps({ startWorkoutSession })} />);

    expect(await screen.findByText('Deadlift')).toBeInTheDocument();
    expect(screen.queryByText('Strength')).not.toBeInTheDocument();
  });
});
