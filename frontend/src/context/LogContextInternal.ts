import { createContext } from 'react';
import { type LogLevel, type LogEntry } from '../types/logs';
import { type Incident } from '../types/incidents';

export interface LogContextValue {
  entries: LogEntry[];
  incidents: Incident[];
  addEntry: (level: LogLevel, message: string, requestId?: string) => void;
  addIncident: (type: string, labelKey: string, details?: Pick<Incident, 'impactPct' | 'durationMs' | 'origin'>) => void;
  clear: () => void;
}

export const LogContext = createContext<LogContextValue | null>(null);
