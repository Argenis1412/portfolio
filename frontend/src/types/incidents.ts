export interface Incident {
  id: string;
  type: string;
  labelKey: string;
  startedAt: number; // ms
  ttl: number;       // ms
}
