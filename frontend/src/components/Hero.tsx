import React from 'react';
import { m } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { scrollToSection } from '../utils/scrollToSection';
import { useLiveMetrics, type SystemStatus } from '../hooks/useLiveMetrics';
import type { MetricsSummary } from '../api';

// ─── LiveStatusBadge ─────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<
  SystemStatus,
  { dot: string; text: string; i18nKey: string }
> = {
  loading:     { dot: 'bg-app-muted animate-pulse',   text: 'text-app-muted',   i18nKey: 'metrics.status.loading' },
  operational: { dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-500', i18nKey: 'metrics.api_live' },
  degraded:    { dot: 'bg-amber-400',                 text: 'text-amber-400',   i18nKey: 'metrics.status.degraded' },
  down:        { dot: 'bg-red-500',                   text: 'text-red-500',     i18nKey: 'metrics.status.down' },
};

const LiveStatusBadge = React.memo(({ status, latencyMs }: { status: SystemStatus; latencyMs?: number }) => {
  const { t } = useLanguage();
  const cfg = BADGE_CONFIG[status];
  return (
    <span
      title={t('metrics.latency_tooltip')}
      className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border border-app-border bg-app-surface/60 backdrop-blur-sm select-none"
    >
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className={cfg.text}>
        {t(cfg.i18nKey)}
        {(status === 'operational' || status === 'degraded') && latencyMs !== undefined && (
          <span className="text-app-muted ml-1">· {latencyMs}ms</span>
        )}
      </span>
    </span>
  );
});

// ─── KPI Strip ───────────────────────────────────────────────────────────────

interface DeltaBadgeProps {
  current: number;
  previous: number | null;
  unit?: string;
  invertColor?: boolean; // true = higher is bad (latency, errors)
  decimals?: number;
}

function DeltaBadge({ current, previous, unit = '', invertColor = true, decimals = 0 }: DeltaBadgeProps) {
  if (previous === null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) return null;

  const isUp = diff > 0;
  const isBad = invertColor ? isUp : !isUp;
  const color = isBad ? 'text-red-400' : 'text-emerald-400';
  const sign = isUp ? '+' : '';
  const val = decimals > 0 ? Math.abs(diff).toFixed(decimals) : Math.abs(Math.round(diff)).toString();

  return (
    <span className={`text-[10px] font-mono ml-1 ${color}`}>
      ({sign}{isUp ? '' : '-'}{val}{unit})
    </span>
  );
}

interface KpiStripProps {
  data: MetricsSummary;
  previous: MetricsSummary | null;
  status: SystemStatus;
}

function KpiStrip({ data, previous, status }: KpiStripProps) {
  const statusColor: Record<SystemStatus, string> = {
    loading: 'text-app-muted',
    operational: 'text-emerald-400',
    degraded: 'text-amber-400',
    down: 'text-red-400',
  };

  const items = [
    {
      label: 'P95',
      value: `${data.p95_ms}ms`,
      delta: <DeltaBadge current={data.p95_ms} previous={previous?.p95_ms ?? null} unit="ms" />,
    },
    {
      label: 'Error Rate',
      value: data.error_rate_pct,
      delta: <DeltaBadge current={data.error_rate * 100} previous={previous ? previous.error_rate * 100 : null} unit="%" decimals={2} />,
    },
    {
      label: 'Requests',
      value: data.requests_24h.toLocaleString(),
      delta: null,
    },
    {
      label: 'Status',
      value: data.system_status.toUpperCase(),
      className: statusColor[status],
      delta: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-xl">
      {items.map((item) => (
        <div key={item.label} className="glass rounded-xl px-4 py-3 flex flex-col gap-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-app-muted">{item.label}</span>
          <div className="flex items-baseline flex-wrap">
            <span className={`font-mono text-lg font-bold ${item.className ?? 'text-app-text'}`}>
              {item.value}
            </span>
            {item.delta}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

const Hero = React.memo(() => {
  const { t } = useLanguage();
  const { status, data, previous } = useLiveMetrics();

  return (
    <section id="hero" className="pt-20 pb-12 md:pt-28 md:pb-20 px-4 max-w-6xl mx-auto relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background glow */}
      <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-app-primary/5 rounded-full blur-[120px] -z-10" />

      <m.div
        initial={window.innerWidth > 768 ? { y: 10, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl"
      >
        {/* Status badge */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-4"
        >
          <LiveStatusBadge status={status} latencyMs={data?.p95_ms} />
        </m.div>

        {/* H1 */}
        <m.h1
          initial={window.innerWidth > 768 ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-app-text"
        >
          {t('hero.title')}
        </m.h1>

        {/* Subtitle */}
        <m.p
          initial={window.innerWidth > 768 ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-app-muted max-w-2xl"
        >
          {t('hero.subtitle')}
        </m.p>

        {/* Differentiator line */}
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-3 text-sm font-mono italic text-app-primary/80 max-w-2xl"
        >
          {t('hero.differentiator')}
        </m.p>

        {/* KPI strip — shows immediately from useLiveMetrics */}
        {data && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <KpiStrip data={data} previous={previous} status={status} />
          </m.div>
        )}

        {/* CTAs */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-3 mt-8"
        >
          <button
            onClick={() => scrollToSection('metrics')}
            className="bg-app-primary hover:bg-app-primary-hover text-app-primary-text font-bold py-3 px-8 rounded-full transition-smooth premium-shadow font-mono text-sm"
          >
            → {t('hero.cta_metrics')}
          </button>
          <button
            onClick={() => scrollToSection('chaos')}
            className="bg-transparent hover:bg-app-surface-hover text-app-text font-semibold py-3 px-8 rounded-full transition-smooth border border-app-border font-mono text-sm"
          >
            → {t('hero.cta_chaos')}
          </button>
        </m.div>

        {/* Secondary links row */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex gap-4 mt-4"
        >
          <a
            href="https://github.com/Argenis1412/portfolio/blob/main/ARCHITECTURE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-app-muted hover:text-app-primary transition-colors"
          >
            {t('hero.cta_secondary')} ↗
          </a>
        </m.div>
      </m.div>
    </section>
  );
});

export default Hero;
