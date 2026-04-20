import React, { useReducer, useCallback, useMemo } from 'react';
import { type LogLevel, type LogEntry } from '../types/logs';
import { LogContext, type LogContextValue } from './LogContextInternal';

interface LogState {
  entries: LogEntry[];
}

type LogAction =
  | { type: 'ADD'; entry: LogEntry }
  | { type: 'CLEAR' };

const MAX_ENTRIES = 100;

function logReducer(state: LogState, action: LogAction): LogState {
  switch (action.type) {
    case 'ADD': {
      const next = [...state.entries, action.entry];
      if (next.length > MAX_ENTRIES) next.splice(0, next.length - MAX_ENTRIES);
      return { entries: next };
    }
    case 'CLEAR':
      return { entries: [] };
    default:
      return state;
  }
}

let _counter = 0;

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(logReducer, { entries: [] });

  const addEntry = useCallback((level: LogLevel, message: string, requestId?: string) => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${++_counter}`,
      timestamp: new Date(),
      level,
      message,
      requestId,
    };
    dispatch({ type: 'ADD', entry });
  }, []);

  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const value: LogContextValue = useMemo(() => ({ entries: state.entries, addEntry, clear }), [
    state.entries,
    addEntry,
    clear,
  ]);

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}
