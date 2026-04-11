/**
 * useLiveMetrics — polling hook for the live evidence dashboard.
 *
 * Polling strategy:
 *   staleTime: 10s   — prevents redundant fetches on navigation
 *   refetchInterval: 15s — live without hammering the API
 *   refetchIntervalInBackground: false — no requests when tab is hidden
 *   refetchOnWindowFocus: false — explicit guard (don't rely on global default)
 *   gcTime: 60s — keeps data in cache during brief unmounts
 */
import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMetricsSummary } from '../api';

// Named thresholds — visible numbers = engineering confidence
const LATENCY_DEGRADED_MS = 800;
const ERROR_RATE_DEGRADED = 0.05;

export type SystemStatus = 'loading' | 'operational' | 'degraded' | 'down';

export function useLiveMetrics() {
  // useRef: internal source of truth — no re-renders during normal polling
  const lastSuccessRef = useRef<number | null>(null);
  // useState: the reactive value exposed outside the hook.
  // Only updates on a successful fetch — exactly when ErrorNotification needs to re-render.
  const [lastSuccessSnapshot, setLastSuccessSnapshot] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['metrics-summary'],
    queryFn: async () => {
      const data = await fetchMetricsSummary();
      // Update both: ref (immediate internal) and snapshot (triggers re-render)
      lastSuccessRef.current = Date.now();
      setLastSuccessSnapshot(Date.now());
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
    lastSuccessAt: lastSuccessSnapshot, // reactive, safe to pass as prop
  };
}
