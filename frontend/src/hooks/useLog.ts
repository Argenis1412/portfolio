import { useContext } from 'react';
import { LogContext, type LogContextValue } from '../context/LogContextInternal';

export function useLog(): LogContextValue {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error('useLog must be used within <LogProvider>');
  return ctx;
}
