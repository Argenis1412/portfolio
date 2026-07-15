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

  describe('warming_up zero-value guard', () => {
    const fullDefaults = {
      active_path: 'sync' as const,
      system_lifecycle: 'NORMAL' as const,
      worker_status: 'ok' as const,
      queue_backlog: 0,
      cache_status: 'direct' as const,
      system_status: 'operational' as const,
      error_rate_status: 'stable' as const,
    };

    function recentChaosTrace() {
      return {
        id: 'trace-baseline-reset',
        traceId: 'trace-baseline-reset',
        requestId: 'req-baseline-reset',
        type: 'latency_injection' as const,
        timestamp: new Date(),
        origin: 'synthetic' as const,
        endpoint: '/api/test',
        status: 'ok' as const,
        totalMs: 150,
        apiMs: 150,
        dbMs: 0,
        cacheMs: 0,
      };
    }

    it('does not wipe history when requests_since_deploy drops during chaos recovery', async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      vi.mocked(getRecentTraces).mockReturnValue([recentChaosTrace()]);
      vi.mocked(fetchMetricsSummary)
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 45, p95_status: 'healthy', requests_since_deploy: 100,
        })
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 0, p95_status: 'warming_up', error_rate_status: 'warming_up',
          requests_since_deploy: 2,
        });

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('off', qc),
      });

      await waitFor(() => expect(result.current.data?.p95_ms).toBe(45));
      expect(result.current.sampleHistory.length).toBe(1);

      await act(async () => {
        await qc.invalidateQueries({ queryKey: ['metrics-summary'] });
      });

      await waitFor(() => expect(result.current.data?.p95_status).toBe('warming_up'));

      // requests_since_deploy dropped (100 -> 2) but a recent chaos trace is
      // present, so the deploy-reset heuristic must not treat this as a real
      // process restart and wipe the sample history.
      expect(result.current.sampleHistory.length).toBe(1);
      expect(result.current.effectiveP95).toBe(45);
    });

    it('still wipes history on a real deploy reset with no recent chaos trace', async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      vi.mocked(getRecentTraces).mockReturnValue([]);
      vi.mocked(fetchMetricsSummary)
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 45, p95_status: 'healthy', requests_since_deploy: 100,
        })
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 0, p95_status: 'warming_up', error_rate_status: 'warming_up',
          requests_since_deploy: 2,
        });

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('off', qc),
      });

      await waitFor(() => expect(result.current.data?.p95_ms).toBe(45));
      expect(result.current.sampleHistory.length).toBe(1);

      await act(async () => {
        await qc.invalidateQueries({ queryKey: ['metrics-summary'] });
      });

      await waitFor(() => expect(result.current.data?.p95_status).toBe('warming_up'));

      // No chaos trace correlates with this reset — the drop in
      // requests_since_deploy is a genuine deploy signal, so history must
      // still be cleared as before this fix.
      expect(result.current.sampleHistory.length).toBe(0);
    });

    it('preserves the last known P95 and does not poison "previous" across a chaos baseline reset', async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      vi.mocked(getRecentTraces).mockReturnValue([recentChaosTrace()]);
      vi.mocked(fetchMetricsSummary)
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 45, p95_status: 'healthy', requests_since_deploy: 100,
        })
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 0, p95_status: 'warming_up', error_rate_status: 'warming_up',
          requests_since_deploy: 2,
        })
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 50, p95_status: 'healthy', requests_since_deploy: 105,
        });

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('off', qc),
      });

      await waitFor(() => expect(result.current.data?.p95_ms).toBe(45));

      await act(async () => {
        await qc.invalidateQueries({ queryKey: ['metrics-summary'] });
      });
      await waitFor(() => expect(result.current.data?.p95_status).toBe('warming_up'));

      // "0ms" must never reach the KPI display during warming_up
      expect(result.current.effectiveP95).toBe(45);

      await act(async () => {
        await qc.invalidateQueries({ queryKey: ['metrics-summary'] });
      });
      await waitFor(() => expect(result.current.data?.p95_ms).toBe(50));

      expect(result.current.sampleHistory.length).toBe(2);
      // "previous" must reflect the last real snapshot (45), never the
      // zero-value warmup sentinel skipped in between.
      expect(result.current.previous?.p95_ms).toBe(45);
    });

    it('does not discard a warming_up sample that carries a real non-zero P95', async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      vi.mocked(getRecentTraces).mockReturnValue([]);
      vi.mocked(fetchMetricsSummary)
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 45, p95_status: 'healthy', requests_since_deploy: 100,
        })
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 30, p95_status: 'warming_up', error_rate_status: 'warming_up',
          requests_since_deploy: 105,
        });

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('off', qc),
      });

      await waitFor(() => expect(result.current.data?.p95_ms).toBe(45));

      await act(async () => {
        await qc.invalidateQueries({ queryKey: ['metrics-summary'] });
      });
      await waitFor(() => expect(result.current.data?.p95_ms).toBe(30));

      expect(result.current.sampleHistory.length).toBe(2);
      expect(result.current.effectiveP95).toBe(30);
    });

    it('shows 0ms only transiently on true cold boot, correcting on the next real sample', async () => {
      const { fetchMetricsSummary } = await import('../api/portfolioService');
      vi.mocked(getRecentTraces).mockReturnValue([]);
      vi.mocked(fetchMetricsSummary)
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 0, p95_status: 'warming_up', error_rate_status: 'warming_up',
          requests_since_deploy: 2,
        })
        .mockResolvedValueOnce({
          ...healthyMetrics, ...fullDefaults,
          p95_ms: 42, p95_status: 'warming_up', error_rate_status: 'warming_up',
          requests_since_deploy: 3,
        });

      const qc = makeQueryClient();
      const { result } = renderHook(() => useLiveMetrics(), {
        wrapper: createWrapper('off', qc),
      });

      await waitFor(() => expect(result.current.data?.p95_ms).toBe(0));
      // No prior snapshot exists on a true cold boot — this is the one
      // accepted edge case where 0ms is transiently visible.
      expect(result.current.effectiveP95).toBe(0);

      await act(async () => {
        await qc.invalidateQueries({ queryKey: ['metrics-summary'] });
      });
      await waitFor(() => expect(result.current.data?.p95_ms).toBe(42));

      // Corrects immediately on the next real sample — never stuck at 0.
      expect(result.current.effectiveP95).toBe(42);
    });
  });
});
