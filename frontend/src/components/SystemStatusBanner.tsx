/**
 * SystemStatusBanner — Global system narrative strip.
 *
 * Appears below the Navbar only when system_status is not 'operational'.
 * Connects chaos actions → metrics → visible system state in one line.
 */
import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useLiveMetrics } from '../hooks/useLiveMetrics';

function causeKey(lastIncident: string): string {
  const map: Record<string, string> = {
    traffic_spike: 'banner.cause.traffic_spike',
    forced_failure: 'banner.cause.forced_failure',
    cache_stress: 'banner.cause.cache_stress',
    queue_drain: 'banner.cause.queue_drain',
    manual_retry: 'banner.cause.manual_retry',
    latency_injection: 'banner.cause.latency_injection',
  };
  return map[lastIncident] ?? 'banner.cause.backend';
}

const SystemStatusBanner = React.memo(() => {
  const { t } = useLanguage();
  const { data, status } = useLiveMetrics();

  const isVisible = status === 'degraded' || status === 'down';

  const colorClass =
    status === 'down'
      ? 'bg-red-900/80 border-red-700 text-red-200'
      : 'bg-amber-900/70 border-amber-700 text-amber-200';

  const label =
    status === 'down' ? t('banner.label.down') : t('banner.label.degraded');

  const cause = data?.last_incident && data.last_incident !== 'none'
    ? t(causeKey(data.last_incident))
    : t('banner.cause.backend');

  const impact = data
    ? `P95 ↑ ${data.p95_ms}ms | Error Rate ↑ ${data.error_rate_pct}`
    : '';

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          key="status-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full border-b ${colorClass} backdrop-blur-sm overflow-hidden`}
        >
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
            <span className="font-bold uppercase tracking-widest flex-shrink-0">{label}</span>
            <span className="text-current/70">
              <span className="text-current/50">{t('banner.cause')}: </span>
              {cause}
            </span>
            {impact && (
              <span className="text-current/70">
                <span className="text-current/50">{t('banner.impact')}: </span>
                {impact}
              </span>
            )}
            <span className="text-current/50 italic">{t('banner.recovery')}</span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
});

export default SystemStatusBanner;
