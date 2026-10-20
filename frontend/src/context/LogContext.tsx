import { useReducer, useCallback, useMemo, type ReactNode } from 'react';
import type { LogLevel, LogEntry } from '../types/logs';
import { LogContext } from './LogContextInternal';

type Action = { type: 'ADD'; entry: LogEntry } | { type: 'CLEAR' };
function reducer(entries: LogEntry[], action: Action): LogEntry[] {
  return action.type === 'CLEAR' ? [] : [...entries, action.entry].slice(-100);
}
let counter = 0;

export function LogProvider({ children }: { children: ReactNode }) {
  const [entries, dispatch] = useReducer(reducer, []);
  const addEntry = useCallback((level: LogLevel, message: string, requestId?: string) => {
    dispatch({ type: 'ADD', entry: {
      id: `browser-${Date.now()}-${++counter}`, timestamp: new Date(), level, message, requestId,
    } });
  }, []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const value = useMemo(() => ({ entries, addEntry, clear }), [entries, addEntry, clear]);
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}
