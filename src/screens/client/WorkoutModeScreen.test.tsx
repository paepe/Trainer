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
  { exercise_name: 'Squat', muscle_group: 'Legs', sets: 1, reps: 10, load_kg: 40, rest_seconds: 60, notes: null },
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
          order_index: 0, sets_prescribed: 1, reps_prescribed: 10, load_kg_prescribed: 40,
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
});
