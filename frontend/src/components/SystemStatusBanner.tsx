/**
 * SystemStatusBanner — Global system narrative strip.
 *
 * Epic 1: Multi-service status row (API / Worker / Cache).
 * Round-2: System lifecycle badge (DEGRADED → RECOVERING → STABLE).
 *
 * Appears below the Navbar only when system_status is not 'operational'.
 * Never shown when lifecycle === 'NORMAL'.
 */
import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useLiveMetrics } from '../hooks/useLiveMetrics';

const LIFECYCLE_CONFIG: Record<
  string,
  { label: string; dot: string; labelClass: string }
> = {
  DEGRADED:   { label: 'DEGRADED',   dot: 'bg-red-500 animate-pulse',    labelClass: 'text-[var(--color-status-degraded)]' },
  RECOVERING: { label: 'RECOVERING', dot: 'bg-amber-400 animate-pulse',  labelClass: 'text-[var(--color-status-recovering)]' },
  STABLE:     { label: 'STABLE',     dot: 'bg-emerald-400',              labelClass: 'text-[var(--color-status-stable)]' },
  NORMAL:     { label: 'NORMAL',     dot: 'bg-emerald-500',              labelClass: 'text-[var(--color-status-stable)]' },
};

function causeKey(lastIncident: string): string {
  const map: Record<string, string> = {
    traffic_spike:     'banner.cause.traffic_spike',
    forced_failure:    'banner.cause.forced_failure',
    cache_stress:      'banner.cause.cache_stress',
    queue_drain:       'banner.cause.queue_drain',
    manual_retry:      'banner.cause.manual_retry',
    latency_injection: 'banner.cause.latency_injection',
  };
  return map[lastIncident] ?? 'banner.cause.backend';
}

const SystemStatusBanner = React.memo(() => {
  const { t } = useLanguage();
  const { data, status, displayLifecycle, latestSample } = useLiveMetrics();

  const isVisible = status === 'degraded' || status === 'down';

  const outerColor =
    status === 'down'
      ? 'bg-[var(--color-status-degraded-bg)] border-[var(--color-status-degraded-border)] text-[var(--color-status-degraded-text)]'
      : 'bg-[var(--color-status-recovering-bg)] border-[var(--color-status-recovering-border)] text-[var(--color-status-recovering-text)]';

  const lifecycle     = displayLifecycle ?? data?.system_lifecycle ?? 'NORMAL';
  const lifecycleCfg  = LIFECYCLE_CONFIG[lifecycle] ?? LIFECYCLE_CONFIG['NORMAL'];
  const workerStatus  = data?.worker_status  ?? 'ok';
  const queueBacklog  = data?.queue_backlog  ?? 0;
  const cacheStatus   = data?.cache_status   ?? 'direct';
  const cacheTtl      = data?.cache_ttl_s    ?? 0;

  const cause = data?.last_incident && data.last_incident !== 'none'
    ? t(causeKey(data.last_incident))
    : t('banner.cause.backend');

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          key="status-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full border-b ${outerColor} backdrop-blur-sm overflow-hidden`}
        >
          <div className="max-w-6xl mx-auto px-4 py-2 font-mono text-xs space-y-1">
            {/* Row 1: lifecycle badge + cause */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`w-2 h-2 rounded-full ${lifecycleCfg.dot}`} />
                <span className={`font-bold uppercase tracking-widest ${lifecycleCfg.labelClass}`}>
                  {lifecycle}
                </span>
              </div>
              <span className="text-current/45">·</span>
              <span className="text-current/80">
                <span className="text-current/55">{t('banner.cause')}: </span>
                {cause}
              </span>
              {latestSample && (
                <span className={`px-2 py-0.5 rounded border text-[10px] ${latestSample.source === 'synthetic' ? 'border-[var(--color-status-synthetic-border)] bg-[var(--color-status-synthetic-bg)] text-[var(--color-status-synthetic)]' : 'border-[var(--color-status-ok-border)] bg-[var(--color-status-ok-bg)] text-[var(--color-status-ok-text)]'}`}>
                  {t(`metrics.origin.${latestSample.source}`)}
                </span>
              )}
              <span className="text-current/60 italic ml-auto">{t('banner.recovery')}</span>
            </div>

            {/* Row 2: sub-system status pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* API — always OK in this path (banner only shows when metrics respond) */}
              <span className="px-2 py-0.5 rounded border border-[var(--color-status-ok-border)] bg-[var(--color-status-ok-bg)] text-[var(--color-status-ok-text)]">
                {t('banner.subsystem.api.ok')}
              </span>

              {/* Worker */}
              {workerStatus === 'delayed' ? (
                <span className="px-2 py-0.5 rounded border border-[var(--color-status-recovering-border)] bg-[var(--color-status-recovering-bg)] text-[var(--color-status-recovering-text)]">
                  {t('banner.subsystem.worker.delayed', { n: queueBacklog })}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded border border-[var(--color-status-ok-border)] bg-[var(--color-status-ok-bg)] text-[var(--color-status-ok-text)]">
                  {t('banner.subsystem.worker.ok')}
                </span>
              )}

              {/* Cache */}
              {cacheStatus === 'serving' ? (
                <span className="px-2 py-0.5 rounded border border-[var(--color-status-info-border)] bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)]">
                  {t('banner.subsystem.cache.serving', { s: cacheTtl })}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded border border-[var(--color-status-ok-border)] bg-[var(--color-status-ok-bg)] text-[var(--color-status-ok-text)]">
                  {t('banner.subsystem.cache.direct')}
                </span>
              )}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

export default SystemStatusBanner;
