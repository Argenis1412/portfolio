import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LiveMetricsBento from '../components/LiveMetricsBento';
import { useMetricsDisplay } from '../hooks/useMetricsDisplay';
import fixture from './fixtures/metrics-d0d1cea.json';
vi.mock('../hooks/useMetricsDisplay');
const base = { t: (key: string) => key, data: fixture, isLoading: false, isError: false,
  metrics: { status: 'operational', sampleHistory: [], lastSuccessAt: Date.parse(fixture.timestamp), isStale: false } };
beforeEach(() => vi.mocked(useMetricsDisplay).mockReturnValue(base as unknown as ReturnType<typeof useMetricsDisplay>));
describe('metrics presentation', () => {
  it('renders real counters and the last valid receipt time', () => {
    render(<LiveMetricsBento />);
    expect(screen.getByText('44ms')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
    expect(document.querySelector('time')?.dateTime).toBe('2026-10-20T12:00:00.000Z');
    expect(screen.queryByText('NORMAL')).toBeNull();
  });
  it('labels previous data even when the last known state was degraded', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({ ...base, metrics: { ...base.metrics, isStale: true } } as unknown as ReturnType<typeof useMetricsDisplay>);
    render(<LiveMetricsBento />);
    expect(screen.getByText('metrics.stale_notice')).toBeTruthy();
  });
  it('hides expired values while retaining last receipt time', () => {
    vi.mocked(useMetricsDisplay).mockReturnValue({ ...base, data: undefined } as unknown as ReturnType<typeof useMetricsDisplay>);
    render(<LiveMetricsBento />);
    expect(screen.getByText('metrics.no_current_data')).toBeTruthy();
    expect(screen.queryByText('44ms')).toBeNull();
    expect(document.querySelector('time')).toBeTruthy();
  });
});
