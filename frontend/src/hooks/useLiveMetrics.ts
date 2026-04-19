/**
 * useLiveMetrics — polling hook for the live evidence dashboard.
 *
 * Polling strategy:
 *   staleTime: 10s   — prevents redundant fetches on navigation
 *   refetchInterval: 15s — live without hammering the API
 *   refetchIntervalInBackground: false — no requests when tab is hidden
 *   refetchOnWindowFocus: false — explicit guard (don't rely on global default)
 *   gcTime: 60s — keeps data in cache during brief unmounts
 *
 * Extras:
 *   history   — rolling last-20 P95 values for the sparkline chart
 *   previous  — snapshot of the prior fetch for delta calculation
 */
import { useMemo, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMetricsSummary, type MetricsSummary } from '../api';

// Named thresholds — visible numbers = engineering confidence
const LATENCY_DEGRADED_MS = 800;
const ERROR_RATE_DEGRADED = 0.05;
const MAX_HISTORY = 20;

export type SystemStatus = 'loading' | 'operational' | 'degraded' | 'down';

export function useLiveMetrics() {
  // Internal source of truth — no re-renders during normal polling
  const lastSuccessRef = useRef<number | null>(null);
  // Reactive value exposed outside (only updates on successful fetch)
  const [lastSuccessSnapshot, setLastSuccessSnapshot] = useState<number | null>(null);

  // Rolling history of P95 samples for sparkline
  const historyRef = useRef<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);

  // Previous snapshot for delta calculation
  const previousRef = useRef<MetricsSummary | null>(null);
  const [previous, setPrevious] = useState<MetricsSummary | null>(null);

  const onSuccess = useCallback((data: MetricsSummary) => {
    // Update last success timestamp
    lastSuccessRef.current = Date.now();
    setLastSuccessSnapshot(Date.now());

    // Update previous before rolling in new data
    if (previousRef.current !== null) {
      setPrevious(previousRef.current);
    }

    // Roll in new P95 value
    historyRef.current = [...historyRef.current, data.p95_ms].slice(-MAX_HISTORY);
    setHistory([...historyRef.current]);

    // Store current as next "previous"
    previousRef.current = data;
  }, []);

  const query = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: async () => {
      const data = await fetchMetricsSummary();
      onSuccess(data);
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    gcTime: 60_000,
    retry: 1,
  });

  // Derive combined status: backend signal + local latency threshold
  const status: SystemStatus = useMemo(() => {
    if (query.isLoading) return 'loading';
    if (!query.data || query.isError) return 'down';

    const { p95_ms, system_status, error_rate } = query.data;
    if (system_status === 'down') return 'down';
    if (p95_ms > LATENCY_DEGRADED_MS || error_rate > ERROR_RATE_DEGRADED) return 'degraded';
    return 'operational';
  }, [query.data, query.isLoading, query.isError]);

  return {
    ...query,
    status,
    history,       // number[] — last 20 P95 values
    previous,      // MetricsSummary | null — previous snapshot for deltas
    lastSuccessAt: lastSuccessSnapshot,
  };
}
