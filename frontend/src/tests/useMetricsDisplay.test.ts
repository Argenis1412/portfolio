import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import { useMetricsDisplay } from '../hooks/useMetricsDisplay';
import { useLiveMetrics } from '../hooks/useLiveMetrics';

vi.mock('../hooks/useLiveMetrics');

const baseMetrics = {
  data: {
    timestamp: new Date().toISOString(),
    error_rate: 0.01,
    error_rate_status: 'stable',
  },
  status: 'operational' as const,
  isLoading: false,
};

function wrapper({ children }: { children: ReactNode }) {
  return createElement(LanguageProvider, null, children);
}

describe('useMetricsDisplay — isError wiring', () => {
  it('passes isError=false through from useLiveMetrics when the fetch is healthy', () => {
    vi.mocked(useLiveMetrics).mockReturnValue({
      ...baseMetrics,
      isError: false,
    } as unknown as ReturnType<typeof useLiveMetrics>);

    const { result } = renderHook(() => useMetricsDisplay(), { wrapper });
    expect(result.current.isError).toBe(false);
  });

  it('passes isError=true through from useLiveMetrics when a poll fails with cached data', () => {
    vi.mocked(useLiveMetrics).mockReturnValue({
      ...baseMetrics,
      isError: true,
    } as unknown as ReturnType<typeof useLiveMetrics>);

    const { result } = renderHook(() => useMetricsDisplay(), { wrapper });
    expect(result.current.isError).toBe(true);
  });
});
