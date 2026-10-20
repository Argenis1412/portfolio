import { useState } from 'react';
import { useMetricsSummary } from './useApi';
import { useCurrentTime } from './useCurrentTime';
import type { MetricSample } from '../types/metrics';

export type SystemStatus = 'loading' | 'unavailable' | 'operational' | 'warning' | 'degraded' | 'down';
export const METRICS_EXPIRY_MS = 60_000;

export function useLiveMetrics() {
  const query = useMetricsSummary();
  const now = useCurrentTime();
  const [history, setHistory] = useState<{ updatedAt: number; requests: number | null; samples: MetricSample[] }>({ updatedAt: 0, requests: null, samples: [] });
  const lastSuccessAt = query.dataUpdatedAt || null;
  const expired = lastSuccessAt !== null && now - lastSuccessAt >= METRICS_EXPIRY_MS;
  const isStale = expired || query.isError || query.failureCount > 0;
  const data = expired ? undefined : query.data;

  if (query.data && query.dataUpdatedAt && history.updatedAt !== query.dataUpdatedAt) {
    const snapshot = query.data;
    const reset = history.requests !== null && snapshot.requests_since_deploy < history.requests;
    const samples = reset ? [] : history.samples;
    setHistory({
      updatedAt: query.dataUpdatedAt,
      requests: snapshot.requests_since_deploy,
      samples: snapshot.p95_status === 'warming_up' ? samples : [...samples, {
        value: snapshot.p95_ms, timestamp: query.dataUpdatedAt,
      }].slice(-12),
    });
  }

  let status: SystemStatus = 'unavailable';
  if (query.isLoading) status = 'loading';
  else if (data && !isStale) {
    status = data.system_status;
    if (status !== 'down') {
      if (data.error_rate > 0.05 || status === 'degraded' || (data.p95_status !== 'warming_up' && data.p95_ms >= 100)) status = 'degraded';
      else if (data.p95_status !== 'warming_up' && data.p95_ms > 60) status = 'warning';
    }
  }
  return { ...query, data, status, sampleHistory: history.samples, lastSuccessAt, isStale, expired };
}
