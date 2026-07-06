import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { ChaosContext, type ChaosPreset } from '../context/ChaosContextCore';
import { useLiveMetrics } from '../hooks/useLiveMetrics';
import { getRecentTraces, subscribeToTraces, type TraceEntry } from '../services/TraceEmitter';

vi.mock('../services/TraceEmitter', () => ({
  subscribeToTraces: vi.fn(() => () => {}),
  getRecentTraces: vi.fn(() => []),
}));

const healthyMetrics = {
  p95_ms: 44,
  p95_status: 'healthy',
  requests_24h: 1024,
  requests_since_deploy: 100,
  error_rate: 0.013,
  error_rate_pct: '1.30%',
  error_rate_status: 'stable',
  system_status: 'operational',
  system_lifecycle: 'NORMAL',
  uptime: '2h 14m',
  window: 'last_24h',
  timestamp: new Date().toISOString(),
  retries_1h: 0,
  last_incident: 'none',
  last_incident_ago: 'none',
  active_path: 'sync',
  cache_ttl_s: 30,
};

vi.mock('../api/portfolioService', () => ({
  fetchMetricsSummary: vi.fn(async () => ({ ...healthyMetrics })),
}));

function createWrapper(preset: ChaosPreset, queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        ChaosContext.Provider,
        { value: { preset, setPreset: () => {} } },
        children,
      ),
    );
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe('useLiveMetrics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('preset invalidation', () => {
    it('does not invalidate on first visit to a preset', async () => {
      const qc = makeQueryClient();
      const spy = vi.spyOn(qc, 'invalidateQueries');

      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('mild', qc),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(spy).not.toHaveBeenCalled();
    });

    it('invalidates when returning to a previously-seen preset', async () => {
      const qc = makeQueryClient();
      const spy = vi.spyOn(qc, 'invalidateQueries');

      let preset: ChaosPreset = 'off';
      const setPreset = (p: ChaosPreset) => { preset = p; };

      const { result, rerender } = renderHook(() => useLiveMetrics(), {
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(
            QueryClientProvider,
            { client: qc },
            createElement(
              ChaosContext.Provider,
              { value: { preset, setPreset } },
              children,
            ),
          ),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());
      spy.mockClear();

      // Switch to mild — first visit, no invalidation
      act(() => { preset = 'mild'; });
      rerender();
      expect(spy).not.toHaveBeenCalled();

      // Switch back to off — already seen, should invalidate
      act(() => { preset = 'off'; });
      rerender();
      expect(spy).toHaveBeenCalledWith({ queryKey: ['metrics-summary'] });
    });
  });

  describe('status derivation ignores synthetic P95', () => {
    it('stays operational when backend is healthy regardless of effectiveP95', async () => {
      const chaosTrace = {
        id: 'trace-synth-1',
        traceId: 'trace-synth-1',
        requestId: 'req-synth-1',
        type: 'latency_injection' as const,
        timestamp: new Date(),
        origin: 'synthetic' as const,
        endpoint: '/api/test',
        status: 'ok' as const,
        totalMs: 3999,
        apiMs: 3999,
        dbMs: 0,
        cacheMs: 0,
      };

      let traceListener: ((trace: TraceEntry) => void) | null = null;
      vi.mocked(subscribeToTraces).mockImplementation((cb) => {
        traceListener = cb;
        return () => { traceListener = null; };
      });
      vi.mocked(getRecentTraces).mockReturnValue([chaosTrace]);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('mild', qc),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());

      await act(async () => {
        traceListener!({ ...chaosTrace, timestamp: new Date() });
      });

      expect(result.current.effectiveP95).toBeGreaterThan(44);
      expect(result.current.status).toBe('operational');
      expect(result.current.timeoutState).toBe('within_budget');
    });
  });

  describe('chaos recovery softening', () => {
    it('shows warning not degraded when backend is degraded from recent chaos', async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      vi.mocked(fetchMetricsSummary).mockResolvedValue({
        ...healthyMetrics,
        active_path: 'sync' as const,
        system_lifecycle: 'NORMAL' as const,
        system_status: 'degraded',
        p95_ms: 3999,
        p95_status: 'degraded',
        error_rate: 0,
        error_rate_pct: '0.00%',
        error_rate_status: 'stable',
        worker_status: 'ok',
        queue_backlog: 0,
        cache_status: 'direct',
      });
      vi.mocked(getRecentTraces).mockReturnValue([
        {
          id: 'trace-chaos-1',
          traceId: 'trace-chaos-1',
          requestId: 'req-1',
          type: 'latency_injection',
          timestamp: new Date(),
          origin: 'synthetic' as const,
          endpoint: '/api/test',
          status: 'ok' as const,
          totalMs: 3999,
          apiMs: 3999,
          dbMs: 0,
          cacheMs: 0,
        },
      ]);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('off', qc),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.status).toBe('warning');
    });

    it('shows degraded when backend is degraded with no recent chaos trace', async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      vi.mocked(fetchMetricsSummary).mockResolvedValue({
        ...healthyMetrics,
        active_path: 'sync' as const,
        system_lifecycle: 'NORMAL' as const,
        system_status: 'degraded',
        p95_ms: 3999,
        p95_status: 'degraded',
        error_rate: 0,
        error_rate_pct: '0.00%',
        error_rate_status: 'stable',
        worker_status: 'ok',
        queue_backlog: 0,
        cache_status: 'direct',
      });
      vi.mocked(getRecentTraces).mockReturnValue([]);

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('off', qc),
      });

      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.status).toBe('degraded');
    });
  });
});
