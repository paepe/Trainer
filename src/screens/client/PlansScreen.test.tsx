import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '../../i18n';
import { PlansScreen } from './PlansScreen';
import type { UserRole, PlanKey } from '../../types';

function mockUpsert() {
  return vi.fn().mockResolvedValue({ error: null });
}

// usePlanPrices fetches from Supabase (plan_definitions/plan_prices) and
// starts as { plans: [], loading: true } until that resolves — mocked here
// with static synchronous data so these tests don't depend on network state.
vi.mock('../../hooks/usePlanPrices', () => ({
  usePlanPrices: (audience: 'client' | 'trainer') => ({
    loading: false,
    plans: audience === 'trainer'
      ? [
          { id: 'trial', icon: 'sparkle', sort_order: 0, monthly_cents: 0,    annual_cents: 0,     monthly_label: null, annual_label: null },
          { id: 'pro',   icon: 'sparkle', sort_order: 1, monthly_cents: 4999, annual_cents: 49990, monthly_label: null, annual_label: '2 months free' },
          { id: 'elite', icon: 'sparkle', sort_order: 2, monthly_cents: 9999, annual_cents: 99990, monthly_label: null, annual_label: '2 months free' },
        ]
      : [
          { id: 'free',           icon: 'sparkle', sort_order: 0, monthly_cents: 0,    annual_cents: 0,     monthly_label: null, annual_label: null },
          { id: 'ai_fitness',     icon: 'sparkle', sort_order: 1, monthly_cents: 999,  annual_cents: 9990,  monthly_label: null, annual_label: '2 months free' },
          { id: 'ai_performance', icon: 'sparkle', sort_order: 2, monthly_cents: 1999, annual_cents: 19990, monthly_label: null, annual_label: '2 months free' },
        ],
  }),
}));

describe('PlansScreen', () => {
  it('renders the 3 student plans (free / AI Fitness / AI Performance) for a client', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client', plan_key: 'free' }} upsertSubscription={mockUpsert()} updateProfile={mockUpsert()}/>);

    expect(screen.getAllByText('Free').length).toBeGreaterThan(0);
    expect(screen.getByText('AI Fitness')).toBeInTheDocument();
    expect(screen.getByText('AI Performance')).toBeInTheDocument();
  });

  it('renders the 3 trainer plans (trial / pro / elite) for a trainer role', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '2', role: 'trainer', plan_key: 'free' }} upsertSubscription={mockUpsert()} updateProfile={mockUpsert()}/>);

    expect(screen.getByText('Trial')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Elite')).toBeInTheDocument();
  });

  it('toggles billing cycle and shows "2 months free" badge on annual', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client', plan_key: 'free' }} upsertSubscription={mockUpsert()} updateProfile={mockUpsert()}/>);

    fireEvent.click(screen.getByText('Annual · save 17%'));
    expect(screen.getAllByText('2 months free').length).toBeGreaterThan(0);
  });

  it('shows the confirm CTA only after a plan is selected', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client' }} upsertSubscription={mockUpsert()} updateProfile={mockUpsert()}/>);

    // The CTA is rendered inside each plan card only once that card is selected.
    expect(screen.queryByText('Confirm my license')).not.toBeInTheDocument();

    // "Stay in motion" tag is unique to the Free plan card — click it to select that plan
    fireEvent.click(screen.getByText('Stay in motion'));
    const cta = screen.getByText('Confirm my license').closest('button') as HTMLButtonElement;
    expect(cta).not.toBeDisabled();
  });

  it('marks the AI Performance plan as the current plan when the user is subscribed to it', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client', plan_key: 'ai_performance' }} upsertSubscription={mockUpsert()} updateProfile={mockUpsert()}/>);

    expect(screen.getByText('Current plan')).toBeInTheDocument();
  });

  // Regression for a bug found 2026-08-01: a free client mid welcome-window
  // (21-day taste of ai_fitness-level features, see useWelcomeWindow) was
  // shown "Current plan" on the AI Fitness card instead of Free — and worse,
  // that flagged AI Fitness as already-selected, disabling the one button
  // that would actually convert them to a paid subscription.
  it('keeps "Current plan" on Free during an active welcome window, and still allows confirming AI Fitness', async () => {
    const nav = vi.fn();
    const upsertSubscription = mockUpsert();
    const twentyDaysOut = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false}
      user={{
        id: '1', role: 'client', plan_key: 'free',
        subscription: { plan_key: 'free', status: 'active', billing_cycle: null, current_period_end: twentyDaysOut },
      }}
      upsertSubscription={upsertSubscription} updateProfile={upsertSubscription}/>
    );

    const currentBadge = screen.getByText('Current plan');
    const freeCard = screen.getByText('Stay in motion').closest('button');
    expect(freeCard).toContainElement(currentBadge);

    fireEvent.click(screen.getByText('Your AI in the loop'));
    const cta = screen.getByText('Confirm my license').closest('button') as HTMLButtonElement;
    expect(cta).not.toBeDisabled();
    fireEvent.click(cta);

    await waitFor(() => expect(upsertSubscription).toHaveBeenCalledWith('ai_fitness', 'monthly'));
  });

  it('persists the selected plan via upsertSubscription and navigates to planConfirm outside onboarding', async () => {
    const nav = vi.fn();
    const upsertSubscription = mockUpsert();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client' }} upsertSubscription={upsertSubscription} updateProfile={upsertSubscription}/>);

    fireEvent.click(screen.getByText('Stay in motion'));
    fireEvent.click(screen.getByText('Confirm my license'));

    await waitFor(() => {
      expect(upsertSubscription).toHaveBeenCalledWith('free', 'monthly');
      expect(nav).toHaveBeenCalledWith('planConfirm', { planKey: 'free', isTrainer: false });
    });
  });

  it('records the current legal acceptance before it changes a plan', async () => {
    const nav = vi.fn();
    const upsertSubscription = mockUpsert();
    const acceptLegalDocuments = vi.fn().mockResolvedValue(null);
    render(
      <PlansScreen
        nav={nav}
        t={{ primary: '#000', accent: '#000' }}
        dark={false}
        user={{ id: '1', role: 'client', plan_key: 'free' }}
        upsertSubscription={upsertSubscription}
        updateProfile={upsertSubscription}
        legalAccepted={false}
        acceptLegalDocuments={acceptLegalDocuments}
      />,
    );

    fireEvent.click(screen.getByText('Your AI in the loop'));
    const cta = screen.getByText('Confirm my license').closest('button') as HTMLButtonElement;
    expect(cta).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(cta).not.toBeDisabled();
    fireEvent.click(cta);

    await waitFor(() => {
      expect(acceptLegalDocuments).toHaveBeenCalledTimes(1);
      expect(upsertSubscription).toHaveBeenCalledWith('ai_fitness', 'monthly');
    });
  });

  it('navigates to the profile wizard on confirm when reached from onboarding', async () => {
    const nav = vi.fn();
    const upsertSubscription = mockUpsert();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client' }} source="onboarding" upsertSubscription={upsertSubscription} updateProfile={upsertSubscription}/>);

    fireEvent.click(screen.getByText('Stay in motion'));
    fireEvent.click(screen.getByText('Confirm my license'));

    await waitFor(() => {
      expect(upsertSubscription).toHaveBeenCalledWith('free', 'monthly');
      expect(nav).toHaveBeenCalledWith('profile');
    });
  });

  describe('onboarding flow per profile', () => {
    // Trainer-ish roles land on their dashboard after onboarding; plain
    // clients land on the profile wizard (see PlansScreen.tsx handleConfirm).
    const cases: { role: UserRole; selectLabel: string; expectedPlanKey: PlanKey; expectedNavTarget: string }[] = [
      { role: 'client',                selectLabel: 'Stay in motion',  expectedPlanKey: 'free',  expectedNavTarget: 'profile' },
      { role: 'trainer',                selectLabel: 'Test the studio', expectedPlanKey: 'trial', expectedNavTarget: 'trainerDashboard' },
      { role: 'studio_trainer',         selectLabel: 'Test the studio', expectedPlanKey: 'trial', expectedNavTarget: 'trainerDashboard' },
      { role: 'studio_admin',           selectLabel: 'Test the studio', expectedPlanKey: 'trial', expectedNavTarget: 'trainerDashboard' },
      { role: 'internal_trainer',       selectLabel: 'Test the studio', expectedPlanKey: 'trial', expectedNavTarget: 'trainerDashboard' },
      { role: 'technical_coordinator',  selectLabel: 'Test the studio', expectedPlanKey: 'trial', expectedNavTarget: 'trainerDashboard' },
      { role: 'studio_manager',         selectLabel: 'Test the studio', expectedPlanKey: 'trial', expectedNavTarget: 'trainerDashboard' },
    ];

    it.each(cases)('role=$role selects the free-tier plan and lands on the expected screen', async ({ role, selectLabel, expectedPlanKey, expectedNavTarget }) => {
      const nav = vi.fn();
      const upsertSubscription = mockUpsert();
      render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role }} source="onboarding" upsertSubscription={upsertSubscription} updateProfile={upsertSubscription}/>);

      fireEvent.click(screen.getByText(selectLabel));
      fireEvent.click(screen.getByText('Confirm my license'));

      await waitFor(() => {
        expect(upsertSubscription).toHaveBeenCalledWith(expectedPlanKey, 'monthly');
        expect(nav).toHaveBeenCalledWith(expectedNavTarget);
      });
    });
  });
});
