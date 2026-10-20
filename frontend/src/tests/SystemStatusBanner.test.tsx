import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SystemStatusBanner from '../components/SystemStatusBanner';
import { useMetricsDisplay } from '../hooks/useMetricsDisplay';
vi.mock('../hooks/useMetricsDisplay');
describe('observed backend status banner', () => {
  it.each([['degraded', false, true], ['down', false, true], ['operational', false, false], ['unavailable', true, false], ['degraded', true, false]])('handles %s with stale=%s', (status, isStale, visible) => {
    vi.mocked(useMetricsDisplay).mockReturnValue({ data: {}, t: (k: string) => k, metrics: { status, isStale } } as unknown as ReturnType<typeof useMetricsDisplay>);
    render(<SystemStatusBanner />);
    expect(Boolean(screen.queryByRole('status'))).toBe(visible);
  });
});
