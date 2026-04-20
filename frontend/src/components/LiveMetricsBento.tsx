import React, { useState, useEffect } from 'react';
import { m, AnimatePresence, type Variants } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useLiveMetrics, type SystemStatus } from '../hooks/useLiveMetrics';
import { useCurrentTime } from '../hooks/useCurrentTime';
import MetricsSparkline from './ui/MetricsSparkline';

const STATUS_CONFIG: Record<
  SystemStatus,
  { i18nKey: string; dot: string; text: string }
> = {
  loading: { i18nKey: 'metrics.status.loading', dot: 'bg-app-muted animate-pulse', text: 'text-app-muted' },
  operational: { i18nKey: 'metrics.status.operational', dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-500' },
  warning: { i18nKey: 'metrics.status.warning', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400' },
  degraded: { i18nKey: 'metrics.status.degraded', dot: 'bg-red-400', text: 'text-red-400' },
  down: { i18nKey: 'metrics.status.down', dot: 'bg-red-600', text: 'text-red-600' },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: 'easeOut' as const },
  }),
};

function Tile({ index, label, children }: { index: number; label: string; children: React.ReactNode }) {
  return (
    <m.div
      custom={index}
      variants={tileVariants}
      initial="hidden"
      animate="visible"
      className="glass min-h-[120px] rounded-2xl p-5 flex flex-col gap-3"
    >
      <span className="text-xs font-mono uppercase tracking-widest text-app-muted">{label}</span>
      {children}
    </m.div>
  );
}

function TileSkeleton({ index }: { index: number }) {
  return (
    <Tile index={index} label="—">
      <div className="h-7 w-20 rounded bg-app-border animate-pulse" />
    </Tile>
  );
}

const UpdatedAgo = React.memo(({ timestamp }: { timestamp: string }) => {
  const { t } = useLanguage();
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  useEffect(() => {
    const start = new Date(timestamp).getTime();
    const update = () => setSecondsAgo(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [timestamp]);

  return <span className="text-xs text-app-muted font-mono truncate">{t('metrics.updated_ago', { s: secondsAgo })}</span>;
});

export default function LiveMetricsBento() {
  const {
    data,
    status,
    isLoading,
    previous,
    sampleHistory,
    baselineP95,
    latestTrace,
    recentTraces,
    recoveryState,
    timeoutState,
  } = useLiveMetrics();
  const { t } = useLanguage();
  const currentTime = useCurrentTime(1000);

  if (isLoading) {
    return (
      <section id="metrics" className="px-4 max-w-6xl mx-auto py-12">
        <div className="mb-6">
          <div className="h-5 w-48 rounded bg-app-border animate-pulse mb-2" />
          <div className="h-4 w-72 rounded bg-app-border animate-pulse opacity-60" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <TileSkeleton key={i} index={i} />)}
        </div>
      </section>
    );
  }

  if (!data) return null;

  const statusCfg = STATUS_CONFIG[status];
  const errorIsElevated = data.error_rate_status !== 'stable' || data.error_rate > 0.045;
  const errorRateColor =
    (data.error_rate_status === 'investigating' || data.error_rate > 0.08)
      ? 'bg-red-500/15 text-red-500'
      : (data.error_rate_status === 'warning' || data.error_rate > 0.045)
        ? 'bg-red-500/15 text-red-400'
        : 'bg-emerald-500/15 text-emerald-500';
  const errorNumberColor = errorIsElevated ? 'text-red-400' : 'text-app-text';
  const hasIncident = data.last_incident !== 'none';
  const incidentDot = hasIncident ? 'bg-amber-400' : 'bg-emerald-500';
  const incidentText = hasIncident ? 'text-amber-400' : 'text-emerald-500';
  const latencyDelta = previous ? data.p95_ms - previous.p95_ms : null;
  const baselineDelta = baselineP95 === null ? null : data.p95_ms - baselineP95;
  const circuitColor = recoveryState === 'open'
    ? 'text-red-400 bg-red-500/10'
    : recoveryState === 'half_open'
      ? 'text-amber-400 bg-amber-500/10'
      : 'text-emerald-500 bg-emerald-500/10';
  const timeoutColor = timeoutState === 'visible'
    ? 'text-red-400 bg-red-500/10'
    : timeoutState === 'risk'
      ? 'text-amber-400 bg-amber-500/10'
      : 'text-emerald-500 bg-emerald-500/10';
   const latestEventLabel = latestTrace ? t(`metrics.incident.${latestTrace.type}`) : t('metrics.incident.none');
   const latestEventAgoSeconds = latestTrace ? Math.max(0, Math.floor((currentTime - latestTrace.timestamp.getTime()) / 1000)) : null;

  return (
    <section id="metrics" aria-label="Live system metrics" className="px-4 max-w-6xl mx-auto py-12">
      <div className="mb-6">
        <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-1">
          {t('metrics.system_status').toUpperCase()}
        </h2>
        <p className="text-xs font-mono text-app-muted max-w-lg">
          {t('metrics.section_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Tile index={0} label={t('metrics.system_status')}>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
            <span className={`font-mono text-lg font-bold ${statusCfg.text}`}>
              {t(statusCfg.i18nKey)}
            </span>
          </div>
          <UpdatedAgo timestamp={data.timestamp} />
        </Tile>

        <Tile index={1} label={t('metrics.latency')}>
          <div className="mt-1 flex flex-col gap-3">
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-end gap-1">
                <span className="font-mono text-2xl font-bold text-app-text">{data.p95_ms}</span>
                <span className="text-sm font-normal text-app-muted mb-1">ms</span>
              </div>
              {baselineP95 !== null && <span className="text-[10px] font-mono text-app-muted">baseline {baselineP95}ms</span>}
            </div>
            {sampleHistory.length >= 2 && (
              <div className="rounded-xl border border-app-border/40 bg-app-surface/30 px-2 py-2 overflow-hidden">
                <MetricsSparkline samples={sampleHistory} traces={recentTraces} width={248} height={72} compact />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {latencyDelta !== null && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${latencyDelta > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {t('metrics.delta.previous')} {latencyDelta > 0 ? '+' : ''}{latencyDelta}ms
                </span>
              )}
              {baselineDelta !== null && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${baselineDelta > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {t('metrics.delta.baseline')} {baselineDelta > 0 ? '+' : ''}{baselineDelta}ms
                </span>
              )}
            </div>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full w-fit ${data.p95_status === 'healthy' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-400/15 text-amber-400'}`}>
            {t(`metrics.health.${data.p95_status}`)}
          </span>
        </Tile>

        <Tile index={2} label={t('metrics.error_rate')}>
          <div className="flex items-center gap-2 mt-1">
            <AnimatePresence>
              {errorIsElevated && (
                <m.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-red-500 text-xl drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                >
                  ⚠
                </m.span>
              )}
            </AnimatePresence>
            <m.span 
              animate={errorIsElevated ? { color: '#f87171' } : { color: 'inherit' }}
              className={`font-mono text-2xl font-bold ${errorNumberColor}`}
            >
              {data.error_rate_pct}
            </m.span>
          </div>
          <m.div
            animate={errorIsElevated ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 2 } } : {}}
            className={`text-xs font-mono px-2 py-0.5 rounded-full w-fit ${errorRateColor}`}
          >
            {t(`metrics.health.${data.error_rate_status}`)}
          </m.div>
        </Tile>

        <Tile index={3} label={t('metrics.requests_24h')}>
          <span className="font-mono text-2xl font-bold text-app-text mt-1">{data.requests_24h.toLocaleString()}</span>
          <UpdatedAgo timestamp={data.timestamp} />
        </Tile>

        <Tile index={4} label={t('metrics.retries_1h')}>
          <div className="flex items-center gap-2 mt-1">
            {data.retries_1h > 5 && <span className="text-red-400 text-lg">⚠</span>}
            <span className={`font-mono text-2xl font-bold ${data.retries_1h > 10 ? 'text-red-400' : data.retries_1h > 0 ? 'text-amber-400' : 'text-app-text'}`}>
              {data.retries_1h}
            </span>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full w-fit ${data.retries_1h > 10 ? 'bg-red-500/15 text-red-400' : data.retries_1h > 0 ? 'bg-amber-400/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-500'}`}>
            {data.retries_1h > 10 ? t('metrics.health.investigating') : data.retries_1h > 0 ? t('metrics.health.warning') : t('metrics.health.stable')}
          </span>
        </Tile>

        <Tile index={5} label={t('metrics.last_incident')}>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${incidentDot}`} />
            <span className={`font-mono text-sm font-bold ${incidentText} truncate`}>
              {hasIncident ? t(`metrics.incident.${data.last_incident}`) : t('metrics.incident.none')}
            </span>
          </div>
          {hasIncident && <span className="text-xs text-app-muted font-mono">{data.last_incident_ago}</span>}
        </Tile>
      </div>

      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]"
      >
        <div className="glass rounded-2xl border border-app-border p-5 overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs font-mono uppercase tracking-widest text-app-muted">{t('metrics.telemetry.title')}</span>
            <span className="text-[10px] font-mono text-app-muted">p95 timeline</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <MetricsSparkline samples={sampleHistory} traces={recentTraces} width={560} height={120} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-mono text-app-muted">
            <span>{t('metrics.legend.healthy')}</span>
            <span>{t('metrics.legend.warning')}</span>
            <span>{t('metrics.legend.degraded')}</span>
          </div>
        </div>

        <div className="glass rounded-2xl border border-app-border p-5">
          <div className="mb-4 text-xs font-mono uppercase tracking-widest text-app-muted">{t('metrics.failure_model.title')}</div>
          <div className="grid gap-3">
            <div className="rounded-xl border border-app-border/50 bg-app-surface/30 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-app-muted">{t('metrics.failure_model.circuit')}</div>
              <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-mono ${circuitColor}`}>
                {t(`metrics.failure_model.circuit_state.${recoveryState}`)}
              </div>
            </div>
            <div className="rounded-xl border border-app-border/50 bg-app-surface/30 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-app-muted">{t('metrics.failure_model.timeout')}</div>
              <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-mono ${timeoutColor}`}>
                {t(`metrics.failure_model.timeout_state.${timeoutState}`)}
              </div>
            </div>
            <div className="rounded-xl border border-app-border/50 bg-app-surface/30 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-app-muted">{t('metrics.failure_model.latest_event')}</div>
              <div className="mt-2 text-sm font-mono text-app-text break-all">{latestEventLabel}</div>
              {latestTrace && (
                <div className="mt-2 text-[10px] font-mono text-app-muted space-y-1">
                  <div>request_id={latestTrace.requestId}</div>
                  <div>trace_id={latestTrace.traceId}</div>
                  {latestEventAgoSeconds !== null && <div>{t('metrics.updated_ago', { s: latestEventAgoSeconds })}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </m.div>

      <div className="flex justify-end mt-2 pr-1">
        <a
          href="https://api.argenisbackend.com/api/v1/metrics/summary"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono text-app-muted hover:text-app-primary transition-colors duration-200 flex items-center gap-1"
          title={t('metrics.source_tooltip')}
        >
          {t('metrics.view_raw')}
          <span className="opacity-60">↗</span>
        </a>
      </div>
    </section>
  );
}
