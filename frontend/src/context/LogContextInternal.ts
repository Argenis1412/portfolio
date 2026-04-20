import { createContext } from 'react';
import { type LogLevel, type LogEntry } from '../types/logs';

export interface LogContextValue {
  entries: LogEntry[];
  addEntry: (level: LogLevel, message: string, requestId?: string) => void;
  clear: () => void;
}

export const LogContext = createContext<LogContextValue | null>(null);
