export interface Incident {
  id: string;
  type: string;
  labelKey: string;
  startedAt: number; // ms
  ttl: number;       // ms
  impactPct?: string;
  durationMs?: number;
  origin?: 'synthetic' | 'real';
}
