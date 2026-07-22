import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChaosModeBanner from '../components/ChaosModeBanner';
import { useMetricsDisplay } from '../hooks/useMetricsDisplay';
import { useChaosMode } from '../hooks/useChaosMode';
import { useLanguage } from '../context/LanguageContext';

vi.mock('../hooks/useMetricsDisplay');
vi.mock('../hooks/useChaosMode');
vi.mock('../context/LanguageContext');

const baseDisplayContext = {
  isLoading: false,
  t: (key: string) => key,
  data: {
    last_incident: 'none',
    last_incident_ago: 'none',
    timestamp: new Date().toISOString(),
    requests_since_deploy: 100,
    system_lifecycle: 'NORMAL',
  },
  metrics: {
    status: 'operational',
    displayLifecycle: 'NORMAL',
    effectiveP95: 0,
    strategyProfile: {
      retryBudget: 0,
      cacheTtlSeconds: 30,
      activePath: 'sync',
      source: 'real',
    },
  },
};

function expandBanner() {
  fireEvent.click(screen.getByLabelText('Expand system detail'));
}

describe('ChaosModeBanner — lifecycle contradiction', () => {
  beforeEach(() => {
    vi.mocked(useLanguage).mockReturnValue({
      t: (key: string) => key,
    } as unknown as ReturnType<typeof useLanguage>);
  });

  it('does not show a contradictory "Incident phase: Normal" clause when chaos is active but the lifecycle is still NORMAL', () => {
    vi.mocked(useChaosMode).mockReturnValue({
      preset: 'chaos',
    } as unknown as ReturnType<typeof useChaosMode>);
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      metrics: { ...baseDisplayContext.metrics, status: 'degraded', displayLifecycle: 'NORMAL' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<ChaosModeBanner />);
    expandBanner();

    expect(screen.queryByText('metrics.lifecycle.normal')).toBeNull();
  });

  it('shows the lifecycle clause while a chaos incident is active', () => {
    vi.mocked(useChaosMode).mockReturnValue({
      preset: 'chaos',
    } as unknown as ReturnType<typeof useChaosMode>);
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      metrics: { ...baseDisplayContext.metrics, status: 'degraded', displayLifecycle: 'RECOVERING' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<ChaosModeBanner />);
    expandBanner();

    expect(screen.getByText('metrics.lifecycle.recovering')).toBeTruthy();
  });

  it('renders nothing when chaos is off', () => {
    vi.mocked(useChaosMode).mockReturnValue({
      preset: 'off',
    } as unknown as ReturnType<typeof useChaosMode>);
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      metrics: { ...baseDisplayContext.metrics, status: 'degraded', displayLifecycle: 'NORMAL' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    const { container } = render(<ChaosModeBanner />);
    expect(container.firstChild).toBeNull();
  });
});
