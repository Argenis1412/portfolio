import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { type SystemStatus } from '../../hooks/useLiveMetrics';
import { type MetricSampleSource } from '../../types/metrics';

const BADGE_CONFIG: Record<
  SystemStatus,
  { dot: string; text: string; i18nKey: string }
> = {
  loading:     { dot: 'bg-app-muted animate-pulse',   text: 'text-app-muted',   i18nKey: 'metrics.status.loading' },
  operational: { dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-500', i18nKey: 'metrics.api_live' },
  warning:     { dot: 'bg-amber-400 animate-pulse',   text: 'text-amber-400',   i18nKey: 'metrics.status.warning' },
  degraded:    { dot: 'bg-red-400',                   text: 'text-red-400',     i18nKey: 'metrics.status.degraded' },
  down:        { dot: 'bg-red-600',                   text: 'text-red-600',     i18nKey: 'metrics.status.down' },
};

interface LiveStatusBadgeProps {
  status: SystemStatus;
  latencyMs?: number;
  source?: MetricSampleSource;
}

export const LiveStatusBadge = React.memo(({ status, latencyMs, source }: LiveStatusBadgeProps) => {
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
      {source && (
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${source === 'synthetic' ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
          {t(`metrics.origin.${source}`)}
        </span>
      )}
    </span>
  );
});

export default LiveStatusBadge;
