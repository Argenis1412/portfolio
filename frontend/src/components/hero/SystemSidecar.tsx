import React, { useState } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { type SystemStatus } from '../../hooks/useLiveMetrics';
import { type MetricsSummary } from '../../api/types';
import { type MetricSample } from '../../types/metrics';
import { type TraceEntry } from '../../services/TraceEmitter';
import MetricsSparkline from '../ui/MetricsSparkline';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import TypewriterText from '../ui/TypewriterText';
import ProgressRing from '../ui/ProgressRing';

const STATUS_COLORS: Record<SystemStatus, string> = {
  loading: 'text-app-muted',
  operational: 'text-status-ok',
  warning: 'text-status-warn',
  degraded: 'text-status-error',
  down: 'text-status-error',
};

interface SystemSidecarProps {
  status: SystemStatus;
  data: MetricsSummary | null | undefined;
  sampleHistory: MetricSample[];
  recentTraces: TraceEntry[];
  latestTrace: TraceEntry | null;
  latestSample: MetricSample | null;
  effectiveP95: number;
  confidenceScore: number;
  confidenceLabel: 'verified' | 'estimated' | 'warming_up';
  recoveryState: string;
}

export const SystemSidecar = React.memo(({
  status, data, sampleHistory, recentTraces, latestTrace, latestSample,
  effectiveP95, confidenceScore, confidenceLabel, recoveryState
}: SystemSidecarProps) => {
  const { t } = useLanguage();
  const [showRaw, setShowRaw] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const recoveryMs = latestTrace
    ? latestTrace.totalMs
    : data?.last_incident === 'none' ? 0 : effectiveP95;
  const animatedRecoveryMs = useAnimatedNumber(recoveryMs);

  const requestIdText = latestTrace
    ? latestTrace.requestId
    : (data?.last_incident === 'none' || !data) ? 'NONE' : data?.last_incident_ago || 'N/A';
  const traceIdText = latestTrace ? latestTrace.traceId : 'NONE';

  return (
    <div className="glass rounded-2xl p-6 border border-app-border/40 premium-shadow">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-app-muted">{t('hero.sidecar.title')}</span>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-status-ok">
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
            <span className={`rounded-full px-2 py-0.5 flex items-center gap-1.5 ${
              confidenceLabel === 'warming_up'
                ? 'bg-[var(--color-status-synthetic-bg)] text-[var(--color-status-synthetic)] animate-pulse-soft'
                : confidenceLabel === 'estimated'
                  ? 'bg-[var(--color-status-synthetic-bg)] text-[var(--color-status-synthetic)]'
                  : 'bg-[var(--color-status-ok-bg)] text-[var(--color-status-ok-text)]'
            }`}>
              {t(`metrics.confidence.${confidenceLabel}`)}
              <ProgressRing value={confidenceScore} size={28} strokeWidth={3} />
            </span>
            {latestSample && (
              <span className={`rounded-full border border-app-border/40 bg-app-surface/40 px-2 py-0.5 text-app-muted${latestSample.source === 'synthetic' ? ' animate-pulse-soft' : ''}`}>
                {t(`metrics.origin.${latestSample.source}`)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-mono text-app-muted mb-1">{t('hero.sidecar.last_request')}</div>
            <div className="text-sm font-mono text-app-text truncate">
              <TypewriterText text={requestIdText} />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-app-muted mb-1">{t('hero.sidecar.recovery_time')}</div>
            <div className="text-sm font-mono text-app-text">
              {Math.round(animatedRecoveryMs)}ms
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
            <AnimatePresence mode="wait">
              <m.div
                key={recoveryState}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`text-sm font-mono ${recoveryState === 'open' ? 'text-status-error' : recoveryState === 'half_open' ? 'text-status-warn' : 'text-status-ok'}`}
              >
                {recoveryState.toUpperCase()}
              </m.div>
            </AnimatePresence>
          </div>
          <div>
            <div className="text-[10px] font-mono text-app-muted mb-1">{t('hero.sidecar.latest_trace')}</div>
            <div className="text-sm font-mono text-app-text truncate">
              <TypewriterText text={traceIdText} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-app-border/20">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-mono text-app-muted/60 uppercase tracking-widest">
            {t('hero.sidecar.uptime')}: {data?.uptime ?? '...'}
          </div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`text-xs font-mono uppercase tracking-tight transition-all px-2 py-1 rounded border ${
              showRaw
                ? 'text-app-primary border-app-primary/30 bg-app-primary/5'
                : 'text-app-muted/80 border-app-border/20 hover:border-app-primary/40 hover:text-app-primary hover:bg-app-primary/5'
            } focus:outline-none focus:ring-1 focus:ring-app-primary/30`}
          >
            {showRaw ? '[HIDE_RAW]' : '[SHOW_RAW]'}
          </button>
        </div>

        <AnimatePresence>
          {showRaw && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <div className="text-[9px] font-mono text-app-muted/40">
                NODE_ID: PRODUCTION-01
              </div>
              <div className="text-[9px] font-mono text-app-muted/40">
                INFRA: KOYEB-EPHEMERAL-S1
              </div>
              <div className="text-[9px] font-mono text-app-muted/40">
                STATUS: {t('hero.sidecar.uptime_note')}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default SystemSidecar;
