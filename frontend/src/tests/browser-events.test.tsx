import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LogProvider } from '../context/LogContext';
import { useLog } from '../hooks/useLog';
import { useDecisionEngine } from '../hooks/useDecisionEngine';
import type { MetricsSummary } from '../api/types';
import fixture from './fixtures/metrics-d0d1cea.json';
function wrapper({ children }: { children: ReactNode }) { return createElement(LogProvider, null, children); }
function useAlerts(data: MetricsSummary | undefined) { useDecisionEngine(data); return useLog(); }
describe('browser-local metric alerts', () => {
  it('does not fabricate startup or health events', () => {
    const { result } = renderHook(() => useAlerts(undefined), { wrapper });
    expect(result.current.entries).toEqual([]);
  });
  it('emits measured latency transitions once and preserves hysteresis', () => {
    const { result, rerender } = renderHook(({ data }) => useAlerts(data), { wrapper, initialProps: { data: { ...fixture, p95_ms: 120 } as MetricsSummary } });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].message).toContain('value=120ms');
    expect(result.current.entries[0].message).toContain('source=browser');
    rerender({ data: { ...fixture, p95_ms: 90 } as MetricsSummary });
    expect(result.current.entries).toHaveLength(1);
    rerender({ data: { ...fixture, p95_ms: 65 } as MetricsSummary });
    expect(result.current.entries[1].message).toContain('latency_stabilized');
    expect(result.current.entries.map(entry => entry.message).join(' ')).not.toContain('monitoring_p99');
  });
  it('gives error spikes priority and ignores absent or warming readings', () => {
    const { result, rerender } = renderHook(({ data }: { data: MetricsSummary | undefined }) => useAlerts(data), { wrapper,
      initialProps: { data: { ...fixture, error_rate: 0.08, p95_ms: 150 } as MetricsSummary | undefined } });
    expect(result.current.entries[0].message).toContain('error_spike_detected');
    expect(result.current.entries[1].message).toContain('SUPPRESSED');
    const count = result.current.entries.length;
    rerender({ data: undefined });
    rerender({ data: { ...fixture, p95_status: 'warming_up' } as MetricsSummary });
    expect(result.current.entries).toHaveLength(count);
  });
});
