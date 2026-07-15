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

    it('falls back to backend P95 when backend is warming_up and latest sample is synthetic', async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      vi.mocked(fetchMetricsSummary).mockResolvedValue({
        ...healthyMetrics,
        active_path: 'sync' as const,
        system_lifecycle: 'NORMAL' as const,
        system_status: 'operational' as const,
        p95_ms: 12,
        p95_status: 'warming_up' as const,
        error_rate_status: 'warming_up' as const,
        worker_status: 'ok',
        queue_backlog: 0,
        cache_status: 'direct',
      });

      const chaosTrace = {
        id: 'trace-synth-2',
        traceId: 'trace-synth-2',
        requestId: 'req-synth-2',
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

      expect(result.current.effectiveP95).toBe(12);
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

  describe('resilience: transient fetch failures', () => {
    it('returns status=down when first fetch fails with no cached data', async () => {
      vi.useFakeTimers();
      try {
        const { fetchMetricsSummary } = await import('../api/portfolioService');
        vi.mocked(fetchMetricsSummary).mockRejectedValue(new Error('network error'));

        const qc = makeQueryClient();
        const { result } = renderHook(() => useLiveMetrics(), {
          wrapper: createWrapper('off', qc),
        });

        // Fast-forward through retry delays: 1s + 2s + 4s = 7s
        await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });

        expect(result.current.status).toBe('down');
      } finally {
        vi.useRealTimers();
      }
    });

    it('preserves last known status when fetch fails after successful data load', { timeout: 15_000 }, async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      const successData = {
        ...healthyMetrics,
        active_path: 'sync' as const,
        system_lifecycle: 'NORMAL' as const,
        system_status: 'operational' as const,
        p95_ms: 44,
        p95_status: 'healthy' as const,
        error_rate_status: 'stable' as const,
        worker_status: 'ok' as const,
        queue_backlog: 0,
        cache_status: 'direct' as const,
      };
      vi.mocked(fetchMetricsSummary)
        .mockResolvedValueOnce(successData)
        .mockRejectedValue(new Error('transient'));

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('off', qc),
      });

      // Initial fetch succeeds
      await waitFor(() => expect(result.current.data).toBeDefined());
      expect(result.current.status).toBe('operational');

      // Trigger a refetch that exhausts 3 retries (1s + 2s + 4s = ~7s)
      await act(async () => {
        await qc.invalidateQueries({ queryKey: ['metrics-summary'] });
      });

      // Wait for retries to exhaust with generous timeout
      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 12_000 });

      // Cached data keeps status alive — must not flip to 'down'
      expect(result.current.status).not.toBe('down');
      expect(result.current.data).toBeDefined();
    });
  });
});
