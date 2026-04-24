import { useLanguage } from '../context/LanguageContext';
import { useLiveMetrics, type SystemStatus } from './useLiveMetrics';
import { useCurrentTime } from './useCurrentTime';

const STATUS_CONFIG: Record<
  SystemStatus,
  { i18nKey: string; dot: string; text: string }
> = {
  loading: { i18nKey: 'metrics.status.loading', dot: 'bg-app-muted animate-pulse', text: 'text-app-muted' },
  operational: { i18nKey: 'metrics.status.operational', dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-500' },
  warning: { i18nKey: 'metrics.status.warning', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400' },
  degraded: { i18nKey: 'metrics.status.degraded', dot: 'bg-red-400 animate-pulse shadow-[0_0_12px_rgba(248,113,113,0.4)]', text: 'text-red-400 font-black' },
  down: { i18nKey: 'metrics.status.down', dot: 'bg-red-600 animate-ping', text: 'text-red-600 font-black' },
};

export function useMetricsDisplay() {
  const metrics = useLiveMetrics();
  const { t } = useLanguage();
  const currentTime = useCurrentTime(1000);

  const {
    data,
    status,
    isLoading,
    previous,
    effectiveP95,
    confidenceLabel,
    baselineP95,
    latestTrace,
  } = metrics;

  if (isLoading || !data) {
    return { metrics, t, currentTime, isLoading: true, data: null };
  }

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
  
  const latencyDelta = previous ? effectiveP95 - previous.p95_ms : null;
  const baselineDelta = baselineP95 === null ? null : effectiveP95 - baselineP95;
  
  const latestEventLabel = latestTrace ? t(`metrics.incident.${latestTrace.type}`) : t('metrics.incident.none');
  const latestEventAgoSeconds = latestTrace ? Math.max(0, Math.floor((currentTime - latestTrace.timestamp.getTime()) / 1000)) : null;
  
  const confidenceTone = confidenceLabel === 'estimated' 
    ? 'bg-[var(--color-status-synthetic-bg)] text-[var(--color-status-synthetic)] border-[var(--color-status-synthetic-border)]' 
    : 'bg-[var(--color-status-ok-bg)] text-[var(--color-status-ok-text)] border-[var(--color-status-ok-border)]';

  return {
    metrics,
    t,
    currentTime,
    isLoading: false,
    data,
    statusCfg,
    errorIsElevated,
    errorRateColor,
    errorNumberColor,
    hasIncident,
    incidentDot,
    incidentText,
    latencyDelta,
    baselineDelta,
    latestEventLabel,
    latestEventAgoSeconds,
    confidenceTone,
  };
}
