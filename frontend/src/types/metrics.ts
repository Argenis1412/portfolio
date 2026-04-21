export type MetricSampleSource = 'real' | 'synthetic';

export interface MetricSample {
  value: number;
  timestamp: number;
  source: MetricSampleSource;
  confidence: number;
  traceId?: string;
}
