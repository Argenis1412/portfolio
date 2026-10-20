import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useLiveMetrics } from '../hooks/useLiveMetrics';
import fixture from './fixtures/metrics-d0d1cea.json';

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client }, children);
}
afterEach(() => { client.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('validated metrics query', () => {
  it('does not renew the last good receipt time after a schema violation', async () => {
    client = new QueryClient();
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(fixture)));
    const { result } = renderHook(() => useLiveMetrics(), { wrapper });
    await waitFor(() => expect(result.current.data?.p95_ms).toBe(44));
    const received = result.current.lastSuccessAt;
    vi.useFakeTimers();
    fetch.mockImplementation(async () => new Response(JSON.stringify({ ...fixture, system_status: 'unknown' })));
    await act(async () => {
      const pending = result.current.refetch();
      await vi.advanceTimersByTimeAsync(8_000);
      await pending;
    });
    expect(result.current.lastSuccessAt).toBe(received);
    expect(result.current.isStale).toBe(true);
    expect(result.current.data?.p95_ms).toBe(44);
    expect(fetch.mock.calls.some(([, init]) => new Headers(init?.headers).has('X-Chaos-Preset'))).toBe(false);
  });
  it('passes a cancellable signal and aborts on unmount', async () => {
    client = new QueryClient();
    let signal: AbortSignal | null | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      signal = init?.signal;
      return new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    });
    const { unmount } = renderHook(() => useLiveMetrics(), { wrapper });
    await waitFor(() => expect(signal).toBeTruthy());
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
