/**
 * LiveMetricsBento — 4-tile evidence dashboard connected to the live backend.
 *
 * Tile 1: P95 Latency  — SVG Sparkline (10-point rolling window)
 * Tile 2: Error Rate   — dynamic badge with named thresholds
 * Tile 3: Uptime       — backend-calculated string, refreshes on poll
 * Tile 4: System Status — derived from useLiveMetrics, pulse animation
 */
import React, { useState, useEffect } from 'react';
import { m, type Variants } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useLiveMetrics, type SystemStatus } from '../hooks/useLiveMetrics';

// ─── Sparkline ────────────────────────────────────────────────────────────────

const SPARKLINE_POINTS = 10;
const SPARKLINE_W = 80;
const SPARKLINE_H = 28;

function buildSparklinePath(points: number[]): string {
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1; // guard against flat line

  return points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * SPARKLINE_W;
      const y = SPARKLINE_H - ((v - min) / range) * SPARKLINE_H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

interface SparklineProps {
  points: number[];
  color: string;
}

function Sparkline({ points, color }: SparklineProps) {
  if (points.length < 2) return null;
  return (
    <svg
      width={SPARKLINE_W}
      height={SPARKLINE_H}
      viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`}
      className="opacity-70"
    >
      <path
        d={buildSparklinePath(points)}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SystemStatus,
  { i18nKey: string; dot: string; text: string }
> = {
  loading:     { i18nKey: 'metrics.status.loading', dot: 'bg-app-muted animate-pulse',        text: 'text-app-muted' },
  operational: { i18nKey: 'metrics.status.operational', dot: 'bg-emerald-500 animate-pulse',      text: 'text-emerald-500' },
  degraded:    { i18nKey: 'metrics.status.degraded', dot: 'bg-amber-400',                      text: 'text-amber-400' },
  down:        { i18nKey: 'metrics.status.down', dot: 'bg-red-500',                        text: 'text-red-500' },
};

// ─── Error Rate badge ─────────────────────────────────────────────────────────

function errorRateBadge(rate: number): { i18nKey: string; className: string } {
  if (rate < 0.01) return { i18nKey: 'metrics.health.stable',   className: 'bg-emerald-500/15 text-emerald-500' };
  if (rate < 0.05) return { i18nKey: 'metrics.health.warning',  className: 'bg-amber-400/15 text-amber-400' };
  return               { i18nKey: 'metrics.status.degraded', className: 'bg-red-500/15 text-red-500' };
}

// ─── Tile wrapper ─────────────────────────────────────────────────────────────

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TileSkeleton({ index }: { index: number }) {
  return (
    <Tile index={index} label="—">
      <div className="h-7 w-20 rounded bg-app-border animate-pulse" />
    </Tile>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveMetricsBento() {
  const { data, status, isLoading } = useLiveMetrics();
  const { t } = useLanguage();

  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rolling window of P95 samples for the sparkline.
  // Cold start: pre-fill all slots with the first value → no empty/jagged start.
  const [sparkPoints, setSparkPoints] = useState<number[]>([]);
  const [prevP95, setPrevP95] = useState<number | undefined>(data?.p95_ms);

  if (data?.p95_ms !== prevP95) {
    setPrevP95(data?.p95_ms);
    if (data?.p95_ms !== undefined) {
      const v = data.p95_ms;
      setSparkPoints(prev => {
        if (prev.length === 0) return Array(SPARKLINE_POINTS).fill(v);
        return [...prev.slice(-(SPARKLINE_POINTS - 1)), v];
      });
    }
  }

  const statusCfg = STATUS_CONFIG[status];
  const sparkColor =
    status === 'operational' ? '#10b981'
    : status === 'degraded'  ? '#f59e0b'
    : '#6b6055';

  if (isLoading) {
    return (
      <section className="px-4 max-w-6xl mx-auto py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <TileSkeleton key={i} index={i} />)}
        </div>
      </section>
    );
  }

  if (!data) return null;

  const errBadge = errorRateBadge(data.error_rate);

  return (
    <section
      aria-label="Live system metrics"
      className="px-4 max-w-6xl mx-auto py-6"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Tile 1 — Latency P95 */}
        <Tile index={0} label={t('metrics.latency')}>
          <div className="flex items-end justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-app-text">
              {data.p95_ms}
              <span className="text-sm font-normal text-app-muted ml-0.5">ms</span>
            </span>
            <Sparkline points={sparkPoints} color={sparkColor} />
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

        {/* Tile 2 — Error Rate */}
        <Tile index={1} label={t('metrics.error_rate')}>
          <span className="font-mono text-2xl font-bold text-app-text">
            {data.error_rate_pct}
          </span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full w-fit ${errBadge.className}`}>
            {t(errBadge.i18nKey)}
          </span>
        </Tile>

        {/* Tile 3 — Uptime */}
        <Tile index={2} label={t('metrics.uptime')}>
          <span className="font-mono text-2xl font-bold text-app-text">
            {data.uptime}
          </span>
          <span className="text-xs text-app-muted font-mono">{data.window}</span>
        </Tile>

        {/* Tile 4 — System Status */}
        <Tile index={3} label={t('metrics.system_status')}>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
            <span className={`font-mono text-lg font-bold ${statusCfg.text}`}>
              {t(statusCfg.i18nKey)}
            </span>
          </div>
          <span className="text-xs text-app-muted font-mono truncate" title={new Date(currentTime).toISOString()}>
            {new Date(currentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </Tile>

      </div>

      {/* Source link — one click verifies all tiles */}
      <div className="flex justify-end mt-2 pr-1">
        <a
          href="https://selected-fionna-argenis1412-58caae17.koyeb.app/api/v1/metrics/summary"
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
