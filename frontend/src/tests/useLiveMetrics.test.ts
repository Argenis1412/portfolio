import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLiveMetrics } from '../hooks/useLiveMetrics';
import { useMetricsSummary } from '../hooks/useApi';
import fixture from './fixtures/metrics-d0d1cea.json';
import type { MetricsSummary } from '../api/types';

vi.mock('../hooks/useApi', () => ({ useMetricsSummary: vi.fn() }));
let snapshot: { data: MetricsSummary | undefined; dataUpdatedAt: number; isError: boolean; isLoading: boolean };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
  snapshot = { data: fixture as MetricsSummary, dataUpdatedAt: Date.now(), isError: false, isLoading: false };
  vi.mocked(useMetricsSummary).mockImplementation(() => snapshot as ReturnType<typeof useMetricsSummary>);
});
afterEach(() => vi.useRealTimers());

describe('real metrics freshness', () => {
  it('never exposes expired cached data during the first render', () => {
    snapshot.dataUpdatedAt = Date.now() - 60_000;
    const renders: boolean[] = [];
    renderHook(() => {
      const metrics = useLiveMetrics();
      renders.push(metrics.data !== undefined);
      return metrics;
    });
    expect(renders.length).toBeGreaterThan(0);
    expect(renders.every(visible => !visible)).toBe(true);
  });
  it('distinguishes loading and initial failure without calling the backend down', () => {
    snapshot = { data: undefined, dataUpdatedAt: 0, isError: false, isLoading: true };
    const { result, rerender } = renderHook(() => useLiveMetrics());
    expect(result.current.status).toBe('loading');
    snapshot = { ...snapshot, isError: true, isLoading: false };
    rerender();
    expect(result.current.status).toBe('unavailable');
    expect(result.current.lastSuccessAt).toBeNull();
  });
  it('keeps previous data below 60 seconds and hides it exactly at expiry', () => {
    const { result, rerender } = renderHook(() => useLiveMetrics());
    const received = result.current.lastSuccessAt;
    expect(result.current.sampleHistory).toEqual([{ value: 44, timestamp: received }]);
    snapshot = { ...snapshot, isError: true };
    act(() => vi.advanceTimersByTime(59_999));
    act(() => window.dispatchEvent(new Event('focus')));
    rerender();
    expect(result.current.data?.p95_ms).toBe(44);
    expect(result.current.isStale).toBe(true);
    expect(result.current.status).toBe('unavailable');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.data).toBeUndefined();
    expect(result.current.lastSuccessAt).toBe(received);
    expect(result.current.sampleHistory).toHaveLength(1);
    snapshot = { ...snapshot, dataUpdatedAt: Date.now(), isError: false };
    rerender();
    expect(result.current.status).toBe('operational');
    expect(result.current.expired).toBe(false);
  });
  it('expires after a suspended interval even before another poll completes', () => {
    const { result, rerender } = renderHook(() => useLiveMetrics());
    vi.setSystemTime(Date.now() + 120_000);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    rerender();
    expect(result.current.data).toBeUndefined();
  });
  it('does not put warming-up sentinels into the real history', () => {
    snapshot.data = { ...fixture, p95_ms: 0, p95_status: 'warming_up' } as MetricsSummary;
    const { result } = renderHook(() => useLiveMetrics());
    expect(result.current.sampleHistory).toEqual([]);
    expect(result.current.data?.p95_status).toBe('warming_up');
  });
  it('preserves measured degradation without a synthetic recovery window', () => {
    snapshot.data = { ...fixture, p95_ms: 180, system_status: 'degraded' } as MetricsSummary;
    const { result } = renderHook(() => useLiveMetrics());
    expect(result.current.status).toBe('degraded');
    expect(result.current.sampleHistory[0].value).toBe(180);
  });
  it('resets history when lifetime request counters drop', () => {
    const { result, rerender } = renderHook(() => useLiveMetrics());
    snapshot = { ...snapshot, data: { ...snapshot.data!, requests_since_deploy: 1, p95_status: 'warming_up' }, dataUpdatedAt: snapshot.dataUpdatedAt + 1 };
    rerender();
    expect(result.current.sampleHistory).toEqual([]);
  });
});
