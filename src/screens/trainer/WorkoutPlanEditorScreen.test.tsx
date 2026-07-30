import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
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

const CONTEXT_FETCH_STUB = {
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  }),
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

describe('WorkoutPlanEditorScreen — sendPlan error handling', () => {
  beforeEach(() => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2' || table === 'checkin_prontidao') return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
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

describe('WorkoutPlanEditorScreen — time-fit signal', () => {
  it('shows the underfill banner when the plan covers well under the available time', async () => {
    fromImpl = (table: string) => {
      if (table === 'profile_v2')         return CONTEXT_FETCH_STUB;
      if (table === 'protocol_exercises') return CATALOG_SEARCH_STUB;
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
