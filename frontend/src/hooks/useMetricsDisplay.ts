import { useLanguage } from '../context/LanguageContext';
import { useLiveMetrics } from './useLiveMetrics';

export function useMetricsDisplay() {
  const metrics = useLiveMetrics();
  const { t } = useLanguage();
  return { metrics, t, data: metrics.data, isLoading: metrics.isLoading, isError: metrics.isError };
}
