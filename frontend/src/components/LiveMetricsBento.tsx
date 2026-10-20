import { useMetricsDisplay } from '../hooks/useMetricsDisplay';
import { Tile, TileSkeleton } from './ui/Tile';
import MetricsSparkline from './ui/MetricsSparkline';

export default function LiveMetricsBento() {
  const { metrics, t, data, isLoading } = useMetricsDisplay();
  const lastReceived = metrics.lastSuccessAt === null ? null : new Date(metrics.lastSuccessAt);
  const values = data ? [
    [t('metrics.latency'), data.p95_status === 'warming_up' ? t('metrics.confidence.warming_up') : `${data.p95_ms}ms`],
    [t('hero.kpi.error_rate'), data.error_rate_status === 'warming_up' ? t('metrics.confidence.warming_up') : data.error_rate_pct],
    [t('hero.kpi.requests'), data.requests_since_deploy.toLocaleString('en-US')],
    [t('hero.sidecar.uptime'), data.uptime],
  ] : [];
  return (
    <section id="metrics" aria-label="Live system metrics" className="px-4 max-w-6xl mx-auto py-12">
      <h2 className="text-xs font-mono uppercase tracking-widest text-app-primary">{t('metrics.system_status')}</h2>
      <p className="mt-2 text-sm text-app-muted">{t('metrics.section_subtitle')}</p>
      <p role="status" className="my-3 text-sm text-app-muted">
        {isLoading ? t('metrics.status.loading') : !data ? t('metrics.no_current_data') : metrics.isStale ? t('metrics.stale_notice') : t(`metrics.status.${metrics.status}`)}
      </p>
      <p className="mb-4 text-xs text-app-muted">
        {t('metrics.last_received')}: {lastReceived ? <time dateTime={lastReceived.toISOString()}>{lastReceived.toLocaleString()}</time> : t('metrics.no_reading')}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? [0, 1, 2, 3].map(i => <TileSkeleton key={i} index={i} />) : values.map(([label, value], i) => (
          <Tile key={label} index={i} label={label}><span className="text-xl font-mono">{value}</span></Tile>
        ))}
      </div>
      <div className="mt-6">
        <p className="text-xs text-app-muted">{t('metrics.history_label')}</p>
        <MetricsSparkline samples={metrics.sampleHistory} label={t('metrics.history_label')} emptyLabel={t('metrics.no_samples')} />
      </div>
    </section>
  );
}
