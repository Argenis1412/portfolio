import { m, AnimatePresence, LayoutGroup, useReducedMotion } from 'framer-motion';
import { useMetricsDisplay } from '../hooks/useMetricsDisplay';
import { Tile, TileSkeleton } from './ui/Tile';
import MetricsSparkline from './ui/MetricsSparkline';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';



export default function LiveMetricsBento() {
  const displayContext = useMetricsDisplay();
  const { isLoading, t } = displayContext;
  const reducedMotion = useReducedMotion();

  // Hooks must be called unconditionally — before the early return guard.
  const animatedRetryBudget = useAnimatedNumber(displayContext.metrics?.strategyProfile?.retryBudget ?? 0);
  const animatedRequests24h = useAnimatedNumber(displayContext.data?.requests_since_deploy ?? displayContext.data?.requests_24h ?? 0);

  if (isLoading || !displayContext.data) {
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

  const {
    data,
    isError,
    hasIncident,
    incidentDot,
    incidentText,
    latestEventLabel,
    latestEventAgoSeconds,
    metrics: {
      status,
      sampleHistory,
      confidenceScore,
      latestTrace,
      recentTraces,
      displayLifecycle,
      strategyProfile,
    }
  } = displayContext;

  const activePath = strategyProfile.activePath;
  // Down/degraded already surface their own dedicated banners
  // (SystemStatusBanner, ServerWakeupNotice) — avoid stacking a second,
  // softer "reconnecting" message on top of those.
  const showStaleNotice = isError && status !== 'degraded' && status !== 'down';

  const lifecycleClass =
    displayLifecycle === 'DEGRADED'   ? 'bg-status-error-soft text-status-error' :
    displayLifecycle === 'RECOVERING' ? 'bg-status-warn-soft text-status-warn' :
    'bg-status-ok-soft text-status-ok';

  return (
    <section id="metrics" aria-label="Live system metrics" className="px-4 max-w-6xl mx-auto py-12">
      <div className="mb-6 text-center lg:text-left">
        <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-app-primary mb-1">
          {t('metrics.system_status').toUpperCase()}
        </h2>
        <p className="text-xs font-mono text-app-muted max-w-lg mx-auto lg:mx-0">
          {t('metrics.section_subtitle')}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[10px] font-mono">
          <span className="text-app-muted/80">
            Session includes ~{100 - confidenceScore}% synthetic data during active chaos events.
          </span>
        </div>
        <AnimatePresence>
          {showStaleNotice && (
            <m.div
              key="stale-notice"
              initial={reducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-2 flex justify-center lg:justify-start overflow-hidden"
            >
              <span
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border border-status-warn/30 bg-status-warn-soft text-status-warn"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-status-warn animate-pulse-soft flex-shrink-0" />
                {t('metrics.stale_notice')}
              </span>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Tile index={0} label={t('metrics.retries_1h')}>
          <div className="flex items-center gap-2 mt-1">
            {strategyProfile.retryBudget > 5 && <span className="text-status-error text-lg">⚠</span>}
            <span className={`font-mono text-2xl font-bold ${strategyProfile.retryBudget > 10 ? 'text-status-error' : strategyProfile.retryBudget > 0 ? 'text-status-warn' : 'text-app-text'}`}>
              {Math.round(animatedRetryBudget)}
            </span>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full w-fit ${strategyProfile.retryBudget > 10 ? 'bg-status-error-soft text-status-error' : strategyProfile.retryBudget > 0 ? 'bg-status-warn-soft text-status-warn' : 'bg-status-ok-soft text-status-ok'}`}>
            {strategyProfile.retryBudget > 10 ? t('metrics.health.investigating') : strategyProfile.retryBudget > 0 ? t('metrics.health.warning') : t('metrics.health.stable')}
          </span>
          <span className="text-[10px] font-mono text-app-muted">{t('metrics.strategy.retry')} {strategyProfile.source === 'synthetic' ? t('metrics.strategy.synthetic') : t('metrics.strategy.backend')}</span>
        </Tile>

        <Tile index={1} label={t('metrics.last_incident')} className="p-0">
          <button
            onClick={() => {
              const el = document.getElementById('observability');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full h-full text-left p-5 flex flex-col gap-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-app-primary hover:bg-app-surface-hover/30 transition-colors cursor-pointer"
            aria-label="View last incident logs"
          >
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 animate-pulse-soft ${incidentDot}`} />
              <span className={`font-mono text-sm font-bold ${incidentText} truncate`}>
                {hasIncident ? t(`metrics.incident.${data.last_incident}`) : t('metrics.incident.none')}
              </span>
            </div>
            {hasIncident && <span className="text-xs text-app-muted font-mono">{data.last_incident_ago}</span>}
          </button>
        </Tile>

        <Tile index={2} label={t('metrics.requests_24h')}>
          <span className="font-mono text-2xl font-bold text-app-text mt-1">{Math.round(animatedRequests24h).toLocaleString('en-US')}</span>
          <span className="text-xs text-app-muted font-mono truncate">{data.timestamp}</span>
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
            <span className="text-[10px] font-mono text-app-muted">{t('metrics.telemetry.p95_label')}</span>
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
            <span>{t('metrics.legend.real')}</span>
            <span>{t('metrics.legend.synthetic')}</span>
          </div>
        </div>

        <div className="glass rounded-2xl border border-app-border p-5">
          <div className="mb-4 text-xs font-mono uppercase tracking-widest text-app-muted">{t('metrics.system_model.title')}</div>
          <div className="grid gap-3">
            {/* Execution paths */}
            <LayoutGroup>
              <div className="rounded-xl border border-app-border/50 bg-app-surface/30 p-3 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-app-muted mb-1">{t('metrics.system_model.paths')}</div>
                {[
                  { pathKey: 'sync',     labelKey: 'metrics.system_model.sync',     color: 'text-status-ok',   dot: 'bg-status-ok' },
                  { pathKey: 'async',    labelKey: 'metrics.system_model.async',    color: 'text-status-warn', dot: 'bg-status-warn' },
                  { pathKey: 'fallback', labelKey: 'metrics.system_model.fallback', color: 'text-status-info', dot: 'bg-status-info' },
                ].map(({ pathKey, labelKey, color, dot }) => {
                  const active = activePath === pathKey;
                  return (
                    <m.div key={pathKey} layout className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {active && (
                          <m.span
                            layoutId="active-path-dot"
                            className={`w-1.5 h-1.5 rounded-full ${dot}`}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                          />
                        )}
                        <span className={`text-xs font-mono ${active ? color : 'text-app-muted/50'}`}>{t(labelKey)}</span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${active ? `${color} border-current/20 bg-current/5` : 'text-app-muted/30 border-app-border/20'}`}>
                        {active ? 'ACTIVE' : 'standby'}
                      </span>
                    </m.div>
                  );
                })}
              </div>
            </LayoutGroup>

            {/* Lifecycle state */}
            <div className="rounded-xl border border-app-border/50 bg-app-surface/30 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-app-muted">{t('metrics.system_model.lifecycle')}</div>
              <AnimatePresence mode="wait">
                <m.div
                  key={displayLifecycle}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-mono ${lifecycleClass}`}
                >
                  {displayLifecycle}
                </m.div>
              </AnimatePresence>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-app-muted">
                {strategyProfile.source === 'synthetic' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-status-synthetic)] animate-pulse-soft inline-block" />
                )}
                {t(`metrics.origin.${strategyProfile.source}`)}
              </div>
            </div>

            <div className="rounded-xl border border-app-border/50 bg-app-surface/30 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-app-muted">{t('metrics.strategy.title')}</div>
              <div className="mt-2 grid gap-2 text-xs font-mono text-app-text">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-app-muted">{t('metrics.strategy.retry')}</span>
                  <span>{strategyProfile.retryBudget}x</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-app-muted">{t('metrics.strategy.cache')}</span>
                  <span>TTL {strategyProfile.cacheTtlSeconds}s</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-app-muted">{t('metrics.strategy.source')}</span>
                  <span>{t(`metrics.origin.${strategyProfile.source}`)}</span>
                </div>
              </div>
            </div>

            {/* Latest event */}
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
