export interface TraceEntry {
  id: string;
  traceId: string;
  requestId: string;
  type: 'traffic_spike' | 'forced_failure' | 'cache_stress' | 'queue_drain' | 'manual_retry' | 'latency_injection';
  origin: 'synthetic' | 'real';
  endpoint: string;
  status: 'ok' | 'error';
  totalMs: number;
  apiMs: number;
  dbMs: number;
  cacheMs: number;
  timestamp: Date;
  impactPct?: string; // e.g. "15%"
  latencyDelta?: string; // e.g. "+1.2s"
  durationMs?: number;
}

type TraceListener = (entry: TraceEntry) => void;
const _traceListeners = new Set<TraceListener>();
const _traces: TraceEntry[] = [];
const MAX_TRACES = 20;

export function subscribeToTraces(fn: TraceListener) {
  _traceListeners.add(fn);
  return () => {
    _traceListeners.delete(fn);
  };
}

export function emitTrace(entry: TraceEntry) {
  _traces.unshift(entry);
  if (_traces.length > MAX_TRACES) _traces.length = MAX_TRACES;
  _traceListeners.forEach((fn) => fn(entry));
}

export function getRecentTraces() {
  return [..._traces];
}
