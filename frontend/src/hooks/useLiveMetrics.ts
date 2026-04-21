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
import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useCurrentTime } from './useCurrentTime';
import { useQuery } from '@tanstack/react-query';
import { fetchMetricsSummary, type MetricsSummary } from '../api';
import { useChaosMode } from '../context/ChaosContext';
import { getRecentTraces, subscribeToTraces, type TraceEntry } from '../services/TraceEmitter';

// Named thresholds — visible numbers = engineering confidence
const LATENCY_WARNING_MS = 60;
const LATENCY_DEGRADED_MS = 100;
const ERROR_RATE_DEGRADED = 0.05;
const MAX_HISTORY = 20;

export interface MetricSample {
  value: number;
  timestamp: number;
}

export type SystemStatus = 'loading' | 'operational' | 'warning' | 'degraded' | 'down';

export function useLiveMetrics() {
  // Internal source of truth — no re-renders during normal polling
  const lastSuccessRef = useRef<number | null>(null);
  // Reactive value exposed outside (only updates on successful fetch)
  const [lastSuccessSnapshot, setLastSuccessSnapshot] = useState<number | null>(null);

  // Rolling history of P95 samples for sparkline
  const historyRef = useRef<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const sampleHistoryRef = useRef<MetricSample[]>([]);
  const [sampleHistory, setSampleHistory] = useState<MetricSample[]>([]);

  // Previous snapshot for delta calculation
  const previousRef = useRef<MetricsSummary | null>(null);
  const [previous, setPrevious] = useState<MetricsSummary | null>(null);
  const [recentTraces, setRecentTraces] = useState<TraceEntry[]>(() => getRecentTraces());

  const onSuccess = useCallback((data: MetricsSummary) => {
    const now = Date.now();
    // Update last success timestamp
    lastSuccessRef.current = now;
    setLastSuccessSnapshot(now);

    // Update previous before rolling in new data
    if (previousRef.current !== null) {
      setPrevious(previousRef.current);
    }

    // Roll in new P95 value
    historyRef.current = [...historyRef.current, data.p95_ms].slice(-MAX_HISTORY);
    setHistory([...historyRef.current]);
    sampleHistoryRef.current = [...sampleHistoryRef.current, { value: data.p95_ms, timestamp: now }].slice(-MAX_HISTORY);
    setSampleHistory([...sampleHistoryRef.current]);

    // Store current as next "previous"
    previousRef.current = data;
  }, []);

  useEffect(() => {
    return subscribeToTraces(() => {
      setRecentTraces(getRecentTraces());
    });
  }, []);

  const { preset } = useChaosMode();

  const query = useQuery({
    queryKey: ['metrics-summary', preset],
    queryFn: async () => {
      const data = await fetchMetricsSummary(preset);
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
    if (p95_ms > LATENCY_WARNING_MS) return 'warning';
    return 'operational';
  }, [query.data, query.isLoading, query.isError]);

  const latestTrace = recentTraces[0] ?? null;

   const baselineP95 = useMemo(() => {
     if (sampleHistory.length === 0) return null;
     const avg = sampleHistory.reduce((sum, sample) => sum + sample.value, 0) / sampleHistory.length;
     return Math.round(avg);
   }, [sampleHistory]);

    const currentTime = useCurrentTime(1000);
    const recoveryState = useMemo(() => {
      if (!latestTrace || latestTrace.type !== 'forced_failure') return 'closed' as const;
      const ageMs = currentTime - latestTrace.timestamp.getTime();
      if (ageMs < 20_000) return 'open' as const;
      if (ageMs < 45_000) return 'half_open' as const;
      return 'closed' as const;
    }, [latestTrace, currentTime]);

    const timeoutState = useMemo(() => {
      const p95 = query.data?.p95_ms ?? 0;
      if (p95 > LATENCY_DEGRADED_MS) return 'visible' as const;
      if (p95 > LATENCY_WARNING_MS) return 'risk' as const;
      return 'within_budget' as const;
    }, [query.data?.p95_ms]);

   return {
     ...query,
     status,
     history,       // number[] — last 20 P95 values
     sampleHistory,
     previous,      // MetricsSummary | null — previous snapshot for deltas
     lastSuccessAt: lastSuccessSnapshot,
     recentTraces,
     latestTrace,
     baselineP95,
     recoveryState,
     timeoutState,
   };
}
