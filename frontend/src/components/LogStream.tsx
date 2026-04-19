/**
 * LogStream — Terminal-style system log viewer.
 *
 * Reads from shared LogContext (written to by ChaosPlayground,
 * useLiveMetrics errors, and any component that calls useLog()).
 * Auto-scrolls to latest. Filterable by level.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useLog, type LogLevel } from '../context/LogContext';

type FilterLevel = 'ALL' | LogLevel;

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO:  'text-emerald-400/70',
  WARN:  'text-amber-400',
  ERROR: 'text-red-400',
};

const FILTER_PILLS: { key: FilterLevel; labelKey: string }[] = [
  { key: 'ALL',   labelKey: 'logs.filter.all' },
  { key: 'INFO',  labelKey: 'logs.filter.info' },
  { key: 'WARN',  labelKey: 'logs.filter.warn' },
  { key: 'ERROR', labelKey: 'logs.filter.error' },
];

export default function LogStream() {
  const { t } = useLanguage();
  const { entries, clear } = useLog();
  const [filter, setFilter] = useState<FilterLevel>('ALL');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const filtered = filter === 'ALL'
    ? entries
    : entries.filter((e) => e.level === filter);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const handleFilter = useCallback((level: FilterLevel) => {
    setFilter(level);
  }, []);

  return (
    <section id="logs" aria-label="System Logs" className="px-4 max-w-6xl mx-auto py-12">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-1">
              {t('logs.title')}
            </h2>
            <p className="text-xs font-mono text-app-muted max-w-lg">
              {t('logs.subtitle')}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_PILLS.map(({ key, labelKey }) => (
              <button
                key={key}
                onClick={() => handleFilter(key)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border transition-all duration-150 ${
                  filter === key
                    ? 'bg-app-primary text-app-primary-text border-app-primary'
                    : 'border-app-border text-app-muted hover:border-app-primary/50'
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
            <button
              onClick={clear}
              className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-app-border text-app-muted hover:text-red-400 hover:border-red-500/40 transition-all duration-150"
            >
              {t('logs.clear')}
            </button>
          </div>
        </div>

        {/* Terminal */}
        <div className="rounded-xl bg-[#080808] border border-app-border overflow-hidden">
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-app-border bg-[#0f0f0f]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            <span className="text-[10px] font-mono text-app-muted/40 ml-2 uppercase tracking-widest">
              system-log
            </span>
            <span className="ml-auto text-[10px] font-mono text-app-muted/30">
              {filtered.length} entries
            </span>
          </div>

          {/* Log body */}
          <div className="p-4 font-mono text-xs h-[280px] overflow-y-auto space-y-1.5">
            {filtered.length === 0 ? (
              <p className="text-app-muted/30">{'>'} {t('logs.empty')}</p>
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                {[...filtered].reverse().map((entry) => (
                  <m.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex gap-2 min-w-0"
                  >
                    <span className="text-app-muted/40 flex-shrink-0">
                      [{entry.timestamp.toLocaleTimeString('en-GB', { hour12: false })}]
                    </span>
                    <span className={`flex-shrink-0 w-5 ${LEVEL_COLOR[entry.level]}`}>
                      {entry.level[0]}
                    </span>
                    <span className="text-app-text/70 break-all">
                      {entry.message}
                      {entry.requestId && (
                        <span className="text-app-muted/50 ml-1">
                          request_id={entry.requestId}
                        </span>
                      )}
                    </span>
                  </m.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </m.div>
    </section>
  );
}
