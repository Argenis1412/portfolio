/**
 * LogContext — Shared structured log store.
 *
 * All components that produce observable events (chaos actions, metric
 * polling errors, API failures) write here via `useLog().addEntry()`.
 *
 * LogStream.tsx reads from this context to render the terminal view.
 * No external dependencies — plain useReducer + Context.
 */
import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  requestId?: string;
}

interface LogState {
  entries: LogEntry[];
}

type LogAction =
  | { type: 'ADD'; entry: LogEntry }
  | { type: 'CLEAR' };

// ─── Reducer ─────────────────────────────────────────────────────────────────

const MAX_ENTRIES = 100;

function logReducer(state: LogState, action: LogAction): LogState {
  switch (action.type) {
    case 'ADD': {
      const next = [...state.entries, action.entry];
      // FIFO cap
      if (next.length > MAX_ENTRIES) next.splice(0, next.length - MAX_ENTRIES);
      return { entries: next };
    }
    case 'CLEAR':
      return { entries: [] };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface LogContextValue {
  entries: LogEntry[];
  addEntry: (level: LogLevel, message: string, requestId?: string) => void;
  clear: () => void;
}

const LogContext = createContext<LogContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

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

  const value = useMemo(() => ({ entries: state.entries, addEntry, clear }), [
    state.entries,
    addEntry,
    clear,
  ]);

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useLog(): LogContextValue {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error('useLog must be used within <LogProvider>');
  return ctx;
}
