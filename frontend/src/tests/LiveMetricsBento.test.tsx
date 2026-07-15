import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LiveMetricsBento from '../components/LiveMetricsBento';
import { useMetricsDisplay } from '../hooks/useMetricsDisplay';

vi.mock('../hooks/useMetricsDisplay');

const baseDisplayContext = {
  isLoading: false,
  t: (key: string) => key,
  data: {
    last_incident: 'none',
    last_incident_ago: 'none',
    timestamp: new Date().toISOString(),
    requests_24h: 1024,
    requests_since_deploy: 100,
  },
  hasIncident: false,
  incidentDot: 'bg-status-ok',
  incidentText: 'text-status-ok',
  latestEventLabel: 'metrics.incident.none',
  latestEventAgoSeconds: null,
  metrics: {
    status: 'operational',
    sampleHistory: [],
    confidenceScore: 98,
    latestTrace: null,
    recentTraces: [],
    displayLifecycle: 'NORMAL',
    strategyProfile: {
      retryBudget: 0,
      cacheTtlSeconds: 30,
      activePath: 'sync',
      source: 'real',
    },
  },
};

describe('LiveMetricsBento — stale data notice', () => {
  it('does not show the stale notice when the fetch is healthy', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      isError: false,
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<LiveMetricsBento />);
    expect(screen.queryByText('metrics.stale_notice')).toBeNull();
  });

  it('shows the stale notice when the poll fails but cached data remains', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      isError: true,
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<LiveMetricsBento />);
    expect(screen.getByText('metrics.stale_notice')).toBeTruthy();
  });

  it('does not stack the stale notice on top of the degraded/down banners', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      isError: true,
      metrics: { ...baseDisplayContext.metrics, status: 'down' },
    } as unknown as ReturnType<typeof useMetricsDisplay>);

    render(<LiveMetricsBento />);
    expect(screen.queryByText('metrics.stale_notice')).toBeNull();
  });

  it('removes the stale notice once the poll recovers', () => {
    const { rerender } = render(<LiveMetricsBento />);

    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      isError: true,
    } as unknown as ReturnType<typeof useMetricsDisplay>);
    rerender(<LiveMetricsBento />);
    expect(screen.getByText('metrics.stale_notice')).toBeTruthy();

    vi.mocked(useMetricsDisplay).mockReturnValue({
      ...baseDisplayContext,
      isError: false,
    } as unknown as ReturnType<typeof useMetricsDisplay>);
    rerender(<LiveMetricsBento />);
    expect(screen.queryByText('metrics.stale_notice')).toBeNull();
  });
});
