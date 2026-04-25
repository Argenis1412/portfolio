/**
 * TraceViewer — Observability & Tracing section.
 *
 * Subscribes to trace events emitted by ChaosPlayground.
 * Renders a list of recent requests with expandable waterfall traces,
 * bottleneck detection, and type badges (CHAOS / NORMAL).
 */
import { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { subscribeToTraces, type TraceEntry } from '../services/TraceEmitter';

const TYPE_COLOR: Record<TraceEntry['type'], string> = {
  traffic_spike: 'text-status-warn border-status-warn/40 bg-status-warn-soft',
  forced_failure: 'text-status-error border-status-error/40 bg-status-error-soft',
  cache_stress: 'text-status-info border-status-info/40 bg-status-info-soft',
  queue_drain: 'text-status-ok border-status-ok/40 bg-status-ok-soft',
  manual_retry: 'text-status-info border-status-info/40 bg-status-info-soft',
  latency_injection: 'text-status-warn border-status-warn/40 bg-status-warn-soft'
};

const TYPE_LABEL: Record<TraceEntry['type'], string> = {
  traffic_spike: 'SPIKE',
  forced_failure: 'FAILURE',
  cache_stress: 'CACHE',
  queue_drain: 'DRAIN',
  manual_retry: 'RETRY',
  latency_injection: 'LATENCY',
};

// ─── Waterfall bar ───────────────────────────────────────────────────────────

function WaterfallRow({
  label,
  ms,
  total,
  isBottleneck,
  bottleneckLabel,
  color,
}: {
  label: string;
  ms: number;
  total: number;
  isBottleneck: boolean;
  bottleneckLabel: string;
  color: string;
}) {
  const pct = total > 0 ? Math.min(100, (ms / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-app-muted w-12 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-app-border rounded-full h-2 overflow-hidden">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className={`font-mono text-xs w-14 text-right flex-shrink-0 ${isBottleneck ? 'text-status-error font-bold' : 'text-app-muted'}`}>
        {ms}ms
        {isBottleneck && <span className="ml-1 text-[9px] text-status-error opacity-80">← {bottleneckLabel}</span>}
      </span>
    </div>
  );
}

// ─── Trace Row ────────────────────────────────────────────────────────────────

function TraceRow({ entry }: { entry: TraceEntry }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const typeColor = TYPE_COLOR[entry.type];
  const typeLabel = TYPE_LABEL[entry.type];

  const steps = [
    { label: 'API', ms: entry.apiMs, color: 'bg-app-primary' },
    { label: 'DB', ms: entry.dbMs, color: 'bg-status-warn' },
    { label: 'Cache', ms: entry.cacheMs, color: 'bg-status-info' },
  ];

  const maxMs = Math.max(entry.apiMs, entry.dbMs, entry.cacheMs);

  const statusColor = entry.status === 'ok' ? 'text-status-ok' : 'text-status-error';
  const statusLabel = entry.status === 'ok' ? '200 OK' : '503 ERR';

  return (
    <div className="border border-app-border rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-app-surface-hover/30 transition-colors text-left"
        aria-expanded={expanded}
      >
        {/* Badge */}
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${typeColor}`}>
          {typeLabel}
        </span>

        {/* Request ID */}
        <span className="font-mono text-xs text-app-muted flex-shrink-0">
          {entry.requestId}
        </span>

        {/* Endpoint */}
        <span className="font-mono text-xs text-app-text truncate flex-1">
          {entry.endpoint}
        </span>

        {/* Status */}
        <span className={`font-mono text-xs flex-shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>

        {/* Total latency */}
        <span className="font-mono text-xs text-app-muted flex-shrink-0 w-16 text-right">
          {entry.totalMs}ms
        </span>

        {/* Expand chevron */}
        <span className={`text-app-muted text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <m.div
            key="waterfall"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 bg-app-bg/40 border-t border-app-border space-y-3">
              {steps.map((step) => (
                <WaterfallRow
                  key={step.label}
                  label={step.label}
                  ms={step.ms}
                  total={entry.totalMs}
                  isBottleneck={step.ms === maxMs}
                  bottleneckLabel={t('observability.bottleneck')}
                  color={step.color}
                />
              ))}
              <p className="text-[10px] font-mono text-app-muted/50 pt-1">
                {entry.timestamp.toLocaleTimeString('en-GB', { hour12: false })}
                {' · '}request_id={entry.requestId}
                {' · '}trace_id={entry.traceId}
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TraceViewer() {
  const { t } = useLanguage();
  const [traces, setTraces] = useState<TraceEntry[]>([]);

  useEffect(() => {
    const unsub = subscribeToTraces((entry) => {
      setTraces((prev) => [entry, ...prev].slice(0, 10));
    });
    return () => { unsub(); };
  }, []);

  return (
    <section id="observability" aria-label="Observability & Tracing" className="px-4 max-w-6xl mx-auto py-12">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-1">
            {t('observability.title')}
          </h2>
          <p className="text-xs font-mono text-app-muted max-w-lg">
            {t('observability.subtitle')}
          </p>
        </div>

        {/* Column headers */}
        {traces.length > 0 && (
          <div className="hidden sm:grid grid-cols-[60px_80px_1fr_80px_70px_20px] gap-3 px-4 mb-2">
            {['TYPE', 'REQ ID', 'ENDPOINT', 'STATUS', 'LATENCY', ''].map((col) => (
              <span key={col} className="text-[10px] font-mono uppercase tracking-widest text-app-muted/60">{col}</span>
            ))}
          </div>
        )}

        {/* Trace rows */}
        {traces.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="font-mono text-sm text-app-muted/60">{t('observability.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {traces.map((entry) => (
                <m.div
                  key={entry.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <TraceRow entry={entry} />
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </m.div>
    </section>
  );
}
