import React, { useState, useEffect } from 'react';
import { m, type Variants } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useLiveMetrics, type SystemStatus } from '../hooks/useLiveMetrics';

const STATUS_CONFIG: Record<
  SystemStatus,
  { i18nKey: string; dot: string; text: string }
> = {
  loading:     { i18nKey: 'metrics.status.loading', dot: 'bg-app-muted animate-pulse',        text: 'text-app-muted' },
  operational: { i18nKey: 'metrics.status.operational', dot: 'bg-emerald-500 animate-pulse',      text: 'text-emerald-500' },
  degraded:    { i18nKey: 'metrics.status.degraded', dot: 'bg-amber-400',                      text: 'text-amber-400' },
  down:        { i18nKey: 'metrics.status.down', dot: 'bg-red-500',                        text: 'text-red-500' },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.08, ease: 'easeOut' as const },
  }),
};

function Tile({
  index,
  label,
  children,
}: {
  index: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <m.div
      custom={index}
      variants={tileVariants}
      initial="hidden"
      animate="visible"
      className="glass rounded-2xl p-5 flex flex-col gap-3 min-h-[120px]"
    >
      <span className="text-xs font-mono uppercase tracking-widest text-app-muted">
        {label}
      </span>
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

  return (
    <span className="text-xs text-app-muted font-mono truncate">
      {t('metrics.updated_ago', { s: secondsAgo })}
    </span>
  );
});

export default function LiveMetricsBento() {
  const { data, status, isLoading } = useLiveMetrics();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <section className="px-4 max-w-6xl mx-auto py-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <TileSkeleton key={i} index={i} />)}
        </div>
      </section>
    );
  }

  if (!data) return null;

  const statusCfg = STATUS_CONFIG[status];

  // Error rate color logic — dramatic red when elevated
  const errorIsElevated = data.error_rate_status !== 'stable';
  const errorRateColor =
    data.error_rate_status === 'investigating'
      ? 'bg-red-500/15 text-red-500'
      : data.error_rate_status === 'warning'
        ? 'bg-red-500/15 text-red-400'
        : 'bg-emerald-500/15 text-emerald-500';
  const errorNumberColor = errorIsElevated ? 'text-red-400' : 'text-app-text';

  // Last incident color
  const hasIncident = data.last_incident !== 'none';
  const incidentDot = hasIncident ? 'bg-amber-400' : 'bg-emerald-500';
  const incidentText = hasIncident ? 'text-amber-400' : 'text-emerald-500';

  return (
    <section
      aria-label="Live system metrics"
      className="px-4 max-w-6xl mx-auto py-6"
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">

        {/* Tile 1 — API Status */}
        <Tile index={0} label={t('metrics.system_status')}>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
            <span className={`font-mono text-lg font-bold ${statusCfg.text}`}>
              {t(statusCfg.i18nKey)}
            </span>
          </div>
          <UpdatedAgo timestamp={data.timestamp} />
        </Tile>

        {/* Tile 2 — P95 Latency */}
        <Tile index={1} label={t('metrics.latency')}>
          <div className="flex items-end gap-1 mt-1">
            <span className="font-mono text-2xl font-bold text-app-text">
              {data.p95_ms}
            </span>
            <span className="text-sm font-normal text-app-muted mb-1">ms</span>
          </div>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded-full w-fit ${
              data.p95_status === 'healthy'
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-amber-400/15 text-amber-400'
            }`}
          >
            {t(`metrics.health.${data.p95_status}`)}
          </span>
        </Tile>

        {/* Tile 3 — Error Rate (1h) — red when elevated */}
        <Tile index={2} label={t('metrics.error_rate')}>
          <div className="flex items-center gap-2 mt-1">
            {errorIsElevated && <span className="text-red-400 text-lg">⚠</span>}
            <span className={`font-mono text-2xl font-bold ${errorNumberColor}`}>
              {data.error_rate_pct}
            </span>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full w-fit ${errorRateColor}`}>
            {t(`metrics.health.${data.error_rate_status}`)}
          </span>
        </Tile>

        {/* Tile 4 — Requests (24h) */}
        <Tile index={3} label={t('metrics.requests_24h')}>
          <span className="font-mono text-2xl font-bold text-app-text mt-1">
            {data.requests_24h.toLocaleString()}
          </span>
          <UpdatedAgo timestamp={data.timestamp} />
        </Tile>

        {/* Tile 5 — Retries (1h) — red/amber when elevated */}
        <Tile index={4} label={t('metrics.retries_1h')}>
          <div className="flex items-center gap-2 mt-1">
            {data.retries_1h > 5 && <span className="text-red-400 text-lg">⚠</span>}
            <span className={`font-mono text-2xl font-bold ${
              data.retries_1h > 10 ? 'text-red-400' : data.retries_1h > 0 ? 'text-amber-400' : 'text-app-text'
            }`}>
              {data.retries_1h}
            </span>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full w-fit ${
            data.retries_1h > 10
              ? 'bg-red-500/15 text-red-400'
              : data.retries_1h > 0
                ? 'bg-amber-400/15 text-amber-400'
                : 'bg-emerald-500/15 text-emerald-500'
          }`}>
            {data.retries_1h > 10 ? t('metrics.health.investigating') : data.retries_1h > 0 ? t('metrics.health.warning') : t('metrics.health.stable')}
          </span>
        </Tile>

        {/* Tile 6 — Last Incident — red/green */}
        <Tile index={5} label={t('metrics.last_incident')}>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${incidentDot}`} />
            <span className={`font-mono text-sm font-bold ${incidentText} truncate`}>
              {hasIncident ? t(`metrics.incident.${data.last_incident}`) : t('metrics.incident.none')}
            </span>
          </div>
          {hasIncident && (
            <span className="text-xs text-app-muted font-mono">
              {data.last_incident_ago}
            </span>
          )}
        </Tile>

      </div>

      {/* Source link */}
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
