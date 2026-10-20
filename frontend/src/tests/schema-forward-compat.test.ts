import { describe, it, expect } from 'vitest';
import { MetricsSummarySchema } from '../api/schemas';
import current from './fixtures/metrics-d0d1cea.json';
import previous from './fixtures/metrics-9705b4a.json';

describe('metrics rolling deployment compatibility', () => {
  it.each([current, previous])('accepts the shared backend contract and strips retired fields', response => {
    expect(MetricsSummarySchema.parse(response)).toEqual(current);
  });
  it.each(Object.keys(current))('rejects missing shared field %s', key => {
    const response: Record<string, unknown> = { ...current };
    delete response[key];
    expect(MetricsSummarySchema.safeParse(response).success).toBe(false);
  });
  it.each(['p95_status', 'error_rate_status', 'system_status'])('rejects invalid %s instead of inventing health', key => {
    expect(MetricsSummarySchema.safeParse({ ...current, [key]: 'unknown' }).success).toBe(false);
  });
  it('retains the old investigating status', () => {
    expect(MetricsSummarySchema.parse({ ...previous, error_rate_status: 'investigating' }).error_rate_status).toBe('investigating');
  });
});
