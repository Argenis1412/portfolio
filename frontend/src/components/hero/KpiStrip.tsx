
import { useLanguage } from '../../context/LanguageContext';
import { type SystemStatus } from '../../hooks/useLiveMetrics';
import { type MetricsSummary } from '../../api/types';
import DeltaBadge from '../ui/DeltaBadge';

const STATUS_COLORS: Record<SystemStatus, string> = {
  loading: 'text-app-muted',
  operational: 'text-emerald-400',
  warning: 'text-amber-400',
  degraded: 'text-red-400',
  down: 'text-red-600',
};

interface KpiStripProps {
  data: MetricsSummary;
  previous: MetricsSummary | null;
  status: SystemStatus;
  effectiveP95: number;
  confidenceScore: number;
  confidenceLabel: string;
}

export function KpiStrip({ data, previous, status, effectiveP95, confidenceScore, confidenceLabel }: KpiStripProps) {
  const { t } = useLanguage();

  const items = [
    {
      label: t('hero.kpi.latency'),
      value: `${effectiveP95}ms`,
      delta: <DeltaBadge current={effectiveP95} previous={previous?.p95_ms ?? null} unit="ms" />,
    },
    {
      label: t('hero.kpi.error_rate'),
      value: data.error_rate_pct,
      className: data.error_rate > 0.045 ? 'text-red-400' : 'text-app-text',
      delta: <DeltaBadge current={data.error_rate * 100} previous={previous ? previous.error_rate * 100 : null} unit="%" decimals={2} />,
    },
    {
      label: t('hero.kpi.requests'),
      value: data.requests_24h.toLocaleString(),
      delta: null,
    },
    {
      label: t('hero.kpi.confidence'),
      value: `${confidenceScore}%`,
      className: confidenceLabel === 'estimated' ? 'text-[var(--color-status-synthetic)]' : 'text-[var(--color-status-ok-text)]',
      delta: null,
    },
    {
      label: t('hero.kpi.state'),
      value: t(`metrics.status.${status}`).toUpperCase(),
      className: STATUS_COLORS[status],
      delta: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-xl mx-auto md:mx-0">
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

export default KpiStrip;
