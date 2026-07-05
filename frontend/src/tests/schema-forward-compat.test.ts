import { describe, it, expect } from 'vitest';
import { MetricsSummarySchema } from '../api/schemas';

const BASE_PAYLOAD = {
  p95_ms: 42,
  p95_status: 'healthy',
  error_rate: 0.012,
  error_rate_pct: '1.20%',
  error_rate_status: 'stable',
  system_status: 'operational',
  uptime: '2h 14m',
  window: 'since_deploy',
  timestamp: '2026-07-04T00:00:00Z',
  retries_1h: 3,
  last_incident: 'none',
  last_incident_ago: 'none',
  worker_status: 'ok',
  queue_backlog: 0,
  cache_status: 'direct',
  cache_ttl_s: 0,
  active_path: 'sync',
  system_lifecycle: 'NORMAL',
};

describe('MetricsSummarySchema forward-compat', () => {
  it('parses known new enum value warming_up for p95_status', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      p95_status: 'warming_up',
      requests_24h: 100,
      total_incidents_24h: 0,
    });
    expect(result.p95_status).toBe('warming_up');
  });

  it('parses known new enum value warming_up for error_rate_status', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      error_rate_status: 'warming_up',
      requests_24h: 100,
      total_incidents_24h: 0,
    });
    expect(result.error_rate_status).toBe('warming_up');
  });

  it('parses known new enum value idle for worker_status', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      worker_status: 'idle',
      requests_24h: 100,
      total_incidents_24h: 0,
    });
    expect(result.worker_status).toBe('idle');
  });

  it('falls back to healthy on unknown p95_status', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      p95_status: 'martian',
      requests_24h: 100,
      total_incidents_24h: 0,
    });
    expect(result.p95_status).toBe('healthy');
  });

  it('falls back to stable on unknown error_rate_status', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      error_rate_status: 'alien',
      requests_24h: 100,
      total_incidents_24h: 0,
    });
    expect(result.error_rate_status).toBe('stable');
  });

  it('falls back to ok on unknown worker_status', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      worker_status: 'exploding',
      requests_24h: 100,
      total_incidents_24h: 0,
    });
    expect(result.worker_status).toBe('ok');
  });

  it('falls back to operational on unknown system_status', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      system_status: 'unknown_state',
      requests_24h: 100,
      total_incidents_24h: 0,
    });
    expect(result.system_status).toBe('operational');
  });

  it('parses payload with only legacy field names (requests_24h, total_incidents_24h)', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      requests_24h: 980,
      total_incidents_24h: 14,
    });
    expect(result.requests_24h).toBe(980);
    expect(result.total_incidents_24h).toBe(14);
    expect(result.requests_since_deploy).toBeUndefined();
    expect(result.total_chaos_events_since_deploy).toBeUndefined();
  });

  it('parses payload with only new field names (requests_since_deploy, total_chaos_events_since_deploy)', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      requests_since_deploy: 500,
      total_chaos_events_since_deploy: 3,
    });
    expect(result.requests_since_deploy).toBe(500);
    expect(result.total_chaos_events_since_deploy).toBe(3);
    expect(result.requests_24h).toBeUndefined();
    expect(result.total_incidents_24h).toBeUndefined();
  });

  it('parses payload with both legacy and new field names', () => {
    const result = MetricsSummarySchema.parse({
      ...BASE_PAYLOAD,
      requests_24h: 980,
      requests_since_deploy: 500,
      total_incidents_24h: 14,
      total_chaos_events_since_deploy: 3,
    });
    expect(result.requests_24h).toBe(980);
    expect(result.requests_since_deploy).toBe(500);
    expect(result.total_incidents_24h).toBe(14);
    expect(result.total_chaos_events_since_deploy).toBe(3);
  });
});
