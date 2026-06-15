import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../../i18n';
import { PlansScreen } from './PlansScreen';

describe('PlansScreen', () => {
  it('renders the 3 student plans (free / AI Fitness / AI Performance) for a client', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client' }}/>);

    expect(screen.getAllByText('Free').length).toBeGreaterThan(0);
    expect(screen.getByText('Ai Fitness')).toBeInTheDocument();
    expect(screen.getByText('Ai Performance')).toBeInTheDocument();
  });

  it('renders the 3 trainer plans (trial / pro / elite) for a trainer role', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '2', role: 'trainer' }}/>);

    expect(screen.getByText('Trial')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Elite')).toBeInTheDocument();
  });

  it('toggles billing cycle and shows "2 months free" badge on annual', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client' }}/>);

    fireEvent.click(screen.getByText('Annual · save 17%'));
    expect(screen.getAllByText('2 months free').length).toBeGreaterThan(0);
  });

  it('enables the confirm CTA only after a plan is selected', () => {
    const nav = vi.fn();
    render(<PlansScreen nav={nav} t={{ primary: '#000', accent: '#000' }} dark={false} user={{ id: '1', role: 'client' }}/>);

    const cta = screen.getByText('Confirm my license').closest('button') as HTMLButtonElement;
    expect(cta).toBeDisabled();

    // "Stay in motion" tag is unique to the Free plan card — click it to select that plan
    fireEvent.click(screen.getByText('Stay in motion'));
    expect(cta).not.toBeDisabled();
  });
});
