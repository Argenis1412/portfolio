export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DECISION';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  requestId?: string;
}
