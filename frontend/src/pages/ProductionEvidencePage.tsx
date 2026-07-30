import { lazy, Suspense } from 'react';
import { useLanguage } from '../context/LanguageContext';
import RoutePlaceholder from './RoutePlaceholder';

const LiveMetricsBento = lazy(() => import('../components/LiveMetricsBento'));
const ChaosPlayground = lazy(() => import('../components/ChaosPlayground'));
const TraceViewer = lazy(() => import('../components/TraceViewer'));
const LogStream = lazy(() => import('../components/LogStream'));
const FeaturedIncident = lazy(() => import('../components/FeaturedIncident'));

export default function ProductionEvidencePage() {
  const { t } = useLanguage();

  return (
    <>
      <RoutePlaceholder title={t('route.evidence.title')}><p>{t('route.evidence.description')}</p></RoutePlaceholder>
      <Suspense fallback={null}>
        <LiveMetricsBento />
        <ChaosPlayground />
        <TraceViewer />
        <LogStream />
        <FeaturedIncident />
      </Suspense>
    </>
  );
}
