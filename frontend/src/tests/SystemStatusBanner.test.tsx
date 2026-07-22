import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SystemStatusBanner from '../components/SystemStatusBanner';
import { useMetricsDisplay } from '../hooks/useMetricsDisplay';
import { useChaosMode } from '../hooks/useChaosMode';

vi.mock('../hooks/useMetricsDisplay');
vi.mock('../hooks/useChaosMode');

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

describe('SystemStatusBanner — lifecycle contradiction', () => {
  beforeEach(() => {
    vi.mocked(useChaosMode).mockReturnValue({
      preset: 'off',
    } as unknown as ReturnType<typeof useChaosMode>);
  });

  it('shows DEGRADED without a contradictory "Status: Normal" clause when no chaos is active', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      metrics: { ...baseDisplayContext.metrics, status: 'degraded', displayLifecycle: 'NORMAL' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<SystemStatusBanner />);
    expect(screen.getByText('metrics.status.degraded')).toBeTruthy();
    expect(screen.queryByText('metrics.lifecycle.normal')).toBeNull();
  });

  it('shows DOWN without a contradictory "Status: Normal" clause when no chaos is active', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      metrics: { ...baseDisplayContext.metrics, status: 'down', displayLifecycle: 'NORMAL' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<SystemStatusBanner />);
    expect(screen.getByText('metrics.status.down')).toBeTruthy();
    expect(screen.queryByText('metrics.lifecycle.normal')).toBeNull();
  });

  it('shows the lifecycle clause while a chaos incident is active', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      metrics: { ...baseDisplayContext.metrics, status: 'degraded', displayLifecycle: 'RECOVERING' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<SystemStatusBanner />);
    expect(screen.getByText('metrics.status.degraded')).toBeTruthy();
    expect(screen.getByText('metrics.lifecycle.recovering')).toBeTruthy();
  });

  it('shows the lifecycle clause during STABLE (post-incident tail), unlike cause/impact', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      metrics: { ...baseDisplayContext.metrics, status: 'degraded', displayLifecycle: 'STABLE' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<SystemStatusBanner />);
    expect(screen.getByText('metrics.status.degraded')).toBeTruthy();
    expect(screen.getByText('metrics.lifecycle.stable')).toBeTruthy();
    expect(screen.queryByText('banner.cause.backend')).toBeNull();
  });

  it('renders nothing when the system is operational', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      metrics: { ...baseDisplayContext.metrics, status: 'operational', displayLifecycle: 'NORMAL' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<SystemStatusBanner />);
    expect(screen.queryByText('metrics.status.operational')).toBeNull();
  });
});
