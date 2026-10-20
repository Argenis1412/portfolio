import { useMetricsDisplay } from '../hooks/useMetricsDisplay';

export default function SystemStatusBanner() {
  const { metrics, t, data } = useMetricsDisplay();
  if (!data || metrics.isStale || !['degraded', 'down'].includes(metrics.status)) return null;
  return <div role="status" className="border-b border-status-warn/30 bg-status-warn-soft px-4 py-2 text-sm text-status-warn">{t(`metrics.status.${metrics.status}`)}</div>;
}
