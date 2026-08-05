import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { WorkoutPlanEditorScreen } from './WorkoutPlanEditorScreen';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { BRAND } from '../../theme/tokens';

// supabase.from() is called for several tables in this screen (profile_v2,
// checkin_prontidao on mount, workout_plans / plan_exercises on send). Each
// test configures `fromImpl` to return the right chainable mock per table.
let fromImpl: (table: string) => any;

vi.mock('../../supabase', () => ({
  supabase: {
    from: (table: string) => fromImpl(table),
  },
}));

vi.mock('../../lib/notify', () => ({ notify: vi.fn() }));
vi.mock('../../lib/workoutGeneration', () => ({ requestWorkoutPlan: vi.fn() }));
// Identity by default — a test overrides with mockResolvedValueOnce where the
// cleanup pass's output needs to differ from its input.
vi.mock('../../lib/cleanupVoiceNote', () => ({
  cleanupVoiceNote: vi.fn((s: string) => Promise.resolve(s)),
}));

const CONTEXT_FETCH_STUB = {
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  }),
};

// The editor reads the trainer's declared session structure (Coach DNA step 10)
// to tell the AI how to compose the session. Absent here — the fallback order
// applies server-side, which these tests do not exercise.
const COACH_DNA_STUB = {
  select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
};

// The client's own exercise-name preference (Fase 2, D2) — absent here, so
// resolveExerciseNameLocale falls back to English, matching the pre-Fase-2
// behaviour these tests were written against.
const PREFERENCES_STUB = {
  select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
};

// Typing an exercise name fires a debounced catalog search 280ms later. Without
// a stub it rejects after the test has finished, surfacing as an unhandled
// rejection that can mask real failures.
const CATALOG_SEARCH_STUB = {
  select: () => ({
    ilike: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }),
  }),
};

const client = { id: 'client-1', name: 'Frauke Stulle', email: 'frau@web.de', avatar_url: null };
const user = { id: 'trainer-1', name: 'Kamil' };

function renderScreen(props: { nav: (...args: unknown[]) => void }) {
  return render(
    <ThemeProvider t={{ ...BRAND, dark: true, role: 'trainer' }} dark={true} isTrainer={true}>
      <WorkoutPlanEditorScreen nav={props.nav as never} user={user} selectedClient={client} />
    </ThemeProvider>
  );
}

function addOneExercise() {
  fireEvent.click(screen.getByText('Add'));
  fireEvent.change(screen.getByPlaceholderText('Exercise name'), { target: { value: 'Squat' } });
  fireEvent.click(screen.getByText('Add exercise'));
}

// Fakes the Web Speech API constructor that useSpeechRecognition looks up on
// `window` — the hook's own accumulation/delta logic runs for real against
// this fake, only the browser engine itself is stubbed. `stop()` fires
// `onend` synchronously, standing in for the browser's async completion.
class FakeSpeechRecognition {
  static current: FakeSpeechRecognition | null = null;
  lang = ''; continuous = true; interimResults = false; maxAlternatives?: number;
  onresult: ((e: unknown) => void) | null = null;
  onerror:  ((e: unknown) => void) | null = null;
  onend:    (() => void) | null = null;
  start() { FakeSpeechRecognition.current = this; }
  stop()  { this.onend?.(); }
}

function finalSpeechResult(text: string) {
  return { resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] };
}

describe('WorkoutPlanEditorScreen — sendPlan error handling', () => {
  beforeEach(() => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table in default stub: ${table}`);
    };
  });

  it('shows a friendly error and does not navigate away when the workout_plans insert fails', async () => {
    const nav = vi.fn();
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
      }),
    });

    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'workout_plans') return { insert: planInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav });

    addOneExercise();
    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument());
    expect(planInsert).toHaveBeenCalledTimes(1);
    expect(nav).not.toHaveBeenCalledWith('trainerDashboard');
  });

  it('rolls back the empty plan, shows an error, and skips the notification when plan_exercises insert fails', async () => {
    const nav = vi.fn();
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'plan-99' }, error: null }),
      }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: { message: 'violates not-null constraint' } });
    const planDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const planDelete = vi.fn().mockReturnValue({ eq: planDeleteEq });

    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'workout_plans') return { insert: planInsert, delete: planDelete };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    const { notify } = await import('../../lib/notify');

    renderScreen({ nav });

    addOneExercise();
    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument());
    expect(planDelete).toHaveBeenCalledTimes(1);
    expect(planDeleteEq).toHaveBeenCalledWith('id', 'plan-99');
    expect(notify).not.toHaveBeenCalled();
    expect(nav).not.toHaveBeenCalledWith('trainerDashboard');
  });

  it('still saves and navigates on the happy path (regression guard)', async () => {
    const nav = vi.fn();
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'plan-1' }, error: null }),
      }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });

    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'workout_plans') return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    const { notify } = await import('../../lib/notify');

    renderScreen({ nav });

    addOneExercise();
    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(screen.getByText('Sent ✓')).toBeInTheDocument());
    expect(notify).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument();
  });
});

function checkinStub(availableMinutes: number | null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        order: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({
              data: availableMinutes == null ? null : {
                energy_level: 8, sleep_quality: 'good', available_minutes: availableMinutes,
                training_location: 'gym', pain_present: false, quick_data: null,
                occurred_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }),
    }),
  };
}

// Availability resolves check-in → profile → unknown. The card previously read
// only the check-in, so a client whose availability lives in the profile saw no
// time at all while the banner silently measured against it.
describe('WorkoutPlanEditorScreen — available time provenance', () => {
  function profileStub(sessionMin: number | null) {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: sessionMin == null ? null : { availability: { session_duration_min: sessionMin } },
            error: null,
          }),
        }),
      }),
    };
  }

  it('shows the check-in value when the check-in carries one', async () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return profileStub(60);
      if (table === 'checkin_prontidao') return checkinStub(30);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table: ${table}`);
    };
    renderScreen({ nav: vi.fn() });
    // Check-in wins over the profile's 60.
    await waitFor(() => expect(screen.getByText('30min')).toBeInTheDocument());
    expect(screen.getByText('available')).toBeInTheDocument();
  });

  it('falls back to the profile value and marks it as such', async () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return profileStub(45);
      if (table === 'checkin_prontidao') return checkinStub(null);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table: ${table}`);
    };
    renderScreen({ nav: vi.fn() });
    await waitFor(() => expect(screen.getByText('45min')).toBeInTheDocument());
    expect(screen.getByText('available (usual, from profile)')).toBeInTheDocument();
  });

  it('shows no time at all when neither source has one', async () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return profileStub(null);
      if (table === 'checkin_prontidao') return checkinStub(null);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table: ${table}`);
    };
    renderScreen({ nav: vi.fn() });
    await waitFor(() => expect(screen.getByText(/Exercises \(0\)/)).toBeInTheDocument());
    expect(screen.queryByText(/min$/)).not.toBeInTheDocument();
  });

  it('displays the same figure the banner measures against', async () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return profileStub(45);
      if (table === 'checkin_prontidao') return checkinStub(null);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table: ${table}`);
    };
    renderScreen({ nav: vi.fn() });
    await waitFor(() => expect(screen.getByText('45min')).toBeInTheDocument());
    addOneExercise(); // 5 min against a 45-min window
    await waitFor(() => expect(
      screen.getByText('This workout uses ~5 of the 45 min available — consider adding more exercises.')
    ).toBeInTheDocument());
  });
});

describe('WorkoutPlanEditorScreen — time-fit signal', () => {
  it('shows the underfill banner when the plan covers well under the available time', async () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2')         return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'checkin_prontidao')  return checkinStub(60);
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });

    // Default exercise: 3 sets x (40s active + 60s rest) = 300s = 5 min, vs 60 min available.
    addOneExercise();

    await waitFor(() => expect(
      screen.getByText('This workout uses ~5 of the 60 min available — consider adding more exercises.')
    ).toBeInTheDocument());
  });

  it('shows no time-fit banner when the plan is reasonably matched to the available time', async () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2')         return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'checkin_prontidao')  return checkinStub(6); // 5 min estimate is within 80–120% of 6
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    addOneExercise();

    await waitFor(() => expect(screen.getByText('Squat')).toBeInTheDocument());
    expect(screen.queryByText(/consider adding more exercises/)).not.toBeInTheDocument();
    expect(screen.queryByText(/may take longer than/)).not.toBeInTheDocument();
  });

  it('lets the trainer switch an exercise to duration mode and saves duration_seconds with null reps', async () => {
    const nav = vi.fn();
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-7' }, error: null }) }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });

    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'workout_plans')  return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav });

    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Duration')); // switch mode before naming the exercise
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), { target: { value: 'Plank' } });
    fireEvent.click(screen.getByText('Add exercise'));

    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(exercisesInsert).toHaveBeenCalledTimes(1));
    const [inserted] = exercisesInsert.mock.calls[0]!;
    expect(inserted[0]).toMatchObject({ exercise_name: 'Plank', reps: null, duration_seconds: 30 });
  });

  it('labels the reps/duration switch only once — no duplicated column header', () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Duration'));

    expect(screen.getAllByText('Duration')).toHaveLength(1);
    expect(screen.getAllByText('Reps')).toHaveLength(1);
  });

  it('refuses to add a duration exercise with no hold time instead of saving 0', () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });

    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Duration'));
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), { target: { value: 'Plank' } });
    fireEvent.change(screen.getByPlaceholderText('Duration (s)'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Add exercise'));

    expect(screen.getByText('Set a hold time in seconds.')).toBeInTheDocument();
    // Still on the form — the exercise was not appended to the plan
    expect(screen.getByText('Exercises (0)')).toBeInTheDocument();
  });

  it('skips the AI call when the plan already fills the available time', async () => {
    const { requestWorkoutPlan } = await import('../../lib/workoutGeneration');
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'checkin_prontidao') return checkinStub(5); // one default exercise = 5 min
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    await waitFor(() => expect(screen.getByText(/5min/)).toBeInTheDocument());

    addOneExercise(); // 3 sets x (40s + 60s) = 5 min -> remaining 0

    fireEvent.click(screen.getByText('✦ Ask AI'));

    await waitFor(() => expect(
      screen.getByText(/The plan already fills the available time/)
    ).toBeInTheDocument());
    expect(requestWorkoutPlan).not.toHaveBeenCalled();
  });
});

describe('WorkoutPlanEditorScreen — session blocks (Phase 3)', () => {
  beforeEach(() => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table in default stub: ${table}`);
    };
  });

  it('defaults a manually-added exercise to the strength block and persists it', async () => {
    const nav = vi.fn();
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-1' }, error: null }) }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'workout_plans')  return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav });
    addOneExercise();
    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(exercisesInsert).toHaveBeenCalledTimes(1));
    const [inserted] = exercisesInsert.mock.calls[0]!;
    expect(inserted[0]).toMatchObject({ exercise_name: 'Squat', phase: 'strength' });
  });

  it('lets the trainer reassign an exercise to a different declared block, and persists it', async () => {
    const nav = vi.fn();
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-2' }, error: null }) }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'workout_plans')  return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), { target: { value: 'Jog' } });
    fireEvent.click(screen.getByText('Warm-up'));
    fireEvent.click(screen.getByText('Add exercise'));
    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(exercisesInsert).toHaveBeenCalledTimes(1));
    const [inserted] = exercisesInsert.mock.calls[0]!;
    expect(inserted[0]).toMatchObject({ exercise_name: 'Jog', phase: 'warmup' });
  });

  it('groups exercises under their declared block, in STRUCTURE_BLOCKS order, regardless of add order', () => {
    renderScreen({ nav: vi.fn() });

    // Add a strength exercise first, then a warm-up one — declaration order
    // is reversed from STRUCTURE_BLOCKS order (warmup precedes strength).
    fireEvent.click(screen.getByText('Add'));
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), { target: { value: 'Squat' } });
    fireEvent.click(screen.getByText('Add exercise'));

    fireEvent.click(screen.getByText('Add'));
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), { target: { value: 'Jog' } });
    fireEvent.click(screen.getByText('Warm-up'));
    fireEvent.click(screen.getByText('Add exercise'));

    const headers = screen.getAllByText(/^(Warm-up|Strength)$/).map(el => el.textContent);
    expect(headers).toEqual(['Warm-up', 'Strength']);
  });

  it('lets the trainer attach a note to a manually-added exercise, and persists it', async () => {
    const nav = vi.fn();
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-3' }, error: null }) }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      if (table === 'workout_plans')  return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), { target: { value: 'Deadlift' } });
    fireEvent.change(
      screen.getByPlaceholderText('Note visible to the client for this exercise…'),
      { target: { value: 'Keep the bar close to your shins' } },
    );
    fireEvent.click(screen.getByText('Add exercise'));
    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(exercisesInsert).toHaveBeenCalledTimes(1));
    const [inserted] = exercisesInsert.mock.calls[0]!;
    expect(inserted[0]).toMatchObject({ exercise_name: 'Deadlift', notes: 'Keep the bar close to your shins' });
  });
});

// Fase 2 (docs/EXERCISE_NAME_LANGUAGE_PREFERENCE_PLAN.md) — the AI must
// generate exercise names directly in the recipient's own locale (D2/D5),
// not the fixed 'en' this screen used to send, and must tag generated rows
// with the locale they were produced in (D7) so later readers know when a
// translation is actually needed.
describe('WorkoutPlanEditorScreen — AI generation locale (Fase 2)', () => {
  function preferencesStub(language: string | null, keepEnglish: boolean | null) {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: language == null ? null : { language, keep_exercise_names_in_english: keepEnglish },
            error: null,
          }),
        }),
      }),
    };
  }

  beforeEach(async () => {
    // requestWorkoutPlan's call history is shared file-wide (vi.mock at
    // module scope, no global resetMocks) — clear it so each test's
    // toHaveBeenCalledTimes(1) reflects only its own click.
    const { requestWorkoutPlan } = await import('../../lib/workoutGeneration');
    vi.mocked(requestWorkoutPlan).mockClear();
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      throw new Error(`unexpected table in default stub: ${table}`);
    };
  });

  it("sends the recipient's own language to the AI when their toggle is off, not a fixed 'en'", async () => {
    const { requestWorkoutPlan } = await import('../../lib/workoutGeneration');
    vi.mocked(requestWorkoutPlan).mockResolvedValueOnce([]);
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return CONTEXT_FETCH_STUB;
      if (table === 'checkin_prontidao') return checkinStub(45);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return preferencesStub('es', false);
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    // Same Promise.all batch sets clientPrefs and the check-in-derived text
    // together — waiting on the latter guarantees the former has settled too.
    await waitFor(() => expect(screen.getByText('45min')).toBeInTheDocument());
    fireEvent.click(screen.getByText('✦ Ask AI'));

    await waitFor(() => expect(requestWorkoutPlan).toHaveBeenCalledTimes(1));
    expect(requestWorkoutPlan).toHaveBeenCalledWith(expect.objectContaining({ locale: 'es' }));
  });

  it("sends 'en' when the recipient's own toggle is on, even if their app language differs", async () => {
    const { requestWorkoutPlan } = await import('../../lib/workoutGeneration');
    vi.mocked(requestWorkoutPlan).mockResolvedValueOnce([]);
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return CONTEXT_FETCH_STUB;
      if (table === 'checkin_prontidao') return checkinStub(45);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return preferencesStub('es', true);
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    await waitFor(() => expect(screen.getByText('45min')).toBeInTheDocument());
    fireEvent.click(screen.getByText('✦ Ask AI'));

    await waitFor(() => expect(requestWorkoutPlan).toHaveBeenCalledTimes(1));
    expect(requestWorkoutPlan).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }));
  });

  it('falls back to English while the recipient preference row has not loaded yet', async () => {
    const { requestWorkoutPlan } = await import('../../lib/workoutGeneration');
    vi.mocked(requestWorkoutPlan).mockResolvedValueOnce([]);
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return CONTEXT_FETCH_STUB;
      if (table === 'checkin_prontidao') return checkinStub(45);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return preferencesStub(null, null); // no row for this client
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    await waitFor(() => expect(screen.getByText('45min')).toBeInTheDocument());
    fireEvent.click(screen.getByText('✦ Ask AI'));

    await waitFor(() => expect(requestWorkoutPlan).toHaveBeenCalledTimes(1));
    expect(requestWorkoutPlan).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }));
  });

  it('tags AI-generated exercises with the locale they were produced in, and persists it on save', async () => {
    const { requestWorkoutPlan } = await import('../../lib/workoutGeneration');
    vi.mocked(requestWorkoutPlan).mockResolvedValueOnce([{
      exercise_name: 'Sentadilla', muscle_group: 'Legs', sets: 3, reps: 10,
      duration_seconds: null, load_kg: null, rest_seconds: 60, notes: null, phase: 'strength',
    }]);
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-loc' }, error: null }) }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return CONTEXT_FETCH_STUB;
      if (table === 'checkin_prontidao') return checkinStub(45);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return preferencesStub('es', false);
      if (table === 'workout_plans')  return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    await waitFor(() => expect(screen.getByText('45min')).toBeInTheDocument());
    fireEvent.click(screen.getByText('✦ Ask AI'));
    await waitFor(() => expect(screen.getByText('Sentadilla')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(exercisesInsert).toHaveBeenCalledTimes(1));
    const [inserted] = exercisesInsert.mock.calls[0]!;
    expect(inserted[0]).toMatchObject({ exercise_name: 'Sentadilla', name_source_locale: 'es' });
  });

  it("records the trainer's own locale for a hand-typed exercise (Fase 3 provenance)", async () => {
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-manual' }, error: null }) }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return preferencesStub('es', false);
      if (table === 'workout_plans')  return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    addOneExercise();
    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(exercisesInsert).toHaveBeenCalledTimes(1));
    const [inserted] = exercisesInsert.mock.calls[0]!;
    expect(inserted[0]).toMatchObject({ exercise_name: 'Squat', name_source_locale: 'en' });
  });

  // Regression for a bug found live 2026-08-01: a trainer whose app language
  // is Portuguese but whose *own* "keep exercise names in English" display
  // toggle is on (Carlos Silva's real account — a very common combination,
  // that toggle defaults to on) typed "Remada Curvada" and it was tagged
  // 'en' instead of 'pt'. The bug was reusing trainerLocale (a *display*
  // target, deliberately toggle-adjusted) as if it were the language the
  // trainer is physically typing in right now — those are different things.
  it("tags a hand-typed name with the trainer's app language, not their exercise-name display toggle", async () => {
    await i18n.changeLanguage('pt');
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-pt-trainer' }, error: null }) }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return preferencesStub('es', false);
      if (table === 'workout_plans')  return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    try {
      // keepExerciseNamesInEnglish defaults to true (not overridden here) —
      // matching Carlos's real account: language 'pt', toggle on. UI text is
      // now in Portuguese, so this can't reuse addOneExercise() (hardcoded
      // English strings) or the English button labels used elsewhere in
      // this file.
      renderScreen({ nav: vi.fn() });
      fireEvent.click(screen.getByText('Adicionar'));
      fireEvent.change(screen.getByPlaceholderText('Nome do exercício'), { target: { value: 'Remada Curvada' } });
      fireEvent.click(screen.getByText('Adicionar exercício'));
      fireEvent.click(screen.getByText('Enviar ao cliente →'));

      await waitFor(() => expect(exercisesInsert).toHaveBeenCalledTimes(1));
      const [inserted] = exercisesInsert.mock.calls[0]!;
      expect(inserted[0]).toMatchObject({ name_source_locale: 'pt' });
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it("replaces a generated exercise's provenance tag with the trainer's own locale once they hand-edit the name", async () => {
    const { requestWorkoutPlan } = await import('../../lib/workoutGeneration');
    vi.mocked(requestWorkoutPlan).mockResolvedValueOnce([{
      exercise_name: 'Sentadilla', muscle_group: 'Legs', sets: 3, reps: 10,
      duration_seconds: null, load_kg: null, rest_seconds: 60, notes: null, phase: 'strength',
    }]);
    const planInsert = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'plan-edit' }, error: null }) }),
    });
    const exercisesInsert = vi.fn().mockResolvedValue({ error: null });
    fromImpl = (table: string) => {
      if (table === 'profile_v2')        return CONTEXT_FETCH_STUB;
      if (table === 'checkin_prontidao') return checkinStub(45);
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return preferencesStub('es', false);
      if (table === 'workout_plans')  return { insert: planInsert };
      if (table === 'plan_exercises') return { insert: exercisesInsert };
      throw new Error(`unexpected table: ${table}`);
    };

    renderScreen({ nav: vi.fn() });
    await waitFor(() => expect(screen.getByText('45min')).toBeInTheDocument());
    fireEvent.click(screen.getByText('✦ Ask AI'));
    await waitFor(() => expect(screen.getByText('Sentadilla')).toBeInTheDocument());

    // Open the generated exercise for editing and retype its name by hand.
    fireEvent.click(screen.getByText('Sentadilla'));
    fireEvent.change(screen.getByPlaceholderText('Exercise name'), { target: { value: 'Squat manual' } });
    fireEvent.click(screen.getByText('Update exercise'));

    fireEvent.click(screen.getByText('Send to client →'));

    await waitFor(() => expect(exercisesInsert).toHaveBeenCalledTimes(1));
    const [inserted] = exercisesInsert.mock.calls[0]!;
    expect(inserted[0]).toMatchObject({ exercise_name: 'Squat manual', name_source_locale: 'en' });
  });
});

describe('WorkoutPlanEditorScreen — voice dictation for exercise notes', () => {
  const originalSR = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;

  beforeEach(() => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
      if (table === 'coach_dna') return COACH_DNA_STUB;
      if (table === 'preferences') return PREFERENCES_STUB;
      throw new Error(`unexpected table in default stub: ${table}`);
    };
    FakeSpeechRecognition.current = null;
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeSpeechRecognition;
  });

  afterEach(() => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = originalSR;
  });

  // The cleaned value is deliberately distinct from the raw transcript so the
  // assertion can only pass once handleNotesDictationStop's async cleanup
  // path has actually resolved and replaced the notes field — not merely on
  // the synchronous, pre-cleanup value that handleNotesTranscript already
  // wrote in as the user was speaking (which waitFor's first, synchronous
  // check would otherwise let a broken stop handler slip past).
  it('appends dictated speech to the notes field, replaced by the cleanup pass on stop', async () => {
    const { cleanupVoiceNote } = await import('../../lib/cleanupVoiceNote');
    vi.mocked(cleanupVoiceNote).mockResolvedValueOnce('Keep your back straight (cleaned)');

    renderScreen({ nav: vi.fn() });
    fireEvent.click(screen.getByText('Add'));

    fireEvent.click(screen.getByTitle('Start recording'));
    FakeSpeechRecognition.current!.onresult!(finalSpeechResult('Keep your back straight'));
    fireEvent.click(screen.getByTitle('Stop recording'));

    await waitFor(() => expect(
      screen.getByPlaceholderText('Note visible to the client for this exercise…')
    ).toHaveValue('Keep your back straight (cleaned)'));
    expect(cleanupVoiceNote).toHaveBeenCalledWith('Keep your back straight', 'trainer_workout_note');
  });

  it('preserves already-typed notes as a base and appends the cleaned dictated text after them', async () => {
    const { cleanupVoiceNote } = await import('../../lib/cleanupVoiceNote');
    vi.mocked(cleanupVoiceNote).mockResolvedValueOnce('then increase load gradually (cleaned)');

    renderScreen({ nav: vi.fn() });
    fireEvent.click(screen.getByText('Add'));
    fireEvent.change(
      screen.getByPlaceholderText('Note visible to the client for this exercise…'),
      { target: { value: 'Warm up first.' } },
    );

    fireEvent.click(screen.getByTitle('Start recording'));
    FakeSpeechRecognition.current!.onresult!(finalSpeechResult('then increase load gradually'));
    fireEvent.click(screen.getByTitle('Stop recording'));

    await waitFor(() => expect(
      screen.getByPlaceholderText('Note visible to the client for this exercise…')
    ).toHaveValue('Warm up first. then increase load gradually (cleaned)'));
  });

  it('does not bleed a dictation session left mid-buffer into the next exercise after Cancel', async () => {
    renderScreen({ nav: vi.fn() });

    // First exercise: start dictating, but abandon it via Cancel instead of stopping the mic.
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByTitle('Start recording'));
    FakeSpeechRecognition.current!.onresult!(finalSpeechResult('abandoned mid-sentence'));
    fireEvent.click(screen.getByText('Cancel'));

    // Second exercise: a fresh dictation session should not inherit the abandoned buffer.
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByTitle('Start recording'));
    FakeSpeechRecognition.current!.onresult!(finalSpeechResult('fresh note'));
    fireEvent.click(screen.getByTitle('Stop recording'));

    await waitFor(() => expect(
      screen.getByPlaceholderText('Note visible to the client for this exercise…')
    ).toHaveValue('fresh note'));
  });
});
