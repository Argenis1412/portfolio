import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { type SystemStatus } from '../../hooks/useLiveMetrics';
import { type MetricsSummary } from '../../api/types';
import MetricsSparkline from '../ui/MetricsSparkline';

const STATUS_COLORS: Record<SystemStatus, string> = {
  loading: 'text-app-muted',
  operational: 'text-emerald-400',
  warning: 'text-amber-400',
  degraded: 'text-red-400',
  down: 'text-red-600',
};

interface SystemSidecarProps {
  status: SystemStatus;
  data: MetricsSummary | null | undefined;
  sampleHistory: any[];
  recentTraces: any[];
  latestTrace: any | null;
  latestSample: any | null;
  effectiveP95: number;
  confidenceScore: number;
  confidenceLabel: string;
  recoveryState: string;
}

export const SystemSidecar = React.memo(({
  status, data, sampleHistory, recentTraces, latestTrace, latestSample,
  effectiveP95, confidenceScore, confidenceLabel, recoveryState
}: SystemSidecarProps) => {
  const { t } = useLanguage();

  return (
    <div className="glass rounded-2xl p-6 border border-app-border/40 premium-shadow">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-app-muted">{t('hero.sidecar.title')}</span>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          LIVE_FEED
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="text-[10px] font-mono text-app-muted mb-1">{t('hero.sidecar.global_status')}</div>
          <div className={`text-2xl font-mono font-black ${STATUS_COLORS[status]}`}>
            {status.toUpperCase()}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono">
            <span className={`rounded-full px-2 py-0.5 ${confidenceLabel === 'estimated' ? 'bg-[var(--color-status-synthetic-bg)] text-[var(--color-status-synthetic)]' : 'bg-[var(--color-status-ok-bg)] text-[var(--color-status-ok-text)]'}`}>
              {t(`metrics.confidence.${confidenceLabel}`)} {confidenceScore}%
            </span>
            {latestSample && (
              <span className="rounded-full border border-app-border/40 bg-app-surface/40 px-2 py-0.5 text-app-muted">
                {t(`metrics.origin.${latestSample.source}`)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-mono text-app-muted mb-1">{t('hero.sidecar.last_request')}</div>
            <div className="text-sm font-mono text-app-text">
              {latestTrace ? latestTrace.requestId : (data?.last_incident === 'none' || !data) ? 'NONE' : data?.last_incident_ago || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-app-muted mb-1">{t('hero.sidecar.recovery_time')}</div>
            <div className="text-sm font-mono text-app-text">
              {latestTrace ? `${latestTrace.totalMs}ms` : data?.last_incident === 'none' ? '0ms' : `${effectiveP95}ms`}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono text-app-muted mb-2">{t('hero.sidecar.history')}</div>
          <div className="w-full rounded-lg border border-app-border/20 bg-app-surface/30 px-2 py-2 overflow-hidden">
            {sampleHistory.length >= 2 ? (
              <MetricsSparkline samples={sampleHistory} traces={recentTraces} width={360} height={76} compact />
            ) : (
              <span className="text-[10px] font-mono text-app-muted/60 tracking-widest">warming-up...</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-mono text-app-muted mb-1">{t('hero.sidecar.circuit_breaker')}</div>
            <div className={`text-sm font-mono ${recoveryState === 'open' ? 'text-red-400' : recoveryState === 'half_open' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {recoveryState.toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-app-muted mb-1">{t('hero.sidecar.latest_trace')}</div>
            <div className="text-sm font-mono text-app-text truncate">
              {latestTrace ? latestTrace.traceId : 'NONE'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-app-border/20 flex items-center justify-between">
        <div className="text-[9px] font-mono text-app-muted/60">
          NODE_ID: PRODUCTION-01
        </div>
        <div className="text-[9px] font-mono text-app-muted/60">
          {t('hero.sidecar.uptime')}: 99.98%
        </div>
      </div>
    </div>
  );
});

export default SystemSidecar;
